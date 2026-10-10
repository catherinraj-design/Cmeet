from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from tests.conftest import auth_headers_for


@pytest.mark.asyncio
async def test_create_and_get_meeting(client: AsyncClient, seed_data: dict):
    teacher = seed_data["teacher1"]
    academic_class = seed_data["academic_class1"]
    now = datetime.now(timezone.utc)
    starts_at = now + timedelta(hours=1)
    ends_at = starts_at + timedelta(hours=1)

    headers = auth_headers_for(teacher)
    payload = {
        "title": "Grade 10 Physics Live Lecture",
        "description": "Kinematics chapter walkthrough",
        "meeting_type": "CLASS",
        "academic_class_id": str(academic_class.id),
        "starts_at": starts_at.isoformat(),
        "ends_at": ends_at.isoformat(),
        "timezone": "UTC",
    }

    # 1. Create meeting
    response = await client.post("/api/v1/meetings", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["title"] == "Grade 10 Physics Live Lecture"
    assert data["status"] == "SCHEDULED"
    assert "cmeet-" in data["provider_room_name"]
    meeting_id = data["id"]

    # 2. Get meeting detail
    get_res = await client.get(f"/api/v1/meetings/{meeting_id}", headers=headers)
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["id"] == meeting_id
    # Enrolled student should be automatically in participants
    student_ids = [p["user_id"] for p in detail["participants"]]
    assert str(seed_data["student1"].id) in student_ids


@pytest.mark.asyncio
async def test_student_cannot_create_meeting(client: AsyncClient, seed_data: dict):
    student = seed_data["student1"]
    now = datetime.now(timezone.utc)
    headers = auth_headers_for(student)
    payload = {
        "title": "Student Study Group",
        "meeting_type": "CLASS",
        "starts_at": (now + timedelta(hours=1)).isoformat(),
        "ends_at": (now + timedelta(hours=2)).isoformat(),
    }
    response = await client.post("/api/v1/meetings", json=payload, headers=headers)
    assert response.status_code == 403
    assert "Only teachers and school administrators" in response.json()["detail"]


@pytest.mark.asyncio
async def test_invalid_time_range_rejected(client: AsyncClient, seed_data: dict):
    teacher = seed_data["teacher1"]
    now = datetime.now(timezone.utc)
    headers = auth_headers_for(teacher)
    payload = {
        "title": "Invalid Meeting",
        "meeting_type": "CLASS",
        "starts_at": (now + timedelta(hours=2)).isoformat(),
        "ends_at": (now + timedelta(hours=1)).isoformat(),  # ends_at < starts_at
    }
    response = await client.post("/api/v1/meetings", json=payload, headers=headers)
    assert response.status_code == 422  # Pydantic validation error


@pytest.mark.asyncio
async def test_meeting_lifecycle(client: AsyncClient, seed_data: dict):
    teacher = seed_data["teacher1"]
    now = datetime.now(timezone.utc)
    headers = auth_headers_for(teacher)

    # Create
    create_res = await client.post(
        "/api/v1/meetings",
        json={
            "title": "Parent Teacher Conference",
            "meeting_type": "MEETING",
            "starts_at": (now + timedelta(hours=1)).isoformat(),
            "ends_at": (now + timedelta(hours=2)).isoformat(),
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    meeting_id = create_res.json()["id"]

    # Start
    start_res = await client.post(f"/api/v1/meetings/{meeting_id}/start", headers=headers)
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "LIVE"

    # End
    end_res = await client.post(f"/api/v1/meetings/{meeting_id}/end", headers=headers)
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "ENDED"


@pytest.mark.asyncio
async def test_cancel_meeting(client: AsyncClient, seed_data: dict):
    teacher = seed_data["teacher1"]
    now = datetime.now(timezone.utc)
    headers = auth_headers_for(teacher)

    create_res = await client.post(
        "/api/v1/meetings",
        json={
            "title": "Cancelled Class",
            "meeting_type": "CLASS",
            "starts_at": (now + timedelta(hours=1)).isoformat(),
            "ends_at": (now + timedelta(hours=2)).isoformat(),
        },
        headers=headers,
    )
    meeting_id = create_res.json()["id"]

    cancel_res = await client.post(f"/api/v1/meetings/{meeting_id}/cancel", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

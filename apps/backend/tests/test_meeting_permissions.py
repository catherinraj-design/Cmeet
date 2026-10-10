import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from tests.conftest import auth_headers_for


@pytest.mark.asyncio
async def test_cross_school_isolation_blocked(client: AsyncClient, seed_data: dict):
    teacher1 = seed_data["teacher1"]
    teacher_sch2 = seed_data["teacher_sch2"]  # Belongs to School 2
    now = datetime.now(timezone.utc)

    # Teacher 1 creates meeting in School 1
    create_res = await client.post(
        "/api/v1/meetings",
        json={
            "title": "School 1 Private Meeting",
            "meeting_type": "MEETING",
            "starts_at": (now + timedelta(hours=1)).isoformat(),
            "ends_at": (now + timedelta(hours=2)).isoformat(),
        },
        headers=auth_headers_for(teacher1),
    )
    meeting_id = create_res.json()["id"]

    # Teacher from School 2 attempts to view meeting
    sch2_res = await client.get(
        f"/api/v1/meetings/{meeting_id}",
        headers=auth_headers_for(teacher_sch2),
    )
    assert sch2_res.status_code == 403
    assert "Cross-school access prohibited" in sch2_res.json()["detail"]

    # Teacher from School 2 attempts to join meeting
    join_res = await client.post(
        f"/api/v1/meetings/{meeting_id}/join",
        headers=auth_headers_for(teacher_sch2),
    )
    assert join_res.status_code == 403


@pytest.mark.asyncio
async def test_uninvited_student_cannot_join_private_meeting(client: AsyncClient, seed_data: dict):
    teacher1 = seed_data["teacher1"]
    student_uninvited = seed_data["student_uninvited"]
    now = datetime.now(timezone.utc)

    # Teacher creates a meeting with NO invited students (not linked to uninvited student's class)
    create_res = await client.post(
        "/api/v1/meetings",
        json={
            "title": "Faculty Only Meeting",
            "meeting_type": "MEETING",
            "starts_at": (now + timedelta(hours=1)).isoformat(),
            "ends_at": (now + timedelta(hours=2)).isoformat(),
        },
        headers=auth_headers_for(teacher1),
    )
    meeting_id = create_res.json()["id"]

    # Uninvited student attempts to view
    view_res = await client.get(
        f"/api/v1/meetings/{meeting_id}",
        headers=auth_headers_for(student_uninvited),
    )
    assert view_res.status_code == 403

    # Uninvited student attempts to join
    join_res = await client.post(
        f"/api/v1/meetings/{meeting_id}/join",
        headers=auth_headers_for(student_uninvited),
    )
    assert join_res.status_code == 403
    assert "not authorized" in join_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_enrolled_student_can_join_and_get_token(client: AsyncClient, seed_data: dict):
    teacher1 = seed_data["teacher1"]
    student1 = seed_data["student1"]
    academic_class = seed_data["academic_class1"]
    now = datetime.now(timezone.utc)

    # Teacher creates class session for Grade 10
    create_res = await client.post(
        "/api/v1/meetings",
        json={
            "title": "Grade 10 Mathematics",
            "meeting_type": "CLASS",
            "academic_class_id": str(academic_class.id),
            "starts_at": (now + timedelta(hours=1)).isoformat(),
            "ends_at": (now + timedelta(hours=2)).isoformat(),
        },
        headers=auth_headers_for(teacher1),
    )
    meeting_id = create_res.json()["id"]

    # Student 1 joins meeting and receives video credentials
    join_res = await client.post(
        f"/api/v1/meetings/{meeting_id}/join",
        headers=auth_headers_for(student1),
    )
    assert join_res.status_code == 200
    data = join_res.json()
    assert "token" in data
    assert len(data["token"]) > 20
    assert data["participant_identity"] == str(student1.id)
    assert data["participant_name"] == student1.full_name
    assert data["is_moderator"] is False
    assert data["server_url"] is not None


@pytest.mark.asyncio
async def test_host_teacher_receives_moderator_privileges(client: AsyncClient, seed_data: dict):
    teacher1 = seed_data["teacher1"]
    now = datetime.now(timezone.utc)

    create_res = await client.post(
        "/api/v1/meetings",
        json={
            "title": "Staff Briefing",
            "meeting_type": "MEETING",
            "starts_at": (now + timedelta(hours=1)).isoformat(),
            "ends_at": (now + timedelta(hours=2)).isoformat(),
        },
        headers=auth_headers_for(teacher1),
    )
    meeting_id = create_res.json()["id"]

    join_res = await client.post(
        f"/api/v1/meetings/{meeting_id}/join",
        headers=auth_headers_for(teacher1),
    )
    assert join_res.status_code == 200
    data = join_res.json()
    assert data["is_moderator"] is True

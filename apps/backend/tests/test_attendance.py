from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from tests.conftest import auth_headers_for


@pytest.mark.asyncio
async def test_attendance_recording_and_reports(client: AsyncClient, seed_data: dict):
    teacher = seed_data["teacher1"]
    student = seed_data["student1"]
    academic_class = seed_data["academic_class1"]
    now = datetime.now(timezone.utc)

    # 1. Create meeting
    create_res = await client.post(
        "/api/v1/meetings",
        json={
            "title": "History Seminar",
            "meeting_type": "CLASS",
            "academic_class_id": str(academic_class.id),
            "starts_at": (now + timedelta(hours=1)).isoformat(),
            "ends_at": (now + timedelta(hours=2)).isoformat(),
        },
        headers=auth_headers_for(teacher),
    )
    meeting_id = create_res.json()["id"]

    # 2. Teacher joins (starts session & records host attendance)
    t_join = await client.post(f"/api/v1/meetings/{meeting_id}/join", headers=auth_headers_for(teacher))
    assert t_join.status_code == 200

    # 3. Student joins
    s_join = await client.post(f"/api/v1/meetings/{meeting_id}/join", headers=auth_headers_for(student))
    assert s_join.status_code == 200

    # 4. Student leaves
    s_leave = await client.post(
        f"/api/v1/meetings/{meeting_id}/leave",
        json={"leave_reason": "CLASS_DISMISSED"},
        headers=auth_headers_for(student),
    )
    assert s_leave.status_code == 200

    # 5. Teacher checks attendance summary
    t_att = await client.get(f"/api/v1/meetings/{meeting_id}/attendance", headers=auth_headers_for(teacher))
    assert t_att.status_code == 200
    summary = t_att.json()
    assert summary["total_participants"] >= 2
    records = summary["records"]
    student_records = [r for r in records if r["user_id"] == str(student.id)]
    assert len(student_records) >= 1
    assert student_records[0]["leave_reason"] == "CLASS_DISMISSED"
    assert student_records[0]["left_at"] is not None

    # 6. Student checks attendance: only sees their own record
    s_att = await client.get(f"/api/v1/meetings/{meeting_id}/attendance", headers=auth_headers_for(student))
    assert s_att.status_code == 200
    s_summary = s_att.json()
    assert len(s_summary["records"]) == 1
    assert s_summary["records"][0]["user_id"] == str(student.id)

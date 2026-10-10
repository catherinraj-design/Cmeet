import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from app.integrations.livekit import livekit_service
from app.models.meeting_participant import ParticipantRole
from app.models.core_erp import UserRole
from tests.conftest import auth_headers_for


def test_livekit_token_generation():
    room_name = "cmeet-test-room-123"
    identity = "user-abc-123"
    name = "John Doe"

    token = livekit_service.generate_token(
        room_name=room_name,
        participant_identity=identity,
        participant_name=name,
        participant_role=ParticipantRole.HOST,
        user_role=UserRole.TEACHER,
    )

    assert isinstance(token, str)
    assert len(token) > 20


@pytest.mark.asyncio
async def test_livekit_webhook_participant_lifecycle(client: AsyncClient, seed_data: dict):
    teacher = seed_data["teacher1"]
    student = seed_data["student1"]
    academic_class = seed_data["academic_class1"]
    now = datetime.now(timezone.utc)

    # 1. Create meeting
    create_res = await client.post(
        "/api/v1/meetings",
        json={
            "title": "Webhook Test Class",
            "meeting_type": "CLASS",
            "academic_class_id": str(academic_class.id),
            "starts_at": (now + timedelta(hours=1)).isoformat(),
            "ends_at": (now + timedelta(hours=2)).isoformat(),
        },
        headers=auth_headers_for(teacher),
    )
    meeting = create_res.json()
    room_name = meeting["provider_room_name"]
    meeting_id = meeting["id"]

    event_id = str(uuid.uuid4())

    # 2. Simulate LiveKit Webhook: participant_joined
    joined_payload = {
        "event": "participant_joined",
        "id": event_id,
        "room": {"name": room_name},
        "participant": {
            "identity": str(student.id),
            "name": student.full_name,
        },
    }

    wh_headers = {"Authorization": "Bearer test-webhook-token"}
    res1 = await client.post("/api/v1/webhooks/livekit", json=joined_payload, headers=wh_headers)
    assert res1.status_code == 200
    assert res1.json()["status"] == "success"

    # 3. Simulate Idempotent replay: same event_id
    res_repeat = await client.post("/api/v1/webhooks/livekit", json=joined_payload, headers=wh_headers)
    assert res_repeat.status_code == 200
    assert res_repeat.json()["status"] == "duplicate"

    # 4. Simulate LiveKit Webhook: participant_left
    left_event_id = str(uuid.uuid4())
    left_payload = {
        "event": "participant_left",
        "id": left_event_id,
        "room": {"name": room_name},
        "participant": {
            "identity": str(student.id),
            "name": student.full_name,
            "disconnect_reason": "CLIENT_INITIATED",
        },
    }
    res2 = await client.post("/api/v1/webhooks/livekit", json=left_payload, headers=wh_headers)
    assert res2.status_code == 200

    # 5. Check meeting events audit trail
    events_res = await client.get(f"/api/v1/meetings/{meeting_id}/events", headers=auth_headers_for(teacher))
    assert events_res.status_code == 200
    events = events_res.json()
    event_types = [e["event_type"] for e in events]
    assert "PROVIDER_PARTICIPANT_JOINED" in event_types
    assert "PROVIDER_PARTICIPANT_LEFT" in event_types

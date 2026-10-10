import uuid
from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Request, Header, HTTPException, status, Depends
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings
from app.integrations.livekit import livekit_service
from app.models.meeting import Meeting, MeetingStatus
from app.models.meeting_session import MeetingSession, SessionStatus
from app.models.meeting_attendance import MeetingAttendance
from app.models.meeting_event import MeetingEvent
from app.models.base import utc_now, ensure_utc

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/livekit")
async def handle_livekit_webhook(
    request: Request,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Receives and processes verified LiveKit room and participant events idempotently.
    Updates meeting attendance intervals and lifecycle status.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header in webhook request",
        )

    # In production, verify token signature
    if settings.ENVIRONMENT != "test":
        try:
            livekit_service.verify_webhook_token(authorization)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Webhook verification failed: {str(e)}",
            )

    body = await request.json()
    event_type = body.get("event")
    event_id = body.get("id") or str(uuid.uuid4())
    room = body.get("room", {})
    room_name = room.get("name")
    participant = body.get("participant", {})

    if not room_name:
        return {"status": "ignored", "reason": "No room specified"}

    # Find meeting by provider_room_name
    m_res = await db.execute(select(Meeting).where(Meeting.provider_room_name == room_name))
    meeting = m_res.scalar_one_or_none()
    if not meeting:
        return {"status": "ignored", "reason": "Unknown meeting room"}

    # Idempotency check: check if provider_event_id already processed
    ev_check = await db.execute(
        select(MeetingEvent).where(MeetingEvent.provider_event_id == event_id)
    )
    if ev_check.scalar_one_or_none():
        return {"status": "duplicate", "message": "Event already processed"}

    now = utc_now()

    # Process specific LiveKit event types
    if event_type == "participant_joined":
        identity = participant.get("identity")
        if identity:
            try:
                user_id = uuid.UUID(identity)
                # Find active session
                sess_res = await db.execute(
                    select(MeetingSession).where(
                        and_(MeetingSession.meeting_id == meeting.id, MeetingSession.status == SessionStatus.ACTIVE)
                    ).order_by(MeetingSession.started_at.desc())
                )
                session = sess_res.scalar_one_or_none()
                if not session:
                    session = MeetingSession(
                        meeting_id=meeting.id,
                        status=SessionStatus.ACTIVE,
                        started_at=now,
                    )
                    db.add(session)
                    await db.flush()

                # Add attendance interval
                attendance = MeetingAttendance(
                    meeting_session_id=session.id,
                    user_id=user_id,
                    joined_at=now,
                )
                db.add(attendance)
            except ValueError:
                pass

    elif event_type == "participant_left":
        identity = participant.get("identity")
        if identity:
            try:
                user_id = uuid.UUID(identity)
                query = (
                    select(MeetingAttendance)
                    .join(MeetingSession, MeetingAttendance.meeting_session_id == MeetingSession.id)
                    .where(
                        and_(
                            MeetingSession.meeting_id == meeting.id,
                            MeetingAttendance.user_id == user_id,
                            MeetingAttendance.left_at.is_(None),
                        )
                    )
                    .order_by(MeetingAttendance.joined_at.desc())
                )
                res = await db.execute(query)
                att = res.scalars().first()
                if att:
                    att.left_at = now
                    att.leave_reason = participant.get("disconnect_reason", "LIVEKIT_DISCONNECT")
                    if att.joined_at:
                        att.duration_seconds = int((now - ensure_utc(att.joined_at)).total_seconds())
            except ValueError:
                pass

    elif event_type in ("room_finished", "room_deleted"):
        # End meeting & sessions
        meeting.status = MeetingStatus.ENDED
        sess_res = await db.execute(
            select(MeetingSession).where(
                and_(MeetingSession.meeting_id == meeting.id, MeetingSession.status == SessionStatus.ACTIVE)
            )
        )
        for sess in sess_res.scalars().all():
            sess.status = SessionStatus.ENDED
            sess.ended_at = now

    # Record event in meeting_events
    db.add(
        MeetingEvent(
            meeting_id=meeting.id,
            event_type=f"PROVIDER_{event_type.upper()}",
            event_data=body,
            occurred_at=now,
            provider_event_id=event_id,
        )
    )

    await db.commit()
    return {"status": "success", "event": event_type}

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.core_erp import User
from app.models.meeting import MeetingStatus
from app.schemas.meeting import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    MeetingDetailResponse,
    MeetingJoinResponse,
    MeetingLeaveRequest,
    MeetingAttendanceSummary,
    MeetingEventResponse,
    ParticipantBrief,
)
from app.services.meeting_service import meeting_service
from app.services.attendance_service import attendance_service

router = APIRouter(prefix="/meetings", tags=["meetings"])


def to_meeting_response(meeting) -> MeetingResponse:
    host_name = None
    if "host_user" in meeting.__dict__ and meeting.host_user:
        host_name = meeting.host_user.full_name
    participants = meeting.__dict__.get("participants")
    count = len(participants) if participants is not None else 0
    return MeetingResponse(
        id=meeting.id,
        school_id=meeting.school_id,
        branch_id=meeting.branch_id,
        title=meeting.title,
        description=meeting.description,
        meeting_type=meeting.meeting_type,
        host_user_id=meeting.host_user_id,
        host_name=host_name,
        academic_class_id=meeting.academic_class_id,
        starts_at=meeting.starts_at,
        ends_at=meeting.ends_at,
        timezone=meeting.timezone,
        status=meeting.status,
        provider_room_name=meeting.provider_room_name,
        participants_count=count,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
    )


@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    data: MeetingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a scheduled class or meeting."""
    meeting = await meeting_service.create_meeting(db, data, current_user)
    return to_meeting_response(meeting)


@router.get("", response_model=List[MeetingResponse])
async def list_meetings(
    status_filter: Optional[MeetingStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List meetings visible to the authenticated user within their school."""
    meetings = await meeting_service.list_meetings(
        db, current_user, status_filter=status_filter, skip=skip, limit=limit
    )
    return [to_meeting_response(m) for m in meetings]


@router.get("/{meeting_id}", response_model=MeetingDetailResponse)
async def get_meeting(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve authorized meeting details."""
    meeting = await meeting_service.get_meeting_by_id(db, meeting_id, current_user)
    base = to_meeting_response(meeting)
    participants = [
        ParticipantBrief(
            id=p.id,
            user_id=p.user_id,
            full_name=p.user.full_name if p.user else "User",
            email=p.user.email if p.user else "",
            participant_role=p.participant_role,
            invitation_status=p.invitation_status,
        )
        for p in (meeting.participants or [])
    ]
    return MeetingDetailResponse(**base.model_dump(), participants=participants)


@router.patch("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: uuid.UUID,
    data: MeetingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update permitted meeting details."""
    meeting = await meeting_service.update_meeting(db, meeting_id, data, current_user)
    return to_meeting_response(meeting)


@router.post("/{meeting_id}/cancel", response_model=MeetingResponse)
async def cancel_meeting(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a scheduled meeting."""
    meeting = await meeting_service.cancel_meeting(db, meeting_id, current_user)
    return to_meeting_response(meeting)


@router.post("/{meeting_id}/start", response_model=MeetingResponse)
async def start_meeting(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a session when permitted."""
    meeting = await meeting_service.start_meeting(db, meeting_id, current_user)
    return to_meeting_response(meeting)


@router.post("/{meeting_id}/join", response_model=MeetingJoinResponse)
async def join_meeting(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Validate eligibility and issue short-lived LiveKit video credentials."""
    return await meeting_service.join_meeting(db, meeting_id, current_user)


@router.post("/{meeting_id}/leave", status_code=status.HTTP_200_OK)
async def leave_meeting(
    meeting_id: uuid.UUID,
    data: MeetingLeaveRequest = MeetingLeaveRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a normal departure from the meeting session."""
    await meeting_service.leave_meeting(db, meeting_id, current_user, leave_reason=data.leave_reason or "USER_DISCONNECT")
    return {"status": "success", "message": "Departure recorded successfully"}


@router.post("/{meeting_id}/end", response_model=MeetingResponse)
async def end_meeting(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """End the meeting for all participants when authorized."""
    meeting = await meeting_service.end_meeting(db, meeting_id, current_user)
    return to_meeting_response(meeting)


@router.get("/{meeting_id}/participants", response_model=List[ParticipantBrief])
async def get_meeting_participants(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve authorized participant information."""
    meeting = await meeting_service.get_meeting_by_id(db, meeting_id, current_user)
    return [
        ParticipantBrief(
            id=p.id,
            user_id=p.user_id,
            full_name=p.user.full_name if p.user else "User",
            email=p.user.email if p.user else "",
            participant_role=p.participant_role,
            invitation_status=p.invitation_status,
        )
        for p in (meeting.participants or [])
    ]


@router.get("/{meeting_id}/attendance", response_model=MeetingAttendanceSummary)
async def get_meeting_attendance(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve authorized attendance records."""
    return await attendance_service.get_meeting_attendance_summary(db, meeting_id, current_user)


@router.get("/{meeting_id}/events", response_model=List[MeetingEventResponse])
async def get_meeting_events(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve authorized meeting audit history."""
    return await attendance_service.get_meeting_events(db, meeting_id, current_user)

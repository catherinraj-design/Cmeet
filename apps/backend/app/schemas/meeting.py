import uuid
from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, field_validator, model_validator
from app.models.meeting import MeetingType, MeetingStatus
from app.models.meeting_participant import ParticipantRole, InvitationStatus
from app.models.meeting_session import SessionStatus


class MeetingBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    meeting_type: MeetingType = MeetingType.CLASS
    academic_class_id: Optional[uuid.UUID] = None
    starts_at: datetime
    ends_at: datetime
    timezone: str = "UTC"

    @model_validator(mode="after")
    def validate_times(self):
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be strictly after starts_at")
        return self


class MeetingCreate(MeetingBase):
    branch_id: Optional[uuid.UUID] = None
    invited_user_ids: List[uuid.UUID] = []


class MeetingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    timezone: Optional[str] = None


class ParticipantBrief(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: str
    participant_role: ParticipantRole
    invitation_status: InvitationStatus

    class Config:
        from_attributes = True


class MeetingResponse(MeetingBase):
    id: uuid.UUID
    school_id: uuid.UUID
    branch_id: Optional[uuid.UUID] = None
    host_user_id: uuid.UUID
    host_name: Optional[str] = None
    status: MeetingStatus
    provider_room_name: str
    participants_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MeetingDetailResponse(MeetingResponse):
    participants: List[ParticipantBrief] = []


class MeetingJoinResponse(BaseModel):
    token: str
    server_url: str
    room_name: str
    participant_identity: str
    participant_name: str
    is_moderator: bool
    meeting_title: str
    meeting_status: MeetingStatus


class MeetingLeaveRequest(BaseModel):
    leave_reason: Optional[str] = "USER_DISCONNECT"


class AttendanceItem(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    user_email: str
    user_role: str
    joined_at: datetime
    left_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    leave_reason: Optional[str] = None

    class Config:
        from_attributes = True


class MeetingAttendanceSummary(BaseModel):
    meeting_id: uuid.UUID
    total_participants: int
    sessions_count: int
    records: List[AttendanceItem]


class MeetingEventResponse(BaseModel):
    id: uuid.UUID
    meeting_id: uuid.UUID
    actor_user_id: Optional[uuid.UUID] = None
    actor_name: Optional[str] = None
    event_type: str
    event_data: Dict[str, Any]
    occurred_at: datetime

    class Config:
        from_attributes = True

import uuid
import enum
from datetime import datetime
from sqlalchemy import ForeignKey, Enum as SQLEnum, DateTime, Uuid, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import utc_now


class ParticipantRole(str, enum.Enum):
    HOST = "HOST"
    CO_HOST = "CO_HOST"
    PARTICIPANT = "PARTICIPANT"
    VIEWER = "VIEWER"


class InvitationStatus(str, enum.Enum):
    INVITED = "INVITED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"


class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_role: Mapped[ParticipantRole] = mapped_column(SQLEnum(ParticipantRole), nullable=False, default=ParticipantRole.PARTICIPANT)
    invitation_status: Mapped[InvitationStatus] = mapped_column(SQLEnum(InvitationStatus), nullable=False, default=InvitationStatus.INVITED)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    meeting = relationship("Meeting", back_populates="participants")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("meeting_id", "user_id", name="uq_meeting_user"),
        Index("ix_meeting_participants_meeting_user", "meeting_id", "user_id"),
    )

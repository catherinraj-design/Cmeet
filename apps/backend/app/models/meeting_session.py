import uuid
import enum
from datetime import datetime
from sqlalchemy import String, ForeignKey, Enum as SQLEnum, DateTime, Uuid, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import utc_now


class SessionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ENDED = "ENDED"


class MeetingSession(Base):
    __tablename__ = "meeting_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_session_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(SQLEnum(SessionStatus), nullable=False, default=SessionStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    meeting = relationship("Meeting", back_populates="sessions")
    attendances = relationship("MeetingAttendance", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_meeting_sessions_meeting_status", "meeting_id", "status"),
    )

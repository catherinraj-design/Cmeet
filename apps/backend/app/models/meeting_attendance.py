import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, Uuid, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import utc_now


class MeetingAttendance(Base):
    __tablename__ = "meeting_attendance"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_session_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("meeting_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    leave_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    session = relationship("MeetingSession", back_populates="attendances")
    user = relationship("User")

    __table_args__ = (
        Index("ix_attendance_session_user", "meeting_session_id", "user_id"),
        Index("ix_attendance_user_joined", "user_id", "joined_at"),
    )

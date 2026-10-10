import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, DateTime, Uuid, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin, utc_now


class MeetingType(str, enum.Enum):
    CLASS = "CLASS"
    MEETING = "MEETING"


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    ENDED = "ENDED"
    CANCELLED = "CANCELLED"


class Meeting(Base, TimestampMixin):
    __tablename__ = "meetings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    meeting_type: Mapped[MeetingType] = mapped_column(SQLEnum(MeetingType), nullable=False, default=MeetingType.CLASS)
    host_user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    academic_class_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("academic_classes.id", ondelete="SET NULL"), nullable=True, index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    timezone: Mapped[str] = mapped_column(String(100), nullable=False, default="UTC")
    status: Mapped[MeetingStatus] = mapped_column(SQLEnum(MeetingStatus), nullable=False, default=MeetingStatus.SCHEDULED, index=True)
    provider_room_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)

    # Relationships
    school = relationship("School")
    branch = relationship("Branch")
    host_user = relationship("User", foreign_keys=[host_user_id])
    academic_class = relationship("AcademicClass")
    participants = relationship("MeetingParticipant", back_populates="meeting", cascade="all, delete-orphan")
    sessions = relationship("MeetingSession", back_populates="meeting", cascade="all, delete-orphan")
    events = relationship("MeetingEvent", back_populates="meeting", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_meetings_school_status_starts", "school_id", "status", "starts_at"),
        Index("ix_meetings_host_starts", "host_user_id", "starts_at"),
    )

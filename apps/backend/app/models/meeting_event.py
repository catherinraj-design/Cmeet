import uuid
from datetime import datetime
from typing import Any, Dict
from sqlalchemy import String, ForeignKey, DateTime, Uuid, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import utc_now


class MeetingEvent(Base):
    __tablename__ = "meeting_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    provider_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    meeting = relationship("Meeting", back_populates="events")
    actor_user = relationship("User")

    __table_args__ = (
        Index("ix_meeting_events_meeting_occurred", "meeting_id", "occurred_at"),
    )

import uuid
from typing import List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.core_erp import User, UserRole
from app.models.meeting import Meeting
from app.models.meeting_session import MeetingSession
from app.models.meeting_attendance import MeetingAttendance
from app.models.meeting_event import MeetingEvent
from app.schemas.meeting import MeetingAttendanceSummary, AttendanceItem, MeetingEventResponse
from app.services.meeting_service import meeting_service


class AttendanceService:
    async def get_meeting_attendance_summary(
        self,
        db: AsyncSession,
        meeting_id: uuid.UUID,
        current_user: User,
    ) -> MeetingAttendanceSummary:
        meeting = await meeting_service.get_meeting_by_id(db, meeting_id, current_user)

        # Authorization: Students and Parents can only see their own attendance; Teachers & Admins see all
        query = (
            select(MeetingAttendance)
            .join(MeetingSession, MeetingAttendance.meeting_session_id == MeetingSession.id)
            .options(selectinload(MeetingAttendance.user))
            .where(MeetingSession.meeting_id == meeting.id)
        )

        if current_user.role in (UserRole.STUDENT, UserRole.PARENT):
            query = query.where(MeetingAttendance.user_id == current_user.id)

        query = query.order_by(MeetingAttendance.joined_at.asc())
        result = await db.execute(query)
        attendances = result.scalars().all()

        records = [
            AttendanceItem(
                id=att.id,
                session_id=att.meeting_session_id,
                user_id=att.user_id,
                user_name=att.user.full_name if att.user else "Unknown",
                user_email=att.user.email if att.user else "",
                user_role=att.user.role.value if att.user else "",
                joined_at=att.joined_at,
                left_at=att.left_at,
                duration_seconds=att.duration_seconds,
                leave_reason=att.leave_reason,
            )
            for att in attendances
        ]

        sess_count_res = await db.execute(
            select(func.count(MeetingSession.id)).where(MeetingSession.meeting_id == meeting.id)
        )
        sessions_count = sess_count_res.scalar() or 0

        unique_users = len(set(r.user_id for r in records))

        return MeetingAttendanceSummary(
            meeting_id=meeting.id,
            total_participants=unique_users,
            sessions_count=sessions_count,
            records=records,
        )

    async def get_meeting_events(
        self,
        db: AsyncSession,
        meeting_id: uuid.UUID,
        current_user: User,
    ) -> List[MeetingEventResponse]:
        # Authorization check: only Host, School Admin or Super Admin can view audit events
        meeting = await meeting_service.get_meeting_by_id(db, meeting_id, current_user)
        if meeting.host_user_id != current_user.id and current_user.role not in (UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the meeting host and administrators can access the event audit trail.",
            )

        query = (
            select(MeetingEvent)
            .options(selectinload(MeetingEvent.actor_user))
            .where(MeetingEvent.meeting_id == meeting.id)
            .order_by(MeetingEvent.occurred_at.asc())
        )
        res = await db.execute(query)
        events = res.scalars().all()

        return [
            MeetingEventResponse(
                id=ev.id,
                meeting_id=ev.meeting_id,
                actor_user_id=ev.actor_user_id,
                actor_name=ev.actor_user.full_name if ev.actor_user else None,
                event_type=ev.event_type,
                event_data=ev.event_data,
                occurred_at=ev.occurred_at,
            )
            for ev in events
        ]


attendance_service = AttendanceService()

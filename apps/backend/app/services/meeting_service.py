import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.core_erp import User, UserRole, School, AcademicClass, ClassEnrollment
from app.models.meeting import Meeting, MeetingType, MeetingStatus
from app.models.meeting_participant import MeetingParticipant, ParticipantRole, InvitationStatus
from app.models.meeting_session import MeetingSession, SessionStatus
from app.models.meeting_attendance import MeetingAttendance
from app.models.meeting_event import MeetingEvent
from app.schemas.meeting import MeetingCreate, MeetingUpdate, MeetingJoinResponse
from app.integrations.livekit import livekit_service
from app.models.base import utc_now, ensure_utc


class MeetingService:
    async def create_meeting(
        self,
        db: AsyncSession,
        data: MeetingCreate,
        current_user: User,
    ) -> Meeting:
        # Authorization check: Only teachers, school admins, and super admins can create meetings
        if current_user.role not in (UserRole.TEACHER, UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only teachers and school administrators can schedule meetings or classes.",
            )

        if not current_user.school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be assigned to a school to create meetings.",
            )

        # Verify academic class if provided
        if data.academic_class_id:
            class_res = await db.execute(
                select(AcademicClass).where(
                    and_(
                        AcademicClass.id == data.academic_class_id,
                        AcademicClass.school_id == current_user.school_id,
                    )
                )
            )
            academic_class = class_res.scalar_one_or_none()
            if not academic_class:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Academic class not found or belongs to a different school.",
                )

        # Unique provider room name
        room_name = f"cmeet-{current_user.school_id.hex[:8]}-{uuid.uuid4().hex[:8]}"

        meeting = Meeting(
            school_id=current_user.school_id,
            branch_id=data.branch_id or current_user.branch_id,
            title=data.title,
            description=data.description,
            meeting_type=data.meeting_type,
            host_user_id=current_user.id,
            academic_class_id=data.academic_class_id,
            starts_at=data.starts_at,
            ends_at=data.ends_at,
            timezone=data.timezone,
            status=MeetingStatus.SCHEDULED,
            provider_room_name=room_name,
        )
        db.add(meeting)
        await db.flush()

        # Add Host as participant
        host_participant = MeetingParticipant(
            meeting_id=meeting.id,
            user_id=current_user.id,
            participant_role=ParticipantRole.HOST,
            invitation_status=InvitationStatus.ACCEPTED,
        )
        db.add(host_participant)

        # If academic class is specified, automatically enroll all students of that class
        if data.academic_class_id:
            enrollments_res = await db.execute(
                select(ClassEnrollment.user_id).where(
                    ClassEnrollment.academic_class_id == data.academic_class_id
                )
            )
            enrolled_student_ids = enrollments_res.scalars().all()
            for student_id in enrolled_student_ids:
                if student_id != current_user.id:
                    student_part = MeetingParticipant(
                        meeting_id=meeting.id,
                        user_id=student_id,
                        participant_role=ParticipantRole.PARTICIPANT,
                        invitation_status=InvitationStatus.INVITED,
                    )
                    db.add(student_part)

        # Add explicitly invited users (verifying school isolation)
        if data.invited_user_ids:
            users_res = await db.execute(
                select(User).where(
                    and_(
                        User.id.in_(data.invited_user_ids),
                        User.school_id == current_user.school_id,
                    )
                )
            )
            invited_users = users_res.scalars().all()
            existing_user_ids = {current_user.id}
            if data.academic_class_id:
                existing_user_ids.update(enrolled_student_ids)

            for u in invited_users:
                if u.id not in existing_user_ids:
                    part_role = ParticipantRole.CO_HOST if u.role in (UserRole.TEACHER, UserRole.SCHOOL_ADMIN) else ParticipantRole.PARTICIPANT
                    db.add(
                        MeetingParticipant(
                            meeting_id=meeting.id,
                            user_id=u.id,
                            participant_role=part_role,
                            invitation_status=InvitationStatus.INVITED,
                        )
                    )

        # Audit Event
        db.add(
            MeetingEvent(
                meeting_id=meeting.id,
                actor_user_id=current_user.id,
                event_type="MEETING_CREATED",
                event_data={
                    "title": meeting.title,
                    "starts_at": meeting.starts_at.isoformat(),
                    "ends_at": meeting.ends_at.isoformat(),
                    "meeting_type": meeting.meeting_type.value,
                },
            )
        )

        await db.commit()
        return await self.get_meeting_by_id(db, meeting.id, current_user)

    async def list_meetings(
        self,
        db: AsyncSession,
        current_user: User,
        status_filter: Optional[MeetingStatus] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Meeting]:
        query = select(Meeting).options(
            selectinload(Meeting.host_user),
            selectinload(Meeting.participants),
        )

        # School isolation
        if current_user.role != UserRole.SUPER_ADMIN:
            query = query.where(Meeting.school_id == current_user.school_id)

        # Role-based visibility
        if current_user.role in (UserRole.STUDENT, UserRole.PARENT):
            # Must be in participants list
            query = query.join(MeetingParticipant, Meeting.id == MeetingParticipant.meeting_id).where(
                MeetingParticipant.user_id == current_user.id
            )
        elif current_user.role == UserRole.TEACHER:
            # Teacher sees meetings hosted by them or where they are participant
            query = query.outerjoin(MeetingParticipant, Meeting.id == MeetingParticipant.meeting_id).where(
                or_(
                    Meeting.host_user_id == current_user.id,
                    MeetingParticipant.user_id == current_user.id,
                )
            )

        if status_filter:
            query = query.where(Meeting.status == status_filter)

        query = query.order_by(Meeting.starts_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().unique().all()

    async def get_meeting_by_id(
        self,
        db: AsyncSession,
        meeting_id: uuid.UUID,
        current_user: User,
    ) -> Meeting:
        query = select(Meeting).where(Meeting.id == meeting_id).options(
            selectinload(Meeting.host_user),
            selectinload(Meeting.participants).selectinload(MeetingParticipant.user),
        )
        res = await db.execute(query)
        meeting = res.scalar_one_or_none()
        if not meeting:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

        # School isolation check
        if current_user.role != UserRole.SUPER_ADMIN and meeting.school_id != current_user.school_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Cross-school access prohibited.")

        # Participant eligibility check for students and parents
        if current_user.role in (UserRole.STUDENT, UserRole.PARENT):
            is_participant = any(p.user_id == current_user.id for p in meeting.participants)
            if not is_participant:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized for this meeting.")

        return meeting

    async def update_meeting(
        self,
        db: AsyncSession,
        meeting_id: uuid.UUID,
        data: MeetingUpdate,
        current_user: User,
    ) -> Meeting:
        meeting = await self.get_meeting_by_id(db, meeting_id, current_user)

        # Only host or admin can update
        if meeting.host_user_id != current_user.id and current_user.role not in (UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only host or school admin can modify this meeting.")

        if meeting.status in (MeetingStatus.ENDED, MeetingStatus.CANCELLED):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot edit a {meeting.status.value.lower()} meeting.")

        if data.title is not None:
            meeting.title = data.title
        if data.description is not None:
            meeting.description = data.description
        if data.starts_at is not None:
            meeting.starts_at = data.starts_at
        if data.ends_at is not None:
            meeting.ends_at = data.ends_at
        if data.timezone is not None:
            meeting.timezone = data.timezone

        db.add(
            MeetingEvent(
                meeting_id=meeting.id,
                actor_user_id=current_user.id,
                event_type="MEETING_UPDATED",
                event_data={"updated_fields": data.model_dump(exclude_unset=True)},
            )
        )
        await db.commit()
        return await self.get_meeting_by_id(db, meeting.id, current_user)

    async def cancel_meeting(
        self,
        db: AsyncSession,
        meeting_id: uuid.UUID,
        current_user: User,
    ) -> Meeting:
        meeting = await self.get_meeting_by_id(db, meeting_id, current_user)
        if meeting.host_user_id != current_user.id and current_user.role not in (UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only host or admin can cancel this meeting.")

        meeting.status = MeetingStatus.CANCELLED
        db.add(
            MeetingEvent(
                meeting_id=meeting.id,
                actor_user_id=current_user.id,
                event_type="MEETING_CANCELLED",
                event_data={"cancelled_at": utc_now().isoformat()},
            )
        )
        await db.commit()
        return await self.get_meeting_by_id(db, meeting.id, current_user)

    async def start_meeting(
        self,
        db: AsyncSession,
        meeting_id: uuid.UUID,
        current_user: User,
    ) -> Meeting:
        meeting = await self.get_meeting_by_id(db, meeting_id, current_user)
        if meeting.host_user_id != current_user.id and current_user.role not in (UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only host or admin can start this session.")

        if meeting.status == MeetingStatus.CANCELLED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot start a cancelled meeting.")

        meeting.status = MeetingStatus.LIVE

        # Check for active session or create new
        active_sess_res = await db.execute(
            select(MeetingSession).where(
                and_(MeetingSession.meeting_id == meeting.id, MeetingSession.status == SessionStatus.ACTIVE)
            )
        )
        active_sess = active_sess_res.scalar_one_or_none()
        if not active_sess:
            new_session = MeetingSession(
                meeting_id=meeting.id,
                status=SessionStatus.ACTIVE,
                started_at=utc_now(),
            )
            db.add(new_session)

        db.add(
            MeetingEvent(
                meeting_id=meeting.id,
                actor_user_id=current_user.id,
                event_type="MEETING_STARTED",
                event_data={"started_at": utc_now().isoformat()},
            )
        )
        await db.commit()
        return await self.get_meeting_by_id(db, meeting.id, current_user)

    async def join_meeting(
        self,
        db: AsyncSession,
        meeting_id: uuid.UUID,
        current_user: User,
    ) -> MeetingJoinResponse:
        meeting = await self.get_meeting_by_id(db, meeting_id, current_user)

        if meeting.status == MeetingStatus.CANCELLED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This meeting has been cancelled.")
        if meeting.status == MeetingStatus.ENDED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This meeting has already ended.")

        # Check participant record or determine role
        part_res = await db.execute(
            select(MeetingParticipant).where(
                and_(
                    MeetingParticipant.meeting_id == meeting.id,
                    MeetingParticipant.user_id == current_user.id,
                )
            )
        )
        participant = part_res.scalar_one_or_none()

        # If user is host
        if meeting.host_user_id == current_user.id:
            role = ParticipantRole.HOST
            is_moderator = True
            if not participant:
                participant = MeetingParticipant(
                    meeting_id=meeting.id,
                    user_id=current_user.id,
                    participant_role=role,
                    invitation_status=InvitationStatus.ACCEPTED,
                )
                db.add(participant)
                await db.flush()
        elif participant:
            role = participant.participant_role
            is_moderator = role in (ParticipantRole.HOST, ParticipantRole.CO_HOST)
        elif current_user.role in (UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN):
            role = ParticipantRole.CO_HOST
            is_moderator = True
            participant = MeetingParticipant(
                meeting_id=meeting.id,
                user_id=current_user.id,
                participant_role=role,
                invitation_status=InvitationStatus.ACCEPTED,
            )
            db.add(participant)
            await db.flush()
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not an authorized participant for this meeting.",
            )

        # If meeting status was SCHEDULED and host joins, set to LIVE and create session
        if meeting.status == MeetingStatus.SCHEDULED and is_moderator:
            meeting.status = MeetingStatus.LIVE
            new_session = MeetingSession(
                meeting_id=meeting.id,
                status=SessionStatus.ACTIVE,
                started_at=utc_now(),
            )
            db.add(new_session)
            await db.flush()

        # Find or create active session to record attendance
        sess_res = await db.execute(
            select(MeetingSession).where(
                and_(MeetingSession.meeting_id == meeting.id, MeetingSession.status == SessionStatus.ACTIVE)
            ).order_by(MeetingSession.started_at.desc())
        )
        active_sess = sess_res.scalar_one_or_none()
        if not active_sess:
            # Auto-create active session if call is active
            active_sess = MeetingSession(
                meeting_id=meeting.id,
                status=SessionStatus.ACTIVE,
                started_at=utc_now(),
            )
            db.add(active_sess)
            await db.flush()

        # Record attendance entry
        attendance = MeetingAttendance(
            meeting_session_id=active_sess.id,
            user_id=current_user.id,
            joined_at=utc_now(),
        )
        db.add(attendance)

        # Audit Event
        db.add(
            MeetingEvent(
                meeting_id=meeting.id,
                actor_user_id=current_user.id,
                event_type="PARTICIPANT_JOINED",
                event_data={
                    "user_role": current_user.role.value,
                    "participant_role": role.value,
                },
            )
        )
        await db.commit()

        # Generate signed LiveKit token
        token = livekit_service.generate_token(
            room_name=meeting.provider_room_name,
            participant_identity=str(current_user.id),
            participant_name=current_user.full_name,
            participant_role=role,
            user_role=current_user.role,
            metadata={
                "school_id": str(current_user.school_id),
                "role": current_user.role.value,
                "email": current_user.email,
            },
        )

        return MeetingJoinResponse(
            token=token,
            server_url=livekit_service.server_url,
            room_name=meeting.provider_room_name,
            participant_identity=str(current_user.id),
            participant_name=current_user.full_name,
            is_moderator=is_moderator,
            meeting_title=meeting.title,
            meeting_status=meeting.status,
        )

    async def leave_meeting(
        self,
        db: AsyncSession,
        meeting_id: uuid.UUID,
        current_user: User,
        leave_reason: str = "USER_DISCONNECT",
    ) -> None:
        # Find active attendance interval
        query = (
            select(MeetingAttendance)
            .join(MeetingSession, MeetingAttendance.meeting_session_id == MeetingSession.id)
            .where(
                and_(
                    MeetingSession.meeting_id == meeting_id,
                    MeetingAttendance.user_id == current_user.id,
                    MeetingAttendance.left_at.is_(None),
                )
            )
            .order_by(MeetingAttendance.joined_at.desc())
        )
        res = await db.execute(query)
        attendance = res.scalars().first()
        if attendance:
            now = utc_now()
            attendance.left_at = now
            attendance.leave_reason = leave_reason
            if attendance.joined_at:
                attendance.duration_seconds = int((now - ensure_utc(attendance.joined_at)).total_seconds())

        db.add(
            MeetingEvent(
                meeting_id=meeting_id,
                actor_user_id=current_user.id,
                event_type="PARTICIPANT_LEFT",
                event_data={"leave_reason": leave_reason},
            )
        )
        await db.commit()

    async def end_meeting(
        self,
        db: AsyncSession,
        meeting_id: uuid.UUID,
        current_user: User,
    ) -> Meeting:
        meeting = await self.get_meeting_by_id(db, meeting_id, current_user)
        if meeting.host_user_id != current_user.id and current_user.role not in (UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only host or admin can end this meeting.")

        meeting.status = MeetingStatus.ENDED
        now = utc_now()

        # End active sessions and close unclosed attendances
        sessions_res = await db.execute(
            select(MeetingSession).where(
                and_(MeetingSession.meeting_id == meeting.id, MeetingSession.status == SessionStatus.ACTIVE)
            )
        )
        sessions = sessions_res.scalars().all()
        for sess in sessions:
            sess.status = SessionStatus.ENDED
            sess.ended_at = now

            # Close open attendances
            att_res = await db.execute(
                select(MeetingAttendance).where(
                    and_(MeetingAttendance.meeting_session_id == sess.id, MeetingAttendance.left_at.is_(None))
                )
            )
            for att in att_res.scalars().all():
                att.left_at = now
                att.leave_reason = "MEETING_ENDED"
                att.duration_seconds = int((now - ensure_utc(att.joined_at)).total_seconds())

        db.add(
            MeetingEvent(
                meeting_id=meeting.id,
                actor_user_id=current_user.id,
                event_type="MEETING_ENDED",
                event_data={"ended_at": now.isoformat()},
            )
        )
        await db.commit()
        return await self.get_meeting_by_id(db, meeting.id, current_user)


meeting_service = MeetingService()

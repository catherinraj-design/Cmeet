import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.core_erp import School, Branch, AcademicClass, User, UserRole, ClassEnrollment
from app.models.meeting import Meeting, MeetingType, MeetingStatus
from app.models.meeting_participant import MeetingParticipant, ParticipantRole, InvitationStatus
from app.models.meeting_session import MeetingSession, SessionStatus
from app.models.meeting_attendance import MeetingAttendance
from app.models.meeting_event import MeetingEvent


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if users already exist
        res = await db.execute(select(User).limit(1))
        if res.scalar_one_or_none():
            print("Database already contains data.")
            return

        print("Seeding initial ERP data and sample classrooms...")

        # School 1
        school1 = School(id=uuid.uuid4(), name="Greenwood High School", code="GWH")
        db.add(school1)
        await db.flush()

        branch1 = Branch(id=uuid.uuid4(), school_id=school1.id, name="Main Campus", code="MAIN")
        db.add(branch1)
        await db.flush()

        academic_class1 = AcademicClass(
            id=uuid.uuid4(),
            school_id=school1.id,
            branch_id=branch1.id,
            name="Grade 10",
            section="A",
        )
        db.add(academic_class1)
        await db.flush()

        # School 2
        school2 = School(id=uuid.uuid4(), name="Oakridge Academy", code="ORA")
        db.add(school2)
        await db.flush()

        pwd_hash = get_password_hash("password123")

        # Users
        teacher = User(
            id=uuid.uuid4(),
            school_id=school1.id,
            branch_id=branch1.id,
            email="teacher@greenwood.edu",
            full_name="Sarah Jenkins (Teacher)",
            role=UserRole.TEACHER,
            hashed_password=pwd_hash,
        )
        student1 = User(
            id=uuid.uuid4(),
            school_id=school1.id,
            branch_id=branch1.id,
            email="student1@greenwood.edu",
            full_name="Alex Rivera (Student)",
            role=UserRole.STUDENT,
            hashed_password=pwd_hash,
        )
        student2 = User(
            id=uuid.uuid4(),
            school_id=school1.id,
            branch_id=branch1.id,
            email="student2@greenwood.edu",
            full_name="Maya Lin (Student)",
            role=UserRole.STUDENT,
            hashed_password=pwd_hash,
        )
        parent = User(
            id=uuid.uuid4(),
            school_id=school1.id,
            branch_id=branch1.id,
            email="parent1@greenwood.edu",
            full_name="Robert Rivera (Parent)",
            role=UserRole.PARENT,
            hashed_password=pwd_hash,
        )
        admin = User(
            id=uuid.uuid4(),
            school_id=school1.id,
            branch_id=branch1.id,
            email="admin@greenwood.edu",
            full_name="Principal Skinner (Admin)",
            role=UserRole.SCHOOL_ADMIN,
            hashed_password=pwd_hash,
        )
        external_teacher = User(
            id=uuid.uuid4(),
            school_id=school2.id,
            email="teacher@oakridge.edu",
            full_name="Mark Evans (External Teacher)",
            role=UserRole.TEACHER,
            hashed_password=pwd_hash,
        )

        db.add_all([teacher, student1, student2, parent, admin, external_teacher])
        await db.flush()

        # Enroll students in class
        db.add_all([
            ClassEnrollment(academic_class_id=academic_class1.id, user_id=student1.id),
            ClassEnrollment(academic_class_id=academic_class1.id, user_id=student2.id),
        ])
        await db.flush()

        now = datetime.now(timezone.utc)

        # 1. LIVE Class: Grade 10 Mathematics
        live_meeting = Meeting(
            id=uuid.uuid4(),
            school_id=school1.id,
            branch_id=branch1.id,
            title="Grade 10 Mathematics — Quadratic Equations",
            description="Live classroom session covering quadratic equations and formula derivation.",
            meeting_type=MeetingType.CLASS,
            host_user_id=teacher.id,
            academic_class_id=academic_class1.id,
            starts_at=now - timedelta(minutes=15),
            ends_at=now + timedelta(minutes=45),
            timezone="UTC",
            status=MeetingStatus.LIVE,
            provider_room_name=f"cmeet-gwh-{uuid.uuid4().hex[:8]}",
        )
        db.add(live_meeting)
        await db.flush()

        # Session for live class
        session1 = MeetingSession(
            id=uuid.uuid4(),
            meeting_id=live_meeting.id,
            status=SessionStatus.ACTIVE,
            started_at=now - timedelta(minutes=15),
        )
        db.add(session1)

        # Participants for live class
        db.add_all([
            MeetingParticipant(
                meeting_id=live_meeting.id,
                user_id=teacher.id,
                participant_role=ParticipantRole.HOST,
                invitation_status=InvitationStatus.ACCEPTED,
            ),
            MeetingParticipant(
                meeting_id=live_meeting.id,
                user_id=student1.id,
                participant_role=ParticipantRole.PARTICIPANT,
                invitation_status=InvitationStatus.ACCEPTED,
            ),
            MeetingParticipant(
                meeting_id=live_meeting.id,
                user_id=student2.id,
                participant_role=ParticipantRole.PARTICIPANT,
                invitation_status=InvitationStatus.INVITED,
            ),
        ])

        # Teacher attendance interval for live class
        db.add(
            MeetingAttendance(
                meeting_session_id=session1.id,
                user_id=teacher.id,
                joined_at=now - timedelta(minutes=15),
            )
        )

        # 2. SCHEDULED Class: Grade 10 Physics
        sched_meeting = Meeting(
            id=uuid.uuid4(),
            school_id=school1.id,
            branch_id=branch1.id,
            title="Grade 10 Physics — Kinematics Review",
            description="Walkthrough of problem sets from chapter 3: Velocity, Acceleration & Projectile Motion.",
            meeting_type=MeetingType.CLASS,
            host_user_id=teacher.id,
            academic_class_id=academic_class1.id,
            starts_at=now + timedelta(hours=1),
            ends_at=now + timedelta(hours=2),
            timezone="UTC",
            status=MeetingStatus.SCHEDULED,
            provider_room_name=f"cmeet-gwh-{uuid.uuid4().hex[:8]}",
        )
        db.add(sched_meeting)
        await db.flush()

        db.add_all([
            MeetingParticipant(
                meeting_id=sched_meeting.id,
                user_id=teacher.id,
                participant_role=ParticipantRole.HOST,
                invitation_status=InvitationStatus.ACCEPTED,
            ),
            MeetingParticipant(
                meeting_id=sched_meeting.id,
                user_id=student1.id,
                participant_role=ParticipantRole.PARTICIPANT,
                invitation_status=InvitationStatus.INVITED,
            ),
            MeetingParticipant(
                meeting_id=sched_meeting.id,
                user_id=student2.id,
                participant_role=ParticipantRole.PARTICIPANT,
                invitation_status=InvitationStatus.INVITED,
            ),
        ])

        # 3. SCHEDULED Meeting: Parent Teacher Meeting
        ptm_meeting = Meeting(
            id=uuid.uuid4(),
            school_id=school1.id,
            branch_id=branch1.id,
            title="Parent-Teacher Conference: Term 1 Progress",
            description="Individual review session between faculty and guardians regarding student academic standing.",
            meeting_type=MeetingType.MEETING,
            host_user_id=teacher.id,
            academic_class_id=None,
            starts_at=now + timedelta(hours=3),
            ends_at=now + timedelta(hours=4),
            timezone="UTC",
            status=MeetingStatus.SCHEDULED,
            provider_room_name=f"cmeet-gwh-{uuid.uuid4().hex[:8]}",
        )
        db.add(ptm_meeting)
        await db.flush()

        db.add_all([
            MeetingParticipant(
                meeting_id=ptm_meeting.id,
                user_id=teacher.id,
                participant_role=ParticipantRole.HOST,
                invitation_status=InvitationStatus.ACCEPTED,
            ),
            MeetingParticipant(
                meeting_id=ptm_meeting.id,
                user_id=parent.id,
                participant_role=ParticipantRole.PARTICIPANT,
                invitation_status=InvitationStatus.INVITED,
            ),
        ])

        # 4. CONCLUDED Class: Computer Science
        ended_meeting = Meeting(
            id=uuid.uuid4(),
            school_id=school1.id,
            branch_id=branch1.id,
            title="Computer Science — Python Foundations",
            description="Introduction to data structures, dictionaries and list comprehensions.",
            meeting_type=MeetingType.CLASS,
            host_user_id=teacher.id,
            academic_class_id=academic_class1.id,
            starts_at=now - timedelta(hours=3),
            ends_at=now - timedelta(hours=2),
            timezone="UTC",
            status=MeetingStatus.ENDED,
            provider_room_name=f"cmeet-gwh-{uuid.uuid4().hex[:8]}",
        )
        db.add(ended_meeting)
        await db.flush()

        ended_session = MeetingSession(
            id=uuid.uuid4(),
            meeting_id=ended_meeting.id,
            status=SessionStatus.ENDED,
            started_at=now - timedelta(hours=3),
            ended_at=now - timedelta(hours=2),
        )
        db.add(ended_session)
        await db.flush()

        # Attendances for ended class
        db.add_all([
            MeetingAttendance(
                meeting_session_id=ended_session.id,
                user_id=teacher.id,
                joined_at=now - timedelta(hours=3),
                left_at=now - timedelta(hours=2),
                duration_seconds=3600,
                leave_reason="MEETING_ENDED",
            ),
            MeetingAttendance(
                meeting_session_id=ended_session.id,
                user_id=student1.id,
                joined_at=now - timedelta(hours=3),
                left_at=now - timedelta(hours=2, minutes=5),
                duration_seconds=3300,
                leave_reason="NORMAL_DISCONNECT",
            ),
        ])

        await db.commit()
        print("Demo data successfully seeded!")


if __name__ == "__main__":
    asyncio.run(seed())

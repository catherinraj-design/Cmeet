"""initial meetings and erp schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-10 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. schools
    op.create_table(
        'schools',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_schools_code'), 'schools', ['code'], unique=True)

    # 2. branches
    op.create_table(
        'branches',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('school_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_branches_school_id'), 'branches', ['school_id'], unique=False)

    # 3. academic_classes
    op.create_table(
        'academic_classes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('school_id', sa.Uuid(), nullable=False),
        sa.Column('branch_id', sa.Uuid(), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('section', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_academic_classes_school_id'), 'academic_classes', ['school_id'], unique=False)
    op.create_index(op.f('ix_academic_classes_branch_id'), 'academic_classes', ['branch_id'], unique=False)

    # 4. users
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('school_id', sa.Uuid(), nullable=True),
        sa.Column('branch_id', sa.Uuid(), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT', 'STAFF', name='userrole'), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)
    op.create_index(op.f('ix_users_school_id'), 'users', ['school_id'], unique=False)

    # 5. class_enrollments
    op.create_table(
        'class_enrollments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('academic_class_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['academic_class_id'], ['academic_classes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_class_enrollments_academic_class_id'), 'class_enrollments', ['academic_class_id'], unique=False)
    op.create_index(op.f('ix_class_enrollments_user_id'), 'class_enrollments', ['user_id'], unique=False)

    # 6. meetings
    op.create_table(
        'meetings',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('school_id', sa.Uuid(), nullable=False),
        sa.Column('branch_id', sa.Uuid(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('meeting_type', sa.Enum('CLASS', 'MEETING', name='meetingtype'), nullable=False),
        sa.Column('host_user_id', sa.Uuid(), nullable=False),
        sa.Column('academic_class_id', sa.Uuid(), nullable=True),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('timezone', sa.String(length=100), nullable=False),
        sa.Column('status', sa.Enum('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED', name='meetingstatus'), nullable=False),
        sa.Column('provider_room_name', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['academic_class_id'], ['academic_classes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['host_user_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_meetings_provider_room_name'), 'meetings', ['provider_room_name'], unique=True)
    op.create_index(op.f('ix_meetings_status'), 'meetings', ['status'], unique=False)
    op.create_index('ix_meetings_school_status_starts', 'meetings', ['school_id', 'status', 'starts_at'], unique=False)
    op.create_index('ix_meetings_host_starts', 'meetings', ['host_user_id', 'starts_at'], unique=False)

    # 7. meeting_participants
    op.create_table(
        'meeting_participants',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('meeting_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('participant_role', sa.Enum('HOST', 'CO_HOST', 'PARTICIPANT', 'VIEWER', name='participantrole'), nullable=False),
        sa.Column('invitation_status', sa.Enum('INVITED', 'ACCEPTED', 'DECLINED', name='invitationstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['meeting_id'], ['meetings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('meeting_id', 'user_id', name='uq_meeting_user')
    )
    op.create_index('ix_meeting_participants_meeting_user', 'meeting_participants', ['meeting_id', 'user_id'], unique=False)

    # 8. meeting_sessions
    op.create_table(
        'meeting_sessions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('meeting_id', sa.Uuid(), nullable=False),
        sa.Column('provider_session_id', sa.String(length=255), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE', 'ENDED', name='sessionstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['meeting_id'], ['meetings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_meeting_sessions_meeting_status', 'meeting_sessions', ['meeting_id', 'status'], unique=False)

    # 9. meeting_attendance
    op.create_table(
        'meeting_attendance',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('meeting_session_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.Column('leave_reason', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['meeting_session_id'], ['meeting_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_attendance_session_user', 'meeting_attendance', ['meeting_session_id', 'user_id'], unique=False)
    op.create_index('ix_attendance_user_joined', 'meeting_attendance', ['user_id', 'joined_at'], unique=False)

    # 10. meeting_events
    op.create_table(
        'meeting_events',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('meeting_id', sa.Uuid(), nullable=False),
        sa.Column('actor_user_id', sa.Uuid(), nullable=True),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('event_data', sa.JSON(), nullable=False),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('provider_event_id', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['meeting_id'], ['meetings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_meeting_events_meeting_occurred', 'meeting_events', ['meeting_id', 'occurred_at'], unique=False)


def downgrade() -> None:
    op.drop_table('meeting_events')
    op.drop_table('meeting_attendance')
    op.drop_table('meeting_sessions')
    op.drop_table('meeting_participants')
    op.drop_table('meetings')
    op.drop_table('class_enrollments')
    op.drop_table('users')
    op.drop_table('academic_classes')
    op.drop_table('branches')
    op.drop_table('schools')

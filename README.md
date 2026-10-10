# School ERP — Video Conferencing Module (Cmeet)

A secure, scalable, Google Meet–like video conferencing module designed for seamless integration into School ERP systems. Built with **FastAPI**, **SQLAlchemy**, **Alembic**, **PostgreSQL**, **LiveKit Cloud (WebRTC)**, **Next.js**, and **Tailwind CSS**.

---

## 🏗️ Architecture & Monorepo Structure

```
Cmeet/
├── apps/
│   ├── backend/                     # FastAPI Backend Service
│   │   ├── app/
│   │   │   ├── api/v1/
│   │   │   │   ├── auth.py          # ERP JWT login, current user & test data seeding
│   │   │   │   ├── meetings.py      # Meeting scheduling, join, leave, lifecycle APIs
│   │   │   │   └── webhooks.py      # LiveKit webhook processing (idempotent attendance)
│   │   │   ├── core/
│   │   │   │   ├── config.py        # Pydantic environment settings
│   │   │   │   ├── database.py      # Async SQLAlchemy engine & session factory
│   │   │   │   └── security.py      # JWT authentication, bcrypt & RBAC dependencies
│   │   │   ├── integrations/
│   │   │   │   └── livekit.py       # LiveKit access token generation & signature verification
│   │   │   ├── models/              # SQLAlchemy 2.0 ORM models
│   │   │   │   ├── core_erp.py      # School, Branch, AcademicClass, User, ClassEnrollment
│   │   │   │   ├── meeting.py       # Meeting
│   │   │   │   ├── meeting_participant.py # MeetingParticipant
│   │   │   │   ├── meeting_session.py     # MeetingSession
│   │   │   │   ├── meeting_attendance.py  # MeetingAttendance
│   │   │   │   └── meeting_event.py       # MeetingEvent
│   │   │   ├── schemas/             # Pydantic v2 schemas
│   │   │   │   ├── auth.py
│   │   │   │   └── meeting.py
│   │   │   ├── services/
│   │   │   │   ├── meeting_service.py     # Scheduling, authorization & lifecycle
│   │   │   │   └── attendance_service.py  # Attendance aggregation & audit reports
│   │   │   └── main.py              # FastAPI app instance with CORS & lifespan
│   │   ├── alembic/                 # Alembic migration scripts
│   │   │   └── versions/
│   │   │       └── 001_initial_schema.py
│   │   ├── tests/                   # Pytest test suite (12/12 passing)
│   │   │   ├── test_meetings.py
│   │   │   ├── test_meeting_permissions.py
│   │   │   ├── test_attendance.py
│   │   │   └── test_livekit_webhooks.py
│   │   ├── requirements.txt
│   │   └── .env.example
│   │
│   └── admin-web/                   # Next.js 14 Web Frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── meetings/page.tsx           # Meeting list & role simulation dashboard
│       │   │   ├── meetings/schedule/page.tsx  # Class & meeting creation form
│       │   │   └── meetings/[meetingId]/page.tsx # Pre-join lobby, video room & attendance report
│       │   ├── components/meetings/
│       │   │   ├── MeetingLobby.tsx     # Camera/Mic device preview & check
│       │   │   ├── VideoRoom.tsx        # LiveKit room connector & WebRTC audio renderer
│       │   │   ├── ParticipantGrid.tsx  # Dynamic adaptive Google Meet–style video grid
│       │   │   ├── MeetingControls.tsx  # Mic, camera, screen share & host end-class buttons
│       │   │   ├── ParticipantList.tsx  # Roster drawer & participant status
│       │   │   └── ScreenShare.tsx      # Presentation track toggler
│       │   ├── lib/
│       │   │   └── meetings-api.ts      # REST API client
│       │   └── types/
│       │       └── meeting.ts           # Shared TypeScript interfaces
│       ├── package.json
│       └── tailwind.config.js
├── docs/
│   └── PROJECT_MASTER_PLAN.md       # Master PMT blueprint
├── docker-compose.yml               # Multi-container orchestration
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+** / **npm 10+**

---

### 2. Run the Backend

```bash
# 1. Activate virtual environment
source apps/backend/.venv/bin/activate

# 2. Run database migrations
cd apps/backend
PYTHONPATH=. alembic upgrade head

# 3. Start the FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive Swagger documentation is available at:  
👉 **http://localhost:8000/docs**

---

### 3. Run the Frontend (Web App)

```bash
cd apps/admin-web

# Start Next.js development server
npm run dev
```

Visit the dashboard at:  
👉 **http://localhost:3000/meetings**

---

### 4. Running the Backend Test Suite

The test suite covers functional lifecycle, school isolation, token security, attendance calculation, and webhooks:

```bash
source apps/backend/.venv/bin/activate
PYTHONPATH=apps/backend pytest apps/backend/tests -v
```

**Test results: 12 passed in ~2.2s**
- `test_create_and_get_meeting`: Teacher creates class with automatic participant enrollment.
- `test_student_cannot_create_meeting`: Role protection (Students cannot schedule classes).
- `test_invalid_time_range_rejected`: Time range validation (`ends_at > starts_at`).
- `test_meeting_lifecycle`: State transitions (`SCHEDULED` -> `LIVE` -> `ENDED`).
- `test_cancel_meeting`: Meeting cancellation.
- `test_cross_school_isolation_blocked`: Prevents cross-school access and guessed meeting ID tampering.
- `test_uninvited_student_cannot_join_private_meeting`: Rejects unauthorized joins.
- `test_enrolled_student_can_join_and_get_token`: Issues scoped LiveKit token to enrolled students.
- `test_host_teacher_receives_moderator_privileges`: Grants host permissions (`is_moderator=True`).
- `test_attendance_recording_and_reports`: Tracks joined/left intervals and duration in seconds.
- `test_livekit_token_generation`: Generates cryptographically signed LiveKit JWT.
- `test_livekit_webhook_participant_lifecycle`: Verifies idempotent webhook event processing.

---

## 🔒 Security & Privacy Model

1. **No Shared Secrets on Client**: The browser never receives `LIVEKIT_API_SECRET`.
2. **Short-Lived Tokens**: Tokens expire in 60 minutes by default.
3. **Strict School Isolation**: Meetings, students, and sessions are verified against `current_user.school_id`.
4. **Least-Privilege Grants**:
   - **Teachers/Hosts**: `can_publish=True`, `can_subscribe=True`, `room_admin=True`.
   - **Students**: `can_publish=True`, `can_subscribe=True`, `room_admin=False`.
   - **Parents**: `can_publish=True`, `can_subscribe=True`, `room_admin=False`.
5. **Idempotent Webhooks**: Provider events are tracked using `provider_event_id` to prevent duplicate attendance logs.

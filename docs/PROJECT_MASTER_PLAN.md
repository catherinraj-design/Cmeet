# SCHOOL ERP — VIDEO CONFERENCING MODULE
## Project Master Plan (PMT)

**Project:** School ERP Live Classes & Meetings  
**Objective:** Build a secure, scalable, Google Meet–like video conferencing module integrated into the School ERP, supporting web first and mobile apps afterward.

---

# 1. PROJECT VISION

Build a video conferencing system that allows teachers, students, parents and authorized school staff to conduct and attend online classes and meetings without leaving the School ERP.

The module must integrate with the existing ERP authentication, role-based access control (RBAC), school/branch structure, academic classes, notifications and attendance system.

The first release will focus on live audio/video, scheduled meetings, screen sharing, participant management and attendance. Recording is not required.

## Primary objectives

- Conduct live online classes.
- Schedule parent–teacher meetings.
- Support authorized staff meetings.
- Provide a Google Meet–like web interface.
- Integrate with the existing ERP backend and database.
- Develop mobile support for Student and Parent apps after the web version is stable.
- Support concurrent users through horizontally scalable backend services and managed video infrastructure.
- Maintain strong security, privacy, reliability and auditability.

# 2. FINAL TECHNOLOGY STACK

## Frontend — Web

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- LiveKit JavaScript/React SDK and suitable UI components

## Frontend — Mobile (Later Phase)

- Flutter
- Dart
- LiveKit Flutter SDK
- Firebase Cloud Messaging (FCM)

## Backend

- Python
- FastAPI
- REST API
- Pydantic
- SQLAlchemy
- Alembic

## Database and background services

- PostgreSQL — persistent application data
- Redis — caching and distributed coordination where needed
- Celery — reminders and retryable background jobs
- FCM — mobile notifications

## Video infrastructure

- LiveKit Cloud — managed real-time video infrastructure
- WebRTC — real-time audio/video technology used by the video platform
- LiveKit access tokens — room-specific participant authorization
- Provider webhooks — room and participant event processing

## Deployment and monitoring

- Docker
- GitHub Actions
- AWS or an equivalent production hosting environment
- Sentry
- AWS CloudWatch or equivalent metrics and logging
- Managed secrets storage

**Infrastructure decision:** Start with LiveKit Cloud. Do not self-host the video infrastructure or build a WebRTC media server from scratch for the first release. Reassess infrastructure costs and operational requirements after measuring actual usage.

# 3. USER ROLES AND ACCESS

The module must integrate with the existing ERP roles rather than creating a separate authentication system.

## Super Admin
- Manage global conferencing configuration.
- View authorized system-level usage metrics.
- Manage provider configuration and system policies.
- Access cross-school information only through explicitly authorized permissions.

## School Admin
- View and manage meetings within the authorized school.
- Configure school-level meeting policies.
- View authorized meeting and attendance reports.
- Manage meeting access when explicitly permitted.

## Teacher
- Schedule, start and end assigned classes.
- Schedule parent–teacher meetings.
- Invite authorized participants.
- Manage participants in meetings they host or moderate.
- Share screens and manage meeting attendance.
- View authorized meeting history.

## Student
- View eligible scheduled classes.
- Join assigned online classes.
- Control their own microphone and camera.
- Participate in screen sharing and chat according to school policy.
- View their own attendance and eligible meeting history.

## Parent
- View eligible parent–teacher meetings.
- Join meetings for which they are authorized.
- Receive meeting reminders.
- View authorized meeting history and relevant attendance information.

## Additional ERP roles
Accountant, HR and other existing roles must have no conferencing privileges by default. Grant permissions only when a defined business requirement exists.

# 4. FEATURE REQUIREMENTS

## A. Meeting scheduling

- Create a meeting with title and description.
- Support class sessions and general meetings.
- Select the academic class, section or eligible participants.
- Specify start time, end time and school timezone.
- Invite participants or derive eligible students from authorized class assignments.
- Edit or cancel scheduled meetings.
- Display upcoming, live, completed and cancelled meetings.
- Prevent invalid time ranges.
- Validate host permissions and school membership.

## B. Meeting lobby

- Display meeting title and host.
- Request browser camera and microphone permissions.
- Preview camera and microphone status before joining.
- Allow the user to select available audio/video devices where supported.
- Show connection status.
- Display a clear error if access is denied or the meeting is unavailable.

## C. Live video meeting

- Audio and video.
- Participant grid.
- Active speaker view.
- Microphone on/off.
- Camera on/off.
- Screen sharing.
- Participant list.
- Leave meeting.
- Connection and reconnection handling.
- Responsive web layout.
- Clear states for joining, connected, reconnecting and disconnected.

## D. Host controls

- Admit eligible participants where waiting-room functionality is enabled.
- Mute participants where authorized.
- Remove participants where authorized.
- Restrict student screen sharing according to school policy.
- End a meeting for all participants.
- Prevent unauthorized participants from becoming moderators.

## E. Chat and interaction

- Provide basic in-meeting text chat if included in the MVP scope.
- Enforce room membership and participant permissions.
- Do not expose messages to unrelated meetings.
- Define message retention and moderation policies before production.

## F. Attendance

- Record participant connection intervals.
- Handle disconnects and reconnects.
- Calculate total attendance duration from valid intervals.
- Process verified provider events.
- Store meeting and session status.
- Allow authorized teachers and administrators to view reports.
- Keep attendance records separate from the academic attendance system until the integration rules are explicitly defined.

## G. Notifications

- Notify eligible participants when meetings are scheduled or updated.
- Send reminders before the start time.
- Notify participants when a meeting is cancelled.
- Use existing ERP notification infrastructure where available.
- Use Celery for retryable scheduled tasks and FCM for mobile push notifications.

## H. Meeting history

- Show upcoming and completed meetings.
- Display meeting duration and eligible participants.
- Display authorized attendance information.
- Provide filters by school, class, teacher and date, subject to permissions.
- Do not implement recording in the first release.

# 5. SYSTEM ARCHITECTURE

The architecture must use one centralized ERP backend.

Client applications:
- Super Admin, School Admin, Teacher, Student and Parent web interfaces.
- Flutter Student and Parent apps in a later phase.

Central FastAPI backend:
- ERP authentication.
- Role-based authorization.
- School and branch authorization.
- Meeting scheduling.
- Participant eligibility.
- Video token issuance.
- Meeting lifecycle.
- Attendance processing.
- Notifications.
- Audit logging.

PostgreSQL:
- Meetings.
- Meeting participants.
- Meeting sessions.
- Attendance intervals.
- Meeting events and audit records.

LiveKit Cloud:
- Real-time media transport.
- Video/audio connections.
- Participant media permissions.
- Screen sharing and room events.

Redis/Celery:
- Scheduled reminders.
- Retryable background jobs.
- Appropriate caching and distributed coordination.

Important design rule: audio/video media must flow through the video infrastructure, not through FastAPI request handlers. FastAPI authorizes users and manages the ERP records.

# 6. DATABASE DESIGN

Use the existing ERP user, school, branch and academic tables. Do not duplicate those entities.

## Table 1: meetings

Fields:
- id — UUID primary key
- school_id — foreign key to schools
- branch_id — nullable foreign key to branches
- title — required string
- description — nullable text
- meeting_type — CLASS or MEETING
- host_user_id — foreign key to users
- academic_class_id — nullable foreign key to the existing academic class table
- starts_at — timezone-aware timestamp
- ends_at — timezone-aware timestamp
- timezone — IANA timezone identifier
- status — SCHEDULED, LIVE, ENDED or CANCELLED
- provider_room_name — unique provider room identifier
- created_at
- updated_at

## Table 2: meeting_participants

Fields:
- id — UUID primary key
- meeting_id — foreign key to meetings
- user_id — foreign key to users
- participant_role
- invitation_status
- created_at

Constraints:
- Unique combination of meeting_id and user_id.
- Index meeting_id and user_id.
- Validate eligibility before creating participant records.

## Table 3: meeting_sessions

Fields:
- id — UUID primary key
- meeting_id — foreign key to meetings
- provider_session_id — nullable provider identifier
- started_at
- ended_at
- status
- created_at

A meeting may have multiple sessions if it is restarted or if the lifecycle design explicitly supports that behavior.

## Table 4: meeting_attendance

Fields:
- id — UUID primary key
- meeting_session_id — foreign key to meeting_sessions
- user_id — foreign key to users
- joined_at
- left_at — nullable until departure is confirmed
- duration_seconds — nullable until calculated
- leave_reason
- created_at

Record multiple connection intervals when users disconnect and reconnect.

## Table 5: meeting_events

Fields:
- id — UUID primary key
- meeting_id — foreign key to meetings
- actor_user_id — nullable foreign key to users
- event_type
- event_data — JSONB
- occurred_at
- provider_event_id — nullable provider event identifier

Requirements:
- Use Alembic migrations.
- Apply foreign keys and database constraints.
- Use indexes for common meeting, participant and attendance queries.
- Use UTC-aware timestamps for stored instants and retain the intended timezone for scheduling.
- Process provider events idempotently.
- Define retention and cleanup rules for event data.
- Never store provider API secrets in these tables.

# 7. API DESIGN

Base path: /api/v1

## Meeting APIs

POST /meetings
Create a scheduled meeting.

GET /meetings
List meetings visible to the authenticated user.

GET /meetings/{meeting_id}
Retrieve authorized meeting details.

PATCH /meetings/{meeting_id}
Update permitted meeting details.

POST /meetings/{meeting_id}/cancel
Cancel a meeting.

POST /meetings/{meeting_id}/start
Start a session when permitted.

POST /meetings/{meeting_id}/join
Validate eligibility and issue short-lived video credentials.

POST /meetings/{meeting_id}/leave
Record a normal departure when possible.

POST /meetings/{meeting_id}/end
End the meeting for all participants when authorized.

GET /meetings/{meeting_id}/participants
Retrieve authorized participant information.

GET /meetings/{meeting_id}/attendance
Retrieve authorized attendance records.

GET /meetings/{meeting_id}/events
Retrieve authorized meeting history.

POST /webhooks/livekit
Receive and process verified provider events.

## API requirements

- Use existing ERP authentication.
- Validate requests and responses with Pydantic.
- Return appropriate HTTP status codes.
- Use pagination for potentially large results.
- Apply rate limits to sensitive endpoints.
- Enforce school and branch isolation.
- Avoid returning unnecessary personal information.
- Document the APIs using OpenAPI.
- Add integration tests for authorization failures.
- Do not trust client-supplied school IDs, participant lists or host IDs without validating them against the authenticated user's permissions.

# 8. VIDEO TOKEN SECURITY

The browser or mobile app must never receive the LiveKit API secret.

Join workflow:
1. User authenticates with the ERP.
2. Client requests permission to join a meeting.
3. FastAPI verifies identity, school, meeting status and participant eligibility.
4. FastAPI generates a signed, room-specific token.
5. Token grants only the required room access and participant permissions.
6. Client connects to the provider using the returned server URL and token.
7. Provider events are verified and reconciled with the ERP records.

Additional requirements:
- Short-lived tokens with an appropriate expiry policy.
- No arbitrary room selection by clients.
- No unrestricted room-administration tokens.
- Least-privilege moderator grants.
- Server-side secret storage.
- Secure transport.
- Token issuance rate limiting.
- Redaction of tokens from application logs.
- Defined procedures for revoking access to active sessions.

# 9. SECURITY AND PRIVACY

Implement the following controls:

- JWT authentication through the existing ERP.
- Server-side RBAC enforcement.
- School and branch data isolation.
- Object-level authorization for every meeting endpoint.
- Secure LiveKit token generation.
- Verified provider webhook signatures.
- Idempotent event processing.
- Rate limiting and abuse prevention.
- Audit logs for sensitive actions.
- Restricted attendance and meeting history.
- Minimal personal data collection.
- Clear browser and mobile camera/microphone permissions.
- School-approved student privacy and participation policies.
- Defined data retention and deletion policies.
- No meeting recording in the MVP.

Test specifically for unauthorized meeting joins, cross-school data access, privilege escalation and guessed meeting IDs.

# 10. FRONTEND STRUCTURE

Adapt the following structure to the existing repository.

apps/admin-web/src/
- app/meetings/page.tsx
- app/meetings/schedule/
- app/meetings/[meetingId]/
- components/meetings/MeetingLobby.tsx
- components/meetings/VideoRoom.tsx
- components/meetings/ParticipantGrid.tsx
- components/meetings/MeetingControls.tsx
- components/meetings/ParticipantList.tsx
- components/meetings/ScreenShare.tsx
- lib/meetings-api.ts
- types/meeting.ts

Responsibilities:
- Meeting listing and scheduling.
- Role-specific entry points.
- Pre-join lobby.
- Video room and controls.
- Participant management.
- Loading, error and reconnecting states.
- Meeting history and attendance views.

Do not duplicate all components for every role. Reuse shared conferencing components and apply role-specific permissions and layouts where appropriate.

# 11. BACKEND STRUCTURE

Adapt the following to the existing apps/backend/app conventions.

- api/v1/meetings.py
- models/meeting.py
- models/meeting_participant.py
- models/meeting_session.py
- models/meeting_attendance.py
- models/meeting_event.py
- schemas/meeting.py
- services/meeting_service.py
- services/video_provider.py
- services/attendance_service.py
- integrations/livekit.py
- workers/meeting_notifications.py
- workers/meeting_cleanup.py
- tests/test_meetings.py
- tests/test_meeting_permissions.py
- tests/test_attendance.py
- tests/test_livekit_webhooks.py

Keep business rules in services, request/response validation in schemas, persistence in models/repositories according to existing conventions, and HTTP handling in API routers.

# 12. IMPLEMENTATION PHASES

## Phase 1 — Requirements and architecture
- Review the existing ERP authentication, roles and academic tables.
- Finalize meeting types and participant eligibility.
- Define permission rules.
- Finalize database relationships.
- Document the API contract.
- Create a development LiveKit environment.

Deliverable: approved architecture and OpenAPI contract.

## Phase 2 — Backend foundation
- Create SQLAlchemy models.
- Generate and review Alembic migrations.
- Implement meeting CRUD and scheduling.
- Implement participant authorization.
- Implement meeting lifecycle transitions.
- Add unit and integration tests.

Deliverable: working meeting management APIs.

## Phase 3 — Basic video proof of concept
- Connect FastAPI to LiveKit.
- Implement secure token issuance.
- Connect two authorized browser participants.
- Test camera and microphone.
- Test disconnection and reconnection.
- Test unauthorized access.

Deliverable: two authorized ERP users can safely join the same video room.

## Phase 4 — Web MVP
- Build the meeting list and scheduler.
- Build the pre-join lobby.
- Build the video room.
- Add participant grid and meeting controls.
- Add screen sharing and moderation.
- Integrate the module into existing role dashboards.

Deliverable: end-to-end web conferencing.

## Phase 5 — Attendance and notifications
- Process provider webhooks.
- Record attendance intervals.
- Handle duplicate and out-of-order events.
- Schedule reminders with Celery.
- Add meeting history and reports.
- Test meeting cancellation and unexpected disconnection.

Deliverable: dependable attendance and meeting lifecycle tracking.

## Phase 6 — Production readiness
- Configure staging and production environments.
- Store secrets securely.
- Add monitoring and error reporting.
- Configure API and database scaling.
- Add rate limits and budget alerts.
- Run load and security tests.
- Conduct a controlled pilot with a small group of users.

Deliverable: approved production release.

## Phase 7 — Flutter mobile integration
- Integrate meeting list and meeting APIs.
- Add the LiveKit Flutter SDK.
- Implement camera and microphone permissions.
- Implement joining, leaving and reconnecting.
- Add FCM meeting reminders.
- Test supported Android and iOS devices.

Deliverable: Student and Parent apps can join eligible meetings.

# 13. TEAM RESPONSIBILITIES

Three-person team:

Member 1 — Backend lead:
- Database and migrations.
- FastAPI endpoints.
- RBAC and school isolation.
- LiveKit integration.
- Token security.
- Webhooks and attendance.
- Integration testing.

Member 2 — Student and Parent web:
- Meeting lists.
- Join flow and lobby.
- Video room integration.
- Responsive interfaces.
- Student/parent-specific access states.

Member 3 — Teacher and Admin web:
- Scheduling interfaces.
- Host controls.
- Participant management.
- Attendance reports.
- Role dashboard integration.

# 14. TESTING PLAN

## Functional tests
- Create, update and cancel meetings.
- Start and end meetings.
- Join and leave meetings.
- Verify participant permissions.
- Verify attendance calculations.
- Verify reminders.

## Security tests
- Reject unauthorized users.
- Reject cross-school access.
- Reject invalid or expired credentials.
- Reject unauthorized moderator actions.
- Verify provider webhook signatures.
- Test token scope and room restrictions.
- Prevent duplicate or forged attendance events.

## Reliability tests
- Browser refresh during a call.
- Network disconnection and recovery.
- Camera/microphone denial.
- Host disconnects unexpectedly.
- Duplicate provider webhooks.
- Database and worker interruptions.
- Expired token and reconnect behavior.

## Performance tests
- Concurrent dashboard requests.
- Simultaneous meeting joins.
- Token issuance throughput.
- Database connection pool saturation.
- Attendance event processing.
- Realistic concurrent video sessions.
- Provider bandwidth and participant-minute costs.

# 15. PRODUCTION AND OPERATIONS

- Separate development, staging and production.
- Use environment-specific provider credentials.
- Apply migrations through controlled deployment steps.
- Use HTTPS for web/API traffic and secure WebSocket connections for video.
- Monitor API latency, error rates and database usage.
- Monitor video join failures and connection quality.
- Configure provider-usage and spending alerts.
- Configure database backups and verify restoration.
- Keep dependencies updated through reviewed changes.
- Establish incident response and rollback procedures.
- Document operational ownership and support responsibilities.

# 16. FEATURES EXCLUDED FROM THE FIRST RELEASE

Do not implement these until the core product is stable:

- Meeting recording.
- Breakout rooms.
- Live captions and transcription.
- AI meeting summaries.
- Advanced virtual backgrounds.
- Large webinar broadcasting.
- Complex polling and interactive classroom tools.
- Advanced video analytics.
- Self-hosted media infrastructure.

# 17. MVP ACCEPTANCE CRITERIA

The MVP is ready for a controlled pilot when:

1. A teacher can schedule, start and end an authorized class.
2. Eligible students can join from a supported browser.
3. Invited parents can join parent–teacher meetings.
4. Audio, video and screen sharing work.
5. Unauthorized users cannot join by guessing meeting IDs.
6. School and branch isolation is enforced.
7. Teachers can moderate only authorized meetings.
8. Attendance survives disconnects and reconnects.
9. Provider events are verified and processed safely.
10. Notifications and meeting history work correctly.
11. Error states and network interruptions are handled gracefully.
12. Load, security and backup-recovery tests meet the team's documented release criteria.
13. Production monitoring and usage alerts are active.

# 18. FINAL ARCHITECTURAL DECISIONS

- Build the web conferencing experience first.
- Keep one centralized ERP backend.
- Use FastAPI for meeting management and authorization.
- Use PostgreSQL for persistent meeting and attendance records.
- Use LiveKit Cloud for the first production implementation.
- Use short-lived, least-privilege video access tokens.
- Use provider events alongside backend APIs for reliable attendance.
- Reuse existing ERP identity and academic records.
- Integrate Flutter Student and Parent apps after the web MVP is stable.
- Do not implement recording in the initial release.
- Do not create separate backends for different roles.
- Do not build or operate a custom WebRTC media server in the first phase.

# 19. FIRST DEVELOPMENT MILESTONE

Start with the existing ERP repository and complete these tasks in order:

1. Review the current backend structure and authentication implementation.
2. Confirm the existing user, school, branch and academic table relationships.
3. Finalize meeting and participant schemas.
4. Write the initial Alembic migration.
5. Implement meeting creation and participant authorization.
6. Implement the secure LiveKit token endpoint.
7. Build a minimal web page that connects two authorized users to one room.
8. Add tests proving unauthorized users cannot join.
9. Only then expand into the complete meeting interface, attendance and notifications.

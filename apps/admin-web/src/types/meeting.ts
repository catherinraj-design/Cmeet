export type MeetingType = "CLASS" | "MEETING";
export type MeetingStatus = "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
export type ParticipantRole = "HOST" | "CO_HOST" | "PARTICIPANT" | "VIEWER";
export type InvitationStatus = "INVITED" | "ACCEPTED" | "DECLINED";

export type UserRole =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "STUDENT"
  | "PARENT";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  school_id?: string;
  branch_id?: string;
}

export interface ParticipantBrief {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  participant_role: ParticipantRole;
  invitation_status: InvitationStatus;
}

export interface Meeting {
  id: string;
  school_id: string;
  branch_id?: string;
  title: string;
  description?: string;
  meeting_type: MeetingType;
  host_user_id: string;
  host_name?: string;
  academic_class_id?: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: MeetingStatus;
  provider_room_name: string;
  participants_count: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingDetail extends Meeting {
  participants: ParticipantBrief[];
}

export interface MeetingJoinResponse {
  token: string;
  server_url: string;
  room_name: string;
  participant_identity: string;
  participant_name: string;
  is_moderator: boolean;
  meeting_title: string;
  meeting_status: MeetingStatus;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  joined_at: string;
  left_at?: string;
  duration_seconds?: number;
  leave_reason?: string;
}

export interface AttendanceSummary {
  meeting_id: string;
  total_participants: number;
  sessions_count: number;
  records: AttendanceRecord[];
}

export interface MeetingEvent {
  id: string;
  meeting_id: string;
  actor_user_id?: string;
  actor_name?: string;
  event_type: string;
  event_data: Record<string, any>;
  occurred_at: string;
}

import {
  Meeting,
  MeetingDetail,
  MeetingJoinResponse,
  AttendanceSummary,
  MeetingEvent,
  User,
} from "../types/meeting";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("cmeet_auth_token", token);
    } else {
      localStorage.removeItem("cmeet_auth_token");
    }
  }
};

export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== "undefined") {
    authToken = localStorage.getItem("cmeet_auth_token");
  }
  return authToken;
};

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "An unexpected error occurred";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = `${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const meetingsApi = {
  // Auth
  async login(email: string, password: string): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Authentication failed");
    }
    const data = await res.json();
    setAuthToken(data.access_token);
    return data.access_token;
  },

  async getCurrentUser(): Promise<User> {
    return fetchWithAuth<User>("/auth/me");
  },

  async seedDemo(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/auth/seed`, { method: "POST" });
    return res.json();
  },

  // Meetings
  async listMeetings(status?: string): Promise<Meeting[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return fetchWithAuth<Meeting[]>(`/meetings${query}`);
  },

  async getMeeting(id: string): Promise<MeetingDetail> {
    return fetchWithAuth<MeetingDetail>(`/meetings/${id}`);
  },

  async createMeeting(payload: {
    title: string;
    description?: string;
    meeting_type: "CLASS" | "MEETING";
    academic_class_id?: string;
    starts_at: string;
    ends_at: string;
    timezone?: string;
  }): Promise<Meeting> {
    return fetchWithAuth<Meeting>("/meetings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async startMeeting(id: string): Promise<Meeting> {
    return fetchWithAuth<Meeting>(`/meetings/${id}/start`, {
      method: "POST",
    });
  },

  async joinMeeting(id: string): Promise<MeetingJoinResponse> {
    return fetchWithAuth<MeetingJoinResponse>(`/meetings/${id}/join`, {
      method: "POST",
    });
  },

  async leaveMeeting(id: string, reason = "USER_DISCONNECT"): Promise<void> {
    return fetchWithAuth<void>(`/meetings/${id}/leave`, {
      method: "POST",
      body: JSON.stringify({ leave_reason: reason }),
    });
  },

  async endMeeting(id: string): Promise<Meeting> {
    return fetchWithAuth<Meeting>(`/meetings/${id}/end`, {
      method: "POST",
    });
  },

  async cancelMeeting(id: string): Promise<Meeting> {
    return fetchWithAuth<Meeting>(`/meetings/${id}/cancel`, {
      method: "POST",
    });
  },

  async getAttendance(id: string): Promise<AttendanceSummary> {
    return fetchWithAuth<AttendanceSummary>(`/meetings/${id}/attendance`);
  },

  async getEvents(id: string): Promise<MeetingEvent[]> {
    return fetchWithAuth<MeetingEvent[]>(`/meetings/${id}/events`);
  },
};

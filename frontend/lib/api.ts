// Read at build time (NEXT_PUBLIC_ vars are baked into the bundle). Trailing slash removed.
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

export type User = {
  id: number;
  name: string;
  email: string;
  avatar_color: string;
};

export type Participant = {
  id: number;
  display_name: string;
  role: "host" | "participant";
  is_muted: boolean;
  is_removed: boolean;
  joined_at: string;
  left_at: string | null;
};

export type Meeting = {
  id: number;
  meeting_code: string;
  title: string;
  description: string | null;
  host_id: number;
  type: "instant" | "scheduled";
  scheduled_start: string | null;
  duration_minutes: number;
  status: "scheduled" | "live" | "ended";
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  invite_link: string;
};

export type MeetingDetail = Meeting & { participants: Participant[] };

export type JoinResult = { meeting: MeetingDetail; participant: Participant };

export type AuthResult = { token: string; user: User };

// The login token lives in localStorage, so you stay logged in across reloads and tabs.
const TOKEN_KEY = "authToken";
// Fired when the server rejects the saved token; AuthProvider listens and falls back to logged out.
export const AUTH_EXPIRED_EVENT = "auth-expired";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // e.g. during server rendering, where localStorage doesn't exist
  }
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Single fetch wrapper: every API call goes through here so errors are handled one way.
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError("NEXT_PUBLIC_API_URL is not set", 0);
  }

  // Logged in: send the token. Logged out: send nothing and the server uses the default user.
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Could not reach the server. Is the backend running?", 0);
  }

  if (!res.ok) {
    // A 401 here means the saved token is expired or invalid (a wrong password on the
    // login form is also a 401, but that isn't about the saved token).
    if (res.status === 401 && token && path !== "/auth/login") {
      clearToken();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // response had no JSON body; keep the generic message
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // The logged-in user, or the default user when logged out.
  getMe: () => request<User>("/auth/me"),

  signup: (name: string, email: string, password: string) =>
    request<AuthResult>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getUpcomingMeetings: () => request<Meeting[]>("/meetings/upcoming"),

  getRecentMeetings: () => request<Meeting[]>("/meetings/recent"),

  getLiveMeetings: () => request<Meeting[]>("/meetings/live"),

  getMeeting: (code: string) => request<MeetingDetail>(`/meetings/${code}`),

  createInstantMeeting: (title?: string) =>
    request<Meeting>("/meetings/instant", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  createScheduledMeeting: (data: {
    title: string;
    description?: string;
    scheduled_start: string;
    duration_minutes: number;
  }) =>
    request<Meeting>("/meetings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  joinMeeting: (code: string, displayName: string) =>
    request<JoinResult>(`/meetings/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ display_name: displayName }),
    }),

  // Host enters the room (marks the meeting live, returns the host's participant row).
  startMeeting: (code: string) => request<JoinResult>(`/meetings/${code}/start`, { method: "POST" }),

  leaveMeeting: (code: string, participantId: number) =>
    request<{ status: string }>(`/meetings/${code}/leave`, {
      method: "POST",
      body: JSON.stringify({ participant_id: participantId }),
    }),

  endMeeting: (code: string) =>
    request<Meeting>(`/meetings/${code}/end`, { method: "POST" }),

  // Host controls: the host sends their own participant id to prove they are the host.
  muteAll: (code: string, hostParticipantId: number) =>
    request<MeetingDetail>(`/meetings/${code}/mute-all`, {
      method: "POST",
      body: JSON.stringify({ requester_participant_id: hostParticipantId }),
    }),

  removeParticipant: (code: string, participantId: number, hostParticipantId: number) =>
    request<MeetingDetail>(`/meetings/${code}/participants/${participantId}/remove`, {
      method: "POST",
      body: JSON.stringify({ requester_participant_id: hostParticipantId }),
    }),

  setMuted: (code: string, participantId: number, muted: boolean) =>
    request<Participant>(`/meetings/${code}/participants/${participantId}/mute`, {
      method: "POST",
      body: JSON.stringify({ muted }),
    }),
};

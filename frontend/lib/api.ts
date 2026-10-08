const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new ApiError("Could not reach the server. Is the backend running?", 0);
  }

  if (!res.ok) {
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
  getMe: () => request<User>("/users/me"),

  getUpcomingMeetings: () => request<Meeting[]>("/meetings/upcoming"),

  getRecentMeetings: () => request<Meeting[]>("/meetings/recent"),

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
};

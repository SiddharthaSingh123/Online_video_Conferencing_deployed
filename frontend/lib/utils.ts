// The API stores UTC datetimes and returns them without a "Z" suffix,
// so we add it to make the browser parse them as UTC (not local time).
export function parseUtc(value: string): Date {
  const hasTimezone = value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value);
  return new Date(hasTimezone ? value : value + "Z");
}

// "1234567891" -> "123 4567 891"
export function formatMeetingCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3, 7)} ${code.slice(7)}`;
}

// Accepts "123 4567 8901", "1234567891" or ".../j/1234567891". Returns null if no valid code.
export function extractMeetingCode(input: string): string | null {
  const fromLink = input.match(/\/j\/(\d+)/);
  const digits = fromLink ? fromLink[1] : input.replace(/\D/g, "");
  return digits.length === 10 ? digits : null;
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTimeRange(start: Date, durationMinutes: number): string {
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${formatClock(start)} - ${formatClock(end)}`;
}

// "Today", "Tomorrow" or e.g. "Fri, Oct 10"
export function formatDayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

// Values for <input type="date"> and <input type="time">, in local time.
export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// sessionStorage: remembers who "I" am in a meeting for this browser tab.
const DISPLAY_NAME_KEY = "displayName";

export function saveDisplayName(name: string): void {
  sessionStorage.setItem(DISPLAY_NAME_KEY, name);
}

export function loadDisplayName(): string | null {
  return sessionStorage.getItem(DISPLAY_NAME_KEY);
}

export function markAsHost(code: string): void {
  sessionStorage.setItem(`host:${code}`, "true");
}

export function isHostOf(code: string): boolean {
  return sessionStorage.getItem(`host:${code}`) === "true";
}

export function saveParticipantId(code: string, id: number): void {
  sessionStorage.setItem(`participant:${code}`, String(id));
}

export function loadParticipantId(code: string): number | null {
  const value = sessionStorage.getItem(`participant:${code}`);
  return value ? Number(value) : null;
}

export function clearMeetingSession(code: string): void {
  sessionStorage.removeItem(`host:${code}`);
  sessionStorage.removeItem(`participant:${code}`);
}

// Mic/camera choices made on the pre-join screen, carried into the meeting room.
export type MediaPrefs = { micOn: boolean; videoOn: boolean };

export function saveMediaPrefs(prefs: MediaPrefs): void {
  sessionStorage.setItem("mediaPrefs", JSON.stringify(prefs));
}

export function loadMediaPrefs(): MediaPrefs {
  try {
    const saved = sessionStorage.getItem("mediaPrefs");
    if (saved) return JSON.parse(saved) as MediaPrefs;
  } catch {
    // ignore malformed value
  }
  return { micOn: true, videoOn: true };
}

// Picks a stable color for a name so each participant's avatar keeps the same color.
const AVATAR_COLORS = ["#0B5CFF", "#FF742E", "#12A37F", "#8E4EC6", "#E5484D", "#0091B5", "#D6409F"];

export function avatarColor(name: string): string {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, Umbrella } from "lucide-react";
import CopyLinkButton from "@/components/CopyLinkButton";
import { api, type Meeting } from "@/lib/api";
import {
  formatDayLabel,
  formatMeetingCode,
  formatTimeRange,
  markAsHost,
  parseUtc,
  saveDisplayName,
} from "@/lib/utils";

type UpcomingMeetingsProps = {
  hostName: string;
  refreshKey: number; // bump this number to make the list re-fetch
  onSchedule: () => void;
};

export default function UpcomingMeetings({ hostName, refreshKey, onSchedule }: UpcomingMeetingsProps) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getUpcomingMeetings()
      .then((data) => {
        setMeetings(data);
        setError("");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  function startMeeting(code: string) {
    markAsHost(code);
    saveDisplayName(hostName);
    router.push(`/meeting/${code}`);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-line">
      <header className="relative flex items-center justify-center border-b border-line bg-panel px-4 py-3">
        <button
          onClick={onSchedule}
          className="absolute left-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-ink hover:bg-black/5"
          aria-label="Schedule a meeting"
          title="Schedule a meeting"
        >
          <Plus className="size-5" />
        </button>
        <h2 className="text-base font-semibold text-ink">Upcoming meetings</h2>
      </header>

      <div className="min-h-[260px]">
        {loading ? (
          <div className="flex h-[260px] items-center justify-center text-muted">
            <LoaderCircle className="size-6 animate-spin" />
          </div>
        ) : error ? (
          <p className="flex h-[260px] items-center justify-center px-6 text-center text-sm text-danger">
            {error}
          </p>
        ) : meetings.length === 0 ? (
          <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-center">
            <div className="mb-2 flex size-20 items-center justify-center rounded-full bg-[#eeeefb]">
              <Umbrella className="size-10 text-[#9a9ad8]" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-muted">No meetings scheduled.</p>
            <button
              onClick={onSchedule}
              className="flex min-h-11 items-center gap-1 px-2 text-sm text-zoom-blue hover:underline"
            >
              <Plus className="size-4" /> Schedule a meeting
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {meetings.map((m) => {
              const start = parseUtc(m.scheduled_start!);
              return (
                // Mobile: time on its own line above the title. From sm up: time column on the left.
                <li key={m.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <div className="flex items-baseline gap-2 sm:block sm:w-[120px] sm:shrink-0">
                    <p className="text-sm font-semibold text-ink">{formatDayLabel(start)}</p>
                    <p className="text-xs text-muted">{formatTimeRange(start, m.duration_minutes)}</p>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{m.title}</p>
                      <p className="text-xs text-muted">Meeting ID: {formatMeetingCode(m.meeting_code)}</p>
                    </div>
                    <CopyLinkButton link={m.invite_link} />
                    <button className="btn-primary shrink-0 py-1.5" onClick={() => startMeeting(m.meeting_code)}>
                      Start
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

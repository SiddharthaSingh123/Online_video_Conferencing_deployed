"use client";

import { useEffect, useState } from "react";
import { Clock, LoaderCircle } from "lucide-react";
import { api, type Meeting } from "@/lib/api";
import { formatClock, formatDayLabel, formatMeetingCode, parseUtc } from "@/lib/utils";

export default function RecentMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getRecentMeetings()
      .then(setMeetings)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="overflow-hidden rounded-xl border border-line">
      <header className="border-b border-line bg-panel px-5 py-3">
        <h2 className="text-base font-semibold text-ink">Recent</h2>
      </header>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-muted">
          <LoaderCircle className="size-6 animate-spin" />
        </div>
      ) : error ? (
        <p className="flex h-32 items-center justify-center px-6 text-center text-sm text-danger">{error}</p>
      ) : meetings.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted">
          <Clock className="size-6" />
          <p className="text-sm">No recent meetings.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {meetings.map((m) => {
            const started = parseUtc(m.started_at ?? m.created_at);
            const ended = m.ended_at ? parseUtc(m.ended_at) : null;
            return (
              <li key={m.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-[120px] shrink-0">
                  <p className="text-sm font-medium text-ink">{formatDayLabel(started)}</p>
                  <p className="text-xs text-muted">
                    {formatClock(started)}
                    {ended && ` - ${formatClock(ended)}`}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{m.title}</p>
                  <p className="text-xs text-muted">Meeting ID: {formatMeetingCode(m.meeting_code)}</p>
                </div>
                <span className="rounded-full bg-panel px-2.5 py-1 text-xs text-muted">Ended</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

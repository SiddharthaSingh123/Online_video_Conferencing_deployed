"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import AppShell from "@/components/AppShell";
import ScheduleModal from "@/components/ScheduleModal";
import UpcomingMeetings from "@/components/UpcomingMeetings";
import RecentMeetings from "@/components/RecentMeetings";
import { api, type User } from "@/lib/api";

export default function MeetingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [upcomingRefreshKey, setUpcomingRefreshKey] = useState(0);

  useEffect(() => {
    api.getMe().then(setUser).catch(() => setUser(null));
  }, []);

  const openSchedule = () => setScheduleOpen(true);

  return (
    <AppShell user={user}>
      <div className="mx-auto flex max-w-[860px] flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink">Meetings</h1>
          <button className="btn-primary" onClick={openSchedule}>
            <CalendarDays className="size-4" /> Schedule a meeting
          </button>
        </div>

        <UpcomingMeetings
          hostName={user?.name ?? "Host"}
          refreshKey={upcomingRefreshKey}
          onSchedule={openSchedule}
        />
        <RecentMeetings />
      </div>

      {scheduleOpen && (
        <ScheduleModal
          onClose={() => setScheduleOpen(false)}
          onScheduled={() => setUpcomingRefreshKey((k) => k + 1)}
        />
      )}
    </AppShell>
  );
}

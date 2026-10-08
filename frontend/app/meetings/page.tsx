"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import AppShell from "@/components/AppShell";
import ScheduleModal from "@/components/ScheduleModal";
import UpcomingMeetings from "@/components/UpcomingMeetings";
import RecentMeetings from "@/components/RecentMeetings";
import { useAuth } from "@/lib/auth";

export default function MeetingsPage() {
  const { user } = useAuth();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [upcomingRefreshKey, setUpcomingRefreshKey] = useState(0);

  const openSchedule = () => setScheduleOpen(true);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-[860px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
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

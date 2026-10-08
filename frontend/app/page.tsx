"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, LoaderCircle, Plus, Video, type LucideIcon } from "lucide-react";
import AppShell from "@/components/AppShell";
import JoinModal from "@/components/JoinModal";
import Notice from "@/components/Notice";
import ScheduleModal from "@/components/ScheduleModal";
import UpcomingMeetings from "@/components/UpcomingMeetings";
import RecentMeetings from "@/components/RecentMeetings";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatClock, formatLongDate, markAsHost, saveDisplayName } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  // null until mounted, so the server-rendered HTML doesn't contain a stale time
  const [now, setNow] = useState<Date | null>(null);

  const [joinOpen, setJoinOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [upcomingRefreshKey, setUpcomingRefreshKey] = useState(0);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function handleNewMeeting() {
    setStarting(true);
    setStartError("");
    try {
      const meeting = await api.createInstantMeeting();
      markAsHost(meeting.meeting_code);
      saveDisplayName(user?.name ?? "Host");
      router.push(`/meeting/${meeting.meeting_code}`);
    } catch (err) {
      setStartError((err as Error).message);
      setStarting(false);
    }
  }

  const openJoin = () => setJoinOpen(true);
  const openSchedule = () => setScheduleOpen(true);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-[730px] flex-col items-center px-4 pb-10 pt-8 sm:px-6 sm:pt-10 lg:max-w-5xl">
        {/* Reads ?notice= from the URL; Next.js needs a Suspense boundary around that on a static page. */}
        <Suspense fallback={null}>
          <Notice />
        </Suspense>
        <h1 className="h-10 text-4xl font-bold tracking-tight text-ink sm:h-[60px] sm:text-5xl">
          {now ? formatClock(now) : ""}
        </h1>
        <p className="h-7 text-base text-muted sm:text-lg">{now ? formatLongDate(now) : ""}</p>

        {/* Mobile: 2 columns with the third tile centered underneath. From sm up: one row. */}
        <div className="mt-8 grid grid-cols-2 justify-items-center gap-x-10 gap-y-6 sm:flex sm:gap-12">
          <ActionTile
            label="New meeting"
            icon={starting ? LoaderCircle : Video}
            spin={starting}
            color="orange"
            onClick={handleNewMeeting}
            disabled={starting}
          />
          <ActionTile label="Join" icon={Plus} color="blue" onClick={openJoin} />
          <ActionTile
            label="Schedule"
            icon={CalendarDays}
            color="blue"
            onClick={openSchedule}
            className="col-span-2"
          />
        </div>
        {startError && <p className="mt-4 text-center text-sm text-danger">{startError}</p>}

        {/* Stacked below lg, side by side on desktop */}
        <div className="mt-10 grid w-full gap-6 lg:grid-cols-2 lg:items-start">
          <UpcomingMeetings
            hostName={user?.name ?? "Host"}
            refreshKey={upcomingRefreshKey}
            onSchedule={openSchedule}
          />
          <RecentMeetings />
        </div>
      </div>

      {joinOpen && <JoinModal defaultName={user?.name ?? ""} onClose={() => setJoinOpen(false)} />}
      {scheduleOpen && (
        <ScheduleModal
          onClose={() => setScheduleOpen(false)}
          onScheduled={() => setUpcomingRefreshKey((k) => k + 1)}
        />
      )}
    </AppShell>
  );
}

type ActionTileProps = {
  label: string;
  icon: LucideIcon;
  color: "orange" | "blue";
  onClick: () => void;
  disabled?: boolean;
  spin?: boolean;
  className?: string;
};

function ActionTile({ label, icon: Icon, color, onClick, disabled, spin, className = "" }: ActionTileProps) {
  const bg =
    color === "orange" ? "bg-zoom-orange hover:bg-zoom-orange-hover" : "bg-zoom-blue hover:bg-zoom-blue-hover";

  return (
    <button onClick={onClick} disabled={disabled} className={`group flex flex-col items-center gap-2.5 ${className}`}>
      <span
        className={`flex size-[70px] items-center justify-center rounded-[20px] text-white shadow-sm transition ${bg} group-disabled:opacity-80`}
      >
        <Icon className={`size-8 ${spin ? "animate-spin" : ""}`} strokeWidth={2} />
      </span>
      <span className="text-sm text-ink">{label}</span>
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, LoaderCircle, Plus, Video, type LucideIcon } from "lucide-react";
import AppShell from "@/components/AppShell";
import JoinModal from "@/components/JoinModal";
import ScheduleModal from "@/components/ScheduleModal";
import UpcomingMeetings from "@/components/UpcomingMeetings";
import RecentMeetings from "@/components/RecentMeetings";
import { api, type User } from "@/lib/api";
import { formatClock, formatLongDate, markAsHost, saveDisplayName } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  // null until mounted, so the server-rendered HTML doesn't contain a stale time
  const [now, setNow] = useState<Date | null>(null);

  const [joinOpen, setJoinOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [upcomingRefreshKey, setUpcomingRefreshKey] = useState(0);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    api.getMe().then(setUser).catch(() => setUser(null));
  }, []);

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
    <AppShell user={user}>
      <div className="mx-auto flex max-w-[730px] flex-col items-center px-6 pb-12 pt-10">
        <h1 className="h-[60px] text-5xl font-bold tracking-tight text-ink">{now ? formatClock(now) : ""}</h1>
        <p className="h-7 text-lg text-muted">{now ? formatLongDate(now) : ""}</p>

        <div className="mt-8 flex gap-12">
          <ActionTile
            label="New meeting"
            icon={starting ? LoaderCircle : Video}
            spin={starting}
            color="orange"
            onClick={handleNewMeeting}
            disabled={starting}
          />
          <ActionTile label="Join" icon={Plus} color="blue" onClick={openJoin} />
          <ActionTile label="Schedule" icon={CalendarDays} color="blue" onClick={openSchedule} />
        </div>
        {startError && <p className="mt-4 text-sm text-danger">{startError}</p>}

        <div className="mt-10 flex w-full flex-col gap-6">
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
};

function ActionTile({ label, icon: Icon, color, onClick, disabled, spin }: ActionTileProps) {
  const bg =
    color === "orange" ? "bg-zoom-orange hover:bg-zoom-orange-hover" : "bg-zoom-blue hover:bg-zoom-blue-hover";

  return (
    <button onClick={onClick} disabled={disabled} className="group flex flex-col items-center gap-2.5">
      <span
        className={`flex size-[70px] items-center justify-center rounded-[20px] text-white shadow-sm transition ${bg} group-disabled:opacity-80`}
      >
        <Icon className={`size-8 ${spin ? "animate-spin" : ""}`} strokeWidth={2} />
      </span>
      <span className="text-sm text-ink">{label}</span>
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, LoaderCircle, MicOff, ShieldCheck, UserPlus, Users, Video, VideoOff } from "lucide-react";
import CopyLinkButton from "@/components/CopyLinkButton";
import MeetingError from "@/components/MeetingError";
import MicLevelIcon from "@/components/MicLevelIcon";
import ParticipantsPanel from "@/components/ParticipantsPanel";
import VideoTile from "@/components/VideoTile";
import { api, ApiError, type JoinResult, type MeetingDetail, type Participant } from "@/lib/api";
import { useLocalMedia } from "@/lib/useLocalMedia";
import {
  clearMeetingSession,
  copyToClipboard,
  formatMeetingCode,
  isHostOf,
  loadMediaPrefs,
  loadParticipantId,
  saveParticipantId,
} from "@/lib/utils";

const POLL_INTERVAL_MS = 3000;

// 1 column on mobile, 2 on tablet, as many as fit on desktop. A lone tile stays one big centered tile.
function gridClass(count: number): string {
  if (count === 1) return "max-w-4xl grid-cols-1";
  return "max-w-7xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]";
}

export default function MeetingRoomPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [me, setMe] = useState<Participant | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const { stream, hasVideo, error: mediaError, stop: stopMedia } = useLocalMedia(micOn, videoOn);

  const [showParticipants, setShowParticipants] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [actionError, setActionError] = useState("");

  // React dev mode runs effects twice; this stops us from "starting" the meeting twice.
  const entered = useRef(false);
  // Set once I'm on my way out, so a late poll result can't redirect me a second time.
  const leavingRef = useRef(false);

  useEffect(() => {
    if (entered.current) return;
    entered.current = true;

    // Work out who "I" am in this meeting:
    // - came through the pre-join screen -> we saved our participant id
    // - host (New meeting / Start / Rejoin button) -> /start gives us the host's participant row
    // - neither -> go to the pre-join screen first
    const participantId = loadParticipantId(code);
    let entry: Promise<JoinResult | null>;
    if (participantId) {
      entry = api.getMeeting(code).then((m) => {
        const mine = m.participants.find((p) => p.id === participantId);
        return mine ? { meeting: m, participant: mine } : null;
      });
    } else if (isHostOf(code)) {
      entry = api.startMeeting(code);
    } else {
      router.replace(`/j/${code}`);
      return;
    }

    entry
      .then((result) => {
        if (!result) {
          // We already left this meeting earlier, so join again from the pre-join screen.
          clearMeetingSession(code);
          router.replace(`/j/${code}`);
          return;
        }
        saveParticipantId(code, result.participant.id); // so a page refresh keeps the same seat
        const prefs = loadMediaPrefs();
        // Start muted if I chose that on the pre-join screen or the host muted me earlier,
        // and make sure the server shows the same state to everyone else.
        const startMuted = !prefs.micOn || result.participant.is_muted;
        if (startMuted !== result.participant.is_muted) {
          api.setMuted(code, result.participant.id, startMuted).catch(() => {});
        }
        setMicOn(!startMuted);
        setVideoOn(prefs.videoOn);
        setMeeting(result.meeting);
        setMe(result.participant);
      })
      .catch((err: Error) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setLoadError(err.message);
      });
  }, [code, router]);

  // Poll every 3 seconds to pick up joins, leaves, mutes and removals (no websockets).
  useEffect(() => {
    if (!me) return;
    let cancelled = false; // ignores a slow response that arrives after this effect was replaced

    // Leave without calling the API: the host removed me or ended the meeting.
    const exit = (notice: "removed" | "ended") => {
      leavingRef.current = true;
      stopMedia();
      clearMeetingSession(code);
      router.replace(`/?notice=${notice}`);
    };

    const timer = setInterval(() => {
      api
        .getMeeting(code)
        .then((latest) => {
          if (cancelled || leavingRef.current) return;
          const mine = latest.participants.find((p) => p.id === me.id);
          // Removed people are left out of the list, so if I'm missing, the host removed me.
          if (!mine || mine.is_removed) {
            exit("removed");
            return;
          }
          // The server says I'm muted but my mic is on: the host muted me. (I can unmute again.)
          if (mine.is_muted && micOn) setMicOn(false);
          setMeeting(latest);
        })
        .catch((err: Error) => {
          if (cancelled || leavingRef.current) return;
          if (err instanceof ApiError && err.status === 404) exit("ended");
          // Any other error (e.g. a network blip): just try again on the next tick.
        });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [code, me, micOn, router, stopMedia]);

  // Mute/unmute myself and tell the server, so others see it and a host "mute all" can be undone.
  function toggleMic() {
    if (!me) return;
    const nextOn = !micOn;
    setMicOn(nextOn);
    api.setMuted(code, me.id, !nextOn).catch(() => setActionError("Couldn't update your mute status"));
  }

  async function handleInvite() {
    if (meeting && (await copyToClipboard(meeting.invite_link))) {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  }

  // Host ends the meeting for everyone (moves it to Recent); a participant just leaves.
  async function handleLeave() {
    if (!me) return;
    leavingRef.current = true;
    setLeaving(true);
    setActionError("");
    try {
      if (me.role === "host") await api.endMeeting(code);
      else await api.leaveMeeting(code, me.id);
      clearMeetingSession(code);
      router.push("/");
    } catch (err) {
      leavingRef.current = false;
      setActionError((err as Error).message);
      setLeaving(false);
    }
  }

  if (notFound) {
    return (
      <MeetingError
        title="Meeting not available"
        message="This meeting has ended or the link is invalid."
      />
    );
  }

  if (loadError) {
    return <MeetingError title="Something went wrong" message={loadError} />;
  }

  if (!meeting || !me) {
    return (
      <div className="flex h-dvh items-center justify-center bg-room text-white/70">
        <LoaderCircle className="size-8 animate-spin" />
      </div>
    );
  }

  const isHost = me.role === "host";
  // My own tile always comes first.
  const participants = [...meeting.participants].sort((a, b) =>
    a.id === me.id ? -1 : b.id === me.id ? 1 : 0
  );

  // Host controls. The responses contain the updated participant list.
  const muteAll = async () => setMeeting(await api.muteAll(code, me.id));
  const removeParticipant = async (participantId: number) =>
    setMeeting(await api.removeParticipant(code, participantId, me.id));

  return (
    <div className="flex h-dvh flex-col bg-room text-white">
      <header className="flex h-12 shrink-0 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <ShieldCheck className="size-4 shrink-0 text-green-500" />
        <h1 className="min-w-0 truncate text-sm font-semibold">{meeting.title}</h1>
        <span className="shrink-0 text-xs text-white/60">ID: {formatMeetingCode(meeting.meeting_code)}</span>
        <CopyLinkButton link={meeting.invite_link} tone="dark" />
      </header>

      {mediaError && (
        <p className="mx-3 mb-2 rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-200 sm:mx-4">{mediaError}</p>
      )}

      <div className="flex min-h-0 flex-1">
        <main className="flex flex-1 overflow-y-auto p-3 sm:p-4">
          {/* m-auto centers the grid, but unlike items-center it still scrolls from the top when the grid is taller than the screen */}
          <div className={`m-auto grid w-full gap-3 ${gridClass(participants.length)}`}>
            {participants.map((p) => {
              const isMe = p.id === me.id;
              return (
                <VideoTile
                  key={p.id}
                  name={p.display_name}
                  label={p.role === "host" ? "(Host)" : undefined}
                  stream={isMe ? stream : null}
                  showVideo={isMe && videoOn && hasVideo}
                  micOff={isMe ? !micOn : p.is_muted}
                />
              );
            })}
          </div>
        </main>

        {showParticipants && (
          <ParticipantsPanel
            participants={participants}
            myId={me.id}
            myMicOn={micOn}
            isHost={isHost}
            onMuteAll={muteAll}
            onRemove={removeParticipant}
            onClose={() => setShowParticipants(false)}
          />
        )}
      </div>

      <footer className="relative flex h-[72px] shrink-0 items-center justify-center gap-1 bg-toolbar px-2 sm:px-4 md:gap-2">
        {actionError && (
          <p className="absolute bottom-full left-1/2 mb-2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md bg-danger px-3 py-1.5 text-center text-sm">
            {actionError}
          </p>
        )}

        <ToolbarButton
          icon={micOn ? <MicLevelIcon stream={stream} /> : <MicOff className="size-5 text-danger" />}
          label={micOn ? "Mute" : "Unmute"}
          onClick={toggleMic}
        />
        <ToolbarButton
          icon={videoOn ? <Video className="size-5" /> : <VideoOff className="size-5 text-danger" />}
          label={videoOn ? "Stop Video" : "Start Video"}
          onClick={() => setVideoOn((v) => !v)}
        />
        <ToolbarButton
          icon={<Users className="size-5" />}
          label="Participants"
          badge={meeting.participants.length}
          active={showParticipants}
          onClick={() => setShowParticipants((open) => !open)}
        />
        <ToolbarButton
          icon={inviteCopied ? <Check className="size-5" /> : <UserPlus className="size-5" />}
          label={inviteCopied ? "Copied!" : "Invite"}
          onClick={handleInvite}
        />

        <button
          onClick={handleLeave}
          disabled={leaving}
          className="ml-2 flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-60 sm:ml-3 sm:px-5"
        >
          {leaving && <LoaderCircle className="size-4 animate-spin" />}
          {isHost ? "End" : "Leave"}
        </button>
      </footer>
    </div>
  );
}

type ToolbarButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: number;
};

function ToolbarButton({ icon, label, onClick, active, badge }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex min-h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-white/90 hover:bg-white/10 md:min-w-[72px] ${
        active ? "bg-white/10" : ""
      }`}
    >
      {icon}
      {/* Icon-only on mobile; the label stays readable by screen readers. */}
      <span className="sr-only text-[11px] md:not-sr-only md:whitespace-nowrap">{label}</span>
      {badge !== undefined && (
        <span className="absolute right-1.5 top-0.5 rounded-full bg-white/20 px-1.5 text-[10px] leading-4">
          {badge}
        </span>
      )}
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  LoaderCircle,
  Mic,
  MicOff,
  ShieldCheck,
  UserPlus,
  Users,
  Video,
  VideoOff,
  type LucideIcon,
} from "lucide-react";
import CopyLinkButton from "@/components/CopyLinkButton";
import MeetingError from "@/components/MeetingError";
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

// More people -> more columns. Fewer columns on small screens.
function gridClass(count: number): string {
  if (count === 1) return "max-w-4xl grid-cols-1";
  if (count === 2) return "max-w-6xl grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "max-w-5xl grid-cols-1 sm:grid-cols-2";
  if (count <= 9) return "max-w-6xl grid-cols-2 lg:grid-cols-3";
  return "max-w-7xl grid-cols-2 md:grid-cols-3 xl:grid-cols-4";
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
  const { stream, hasVideo } = useLocalMedia(micOn, videoOn);

  const [showParticipants, setShowParticipants] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [actionError, setActionError] = useState("");

  // React dev mode runs effects twice; this stops us from "starting" the meeting twice.
  const entered = useRef(false);

  useEffect(() => {
    if (entered.current) return;
    entered.current = true;

    // Work out who "I" am in this meeting:
    // - came through the pre-join screen -> we saved our participant id
    // - host (New meeting / Start button) -> /start gives us the host's participant row
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
        setMicOn(prefs.micOn);
        setVideoOn(prefs.videoOn);
        setMeeting(result.meeting);
        setMe(result.participant);
      })
      .catch((err: Error) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setLoadError(err.message);
      });
  }, [code, router]);

  // No polling: the participant list is re-fetched whenever the panel is opened.
  function toggleParticipants() {
    const opening = !showParticipants;
    setShowParticipants(opening);
    if (opening) {
      api
        .getMeeting(code)
        .then(setMeeting)
        .catch((err: Error) => {
          if (err instanceof ApiError && err.status === 404) setNotFound(true);
        });
    }
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
    setLeaving(true);
    setActionError("");
    try {
      if (me.role === "host") await api.endMeeting(code);
      else await api.leaveMeeting(code, me.id);
      clearMeetingSession(code);
      router.push("/");
    } catch (err) {
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
      <div className="flex h-screen items-center justify-center bg-room text-white/70">
        <LoaderCircle className="size-8 animate-spin" />
      </div>
    );
  }

  const isHost = me.role === "host";
  // My own tile always comes first.
  const participants = [...meeting.participants].sort((a, b) =>
    a.id === me.id ? -1 : b.id === me.id ? 1 : 0
  );

  return (
    <div className="flex h-screen flex-col bg-room text-white">
      <header className="flex h-12 shrink-0 items-center gap-3 px-4">
        <ShieldCheck className="size-4 shrink-0 text-green-500" />
        <h1 className="truncate text-sm font-semibold">{meeting.title}</h1>
        <span className="shrink-0 text-xs text-white/60">ID: {formatMeetingCode(meeting.meeting_code)}</span>
        <CopyLinkButton link={meeting.invite_link} tone="dark" />
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex flex-1 items-center justify-center overflow-y-auto p-4">
          <div className={`grid w-full gap-3 ${gridClass(participants.length)}`}>
            {participants.map((p) => {
              const isMe = p.id === me.id;
              return (
                <VideoTile
                  key={p.id}
                  name={p.display_name}
                  label={p.role === "host" ? "(Host)" : undefined}
                  stream={isMe ? stream : null}
                  showVideo={isMe && videoOn && hasVideo}
                  micOff={isMe && !micOn}
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
            onClose={() => setShowParticipants(false)}
          />
        )}
      </div>

      <footer className="relative flex h-[72px] shrink-0 items-center justify-center gap-1 bg-toolbar px-4">
        {actionError && (
          <p className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-danger px-3 py-1.5 text-sm">
            {actionError}
          </p>
        )}

        <ToolbarButton
          icon={micOn ? Mic : MicOff}
          label={micOn ? "Mute" : "Unmute"}
          warn={!micOn}
          onClick={() => setMicOn((v) => !v)}
        />
        <ToolbarButton
          icon={videoOn ? Video : VideoOff}
          label={videoOn ? "Stop Video" : "Start Video"}
          warn={!videoOn}
          onClick={() => setVideoOn((v) => !v)}
        />
        <ToolbarButton
          icon={Users}
          label="Participants"
          badge={meeting.participants.length}
          active={showParticipants}
          onClick={toggleParticipants}
        />
        <ToolbarButton
          icon={inviteCopied ? Check : UserPlus}
          label={inviteCopied ? "Copied!" : "Invite"}
          onClick={handleInvite}
        />

        <button
          onClick={handleLeave}
          disabled={leaving}
          className="ml-3 flex items-center gap-2 rounded-lg bg-danger px-5 py-2 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-60"
        >
          {leaving && <LoaderCircle className="size-4 animate-spin" />}
          {isHost ? "End" : "Leave"}
        </button>
      </footer>
    </div>
  );
}

type ToolbarButtonProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  warn?: boolean; // red icon, e.g. when muted
  badge?: number;
};

function ToolbarButton({ icon: Icon, label, onClick, active, warn, badge }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex min-w-[64px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-white/90 hover:bg-white/10 ${
        active ? "bg-white/10" : ""
      }`}
    >
      <Icon className={`size-5 ${warn ? "text-danger" : ""}`} />
      <span className="whitespace-nowrap text-[11px]">{label}</span>
      {badge !== undefined && (
        <span className="absolute right-1.5 top-0.5 rounded-full bg-white/20 px-1.5 text-[10px] leading-4">
          {badge}
        </span>
      )}
    </button>
  );
}

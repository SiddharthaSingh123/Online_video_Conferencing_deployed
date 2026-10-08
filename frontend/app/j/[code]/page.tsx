"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoaderCircle, Mic, MicOff, Video, VideoOff, type LucideIcon } from "lucide-react";
import Logo from "@/components/Logo";
import MeetingError from "@/components/MeetingError";
import VideoTile from "@/components/VideoTile";
import { api, ApiError, type MeetingDetail } from "@/lib/api";
import { useLocalMedia } from "@/lib/useLocalMedia";
import {
  formatMeetingCode,
  loadDisplayName,
  saveDisplayName,
  saveMediaPrefs,
  saveParticipantId,
} from "@/lib/utils";

export default function PreJoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const { stream, hasVideo, error: mediaError, waiting } = useLocalMedia(micOn, videoOn);

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    api
      .getMeeting(code)
      .then((m) => {
        setMeeting(m);
        // Prefill the name if it was entered earlier (Join modal or dashboard).
        setName(loadDisplayName() ?? "");
      })
      .catch((err: Error) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setLoadError(err.message);
      });
  }, [code]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const displayName = name.trim();
    setJoining(true);
    setJoinError("");
    try {
      const { participant } = await api.joinMeeting(code, displayName);
      saveDisplayName(displayName);
      saveParticipantId(code, participant.id);
      saveMediaPrefs({ micOn, videoOn });
      router.push(`/meeting/${code}`);
    } catch (err) {
      setJoinError((err as Error).message);
      setJoining(false);
    }
  }

  if (notFound) {
    return (
      <MeetingError
        title="Meeting not found"
        message="This meeting link is invalid or the meeting has already ended. Check the ID with the host."
      />
    );
  }

  if (loadError) {
    return <MeetingError title="Something went wrong" message={loadError} />;
  }

  if (!meeting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-muted">
        <LoaderCircle className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex h-14 items-center border-b border-line px-6">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="grid w-full max-w-5xl items-center gap-10 md:grid-cols-[3fr_2fr]">
          <div>
            <div className="relative">
              <VideoTile
                name={name.trim() || "You"}
                stream={stream}
                showVideo={videoOn && hasVideo}
                micOff={!micOn}
              />
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
                <MediaToggle
                  on={micOn}
                  onIcon={Mic}
                  offIcon={MicOff}
                  label={micOn ? "Mute" : "Unmute"}
                  onClick={() => setMicOn((v) => !v)}
                />
                <MediaToggle
                  on={videoOn}
                  onIcon={Video}
                  offIcon={VideoOff}
                  label={videoOn ? "Stop video" : "Start video"}
                  onClick={() => setVideoOn((v) => !v)}
                />
              </div>
            </div>
            {mediaError && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{mediaError}</p>
            )}
            {waiting && (
              <p className="mt-3 text-sm text-muted">Allow camera and microphone access when your browser asks.</p>
            )}
          </div>

          <form onSubmit={handleJoin} className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-semibold text-ink">{meeting.title}</h1>
              <p className="mt-1 text-sm text-muted">Meeting ID: {formatMeetingCode(meeting.meeting_code)}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-ink">
                Your name
              </label>
              <input
                id="name"
                className="input py-2.5"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {joinError && <p className="text-sm text-danger">{joinError}</p>}

            <button type="submit" className="btn-primary py-2.5" disabled={!name.trim() || joining}>
              {joining && <LoaderCircle className="size-4 animate-spin" />}
              Join
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

type MediaToggleProps = {
  on: boolean;
  onIcon: LucideIcon;
  offIcon: LucideIcon;
  label: string;
  onClick: () => void;
};

function MediaToggle({ on, onIcon: OnIcon, offIcon: OffIcon, label, onClick }: MediaToggleProps) {
  const Icon = on ? OnIcon : OffIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex size-12 items-center justify-center rounded-full text-white transition ${
        on ? "bg-white/20 hover:bg-white/30" : "bg-danger hover:bg-danger/90"
      }`}
    >
      <Icon className="size-5" />
    </button>
  );
}

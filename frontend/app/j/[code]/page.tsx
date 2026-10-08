"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AudioLines, LoaderCircle, MicOff, Video, VideoOff } from "lucide-react";
import Logo from "@/components/Logo";
import MeetingError from "@/components/MeetingError";
import MicLevelIcon from "@/components/MicLevelIcon";
import VideoTile from "@/components/VideoTile";
import { api, ApiError, type MeetingDetail } from "@/lib/api";
import { useLocalMedia } from "@/lib/useLocalMedia";
import { useMicTest, type MicTestStatus } from "@/lib/useMicTest";
import {
  formatMeetingCode,
  loadDisplayName,
  saveDisplayName,
  saveMediaPrefs,
  saveParticipantId,
} from "@/lib/utils";

const MIC_TEST_LABELS: Record<MicTestStatus, string> = {
  idle: "Test mic",
  recording: "Recording… speak now",
  playing: "Playing back…",
};

export default function PreJoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const { stream, hasVideo, hasAudio, error: mediaError, waiting } = useLocalMedia(micOn, videoOn);
  const micTest = useMicTest(stream);

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
      <header className="flex h-14 items-center border-b border-line px-4 sm:px-6">
        <Logo />
      </header>

      {/* Stacked on small screens (video on top, form below), side by side from md up */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="grid w-full max-w-5xl items-center gap-6 md:grid-cols-[3fr_2fr] md:gap-10">
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
                  icon={micOn ? <MicLevelIcon stream={stream} /> : <MicOff className="size-5" />}
                  label={micOn ? "Mute" : "Unmute"}
                  onClick={() => setMicOn((v) => !v)}
                />
                <MediaToggle
                  on={videoOn}
                  icon={videoOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
                  label={videoOn ? "Stop video" : "Start video"}
                  onClick={() => setVideoOn((v) => !v)}
                />
              </div>
            </div>
            {hasAudio && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <button type="button" className="btn-secondary py-1.5" onClick={micTest.start} disabled={!micOn}>
                  <AudioLines
                    className={`size-4 ${micTest.status !== "idle" ? "animate-pulse text-zoom-blue" : ""}`}
                  />
                  {MIC_TEST_LABELS[micTest.status]}
                </button>
                {micTest.status === "idle" && (
                  <span className="text-xs text-muted">
                    {micOn ? "Records 3 seconds, then plays it back." : "Unmute your mic to test it."}
                  </span>
                )}
              </div>
            )}
            {mediaError && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{mediaError}</p>
            )}
            {waiting && (
              <p className="mt-3 text-sm text-muted">Allow camera and microphone access when your browser asks.</p>
            )}
          </div>

          <form onSubmit={handleJoin} className="flex flex-col gap-5">
            <div>
              <h1 className="break-words text-2xl font-semibold text-ink">{meeting.title}</h1>
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
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

function MediaToggle({ on, icon, label, onClick }: MediaToggleProps) {
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
      {icon}
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

export type MicTestStatus = "idle" | "recording" | "playing";

const TEST_SECONDS = 3;

// "Test mic": records a few seconds from the microphone, then plays it back.
// (Playing the mic live would echo through the speakers, so we record first.)
export function useMicTest(stream: MediaStream | null) {
  const [status, setStatus] = useState<MicTestStatus>("idle");
  // Cancels a test that is still running, e.g. if the user clicks Join mid-test.
  const cancelTest = useRef<() => void>(() => {});

  useEffect(() => () => cancelTest.current(), []);

  function start() {
    const track = stream?.getAudioTracks()[0];
    if (!track || status !== "idle") return;

    const recorder = new MediaRecorder(new MediaStream([track]));
    const chunks: Blob[] = [];
    const playback = new Audio();
    let cancelled = false;

    const finish = () => {
      URL.revokeObjectURL(playback.src);
      setStatus("idle");
    };

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      if (cancelled) return;
      playback.src = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
      playback.onended = finish;
      setStatus("playing");
      playback.play().catch(finish);
    };

    const timer = setTimeout(() => recorder.stop(), TEST_SECONDS * 1000);
    cancelTest.current = () => {
      cancelled = true;
      clearTimeout(timer);
      if (recorder.state !== "inactive") recorder.stop();
      playback.pause();
    };

    recorder.start();
    setStatus("recording");
  }

  return { status, start };
}

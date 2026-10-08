"use client";

import { useEffect, useState } from "react";

type MediaResult = { stream: MediaStream | null; error: string | null };

function stopTracks(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

// Turns a getUserMedia error name into a message the user can act on.
function explain(device: string, errorName: string): string {
  switch (errorName) {
    case "NotAllowedError":
    case "SecurityError":
      return `Can't use your ${device}: access is blocked for this site. Allow it from the icon in the address bar, then reload the page.`;
    case "NotReadableError":
    case "AbortError":
      return `Can't use your ${device}: another app (like Zoom or Teams) is using it. Close that app, then reload the page.`;
    case "NotFoundError":
    case "OverconstrainedError":
      return `Can't use your ${device}: none was found on this device.`;
    default:
      return `Can't use your ${device}: this browser doesn't allow it here. Open the app in Chrome, Edge or Firefox.`;
  }
}

// Never throws: returns whatever could be opened, plus a message if something failed.
async function requestMedia(): Promise<MediaResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { stream: null, error: explain("camera or microphone", "NotSupportedError") };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    return { stream, error: null };
  } catch (err) {
    const errorName = (err as Error).name;
    if (errorName === "NotAllowedError" || errorName === "SecurityError") {
      return { stream: null, error: explain("camera or microphone", errorName) };
    }

    // One device may still work on its own (e.g. the camera is busy but the mic is free).
    const fallbacks = [
      { constraints: { audio: true }, missing: "camera" },
      { constraints: { video: true }, missing: "microphone" },
    ];
    for (const { constraints, missing } of fallbacks) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return { stream, error: explain(missing, errorName) };
      } catch {
        // try the next device
      }
    }
    return { stream: null, error: explain("camera or microphone", errorName) };
  }
}

// Asks for camera + mic once, then mutes/unmutes the tracks as the toggles change.
export function useLocalMedia(micOn: boolean, videoOn: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // `cancelled` covers the page closing before the browser answers.
    let cancelled = false;
    let acquired: MediaStream | null = null;

    requestMedia().then((result) => {
      if (cancelled) {
        if (result.stream) stopTracks(result.stream);
        return;
      }
      acquired = result.stream;
      setStream(result.stream);
      setError(result.error);
    });

    return () => {
      cancelled = true;
      if (acquired) stopTracks(acquired);
    };
  }, []);

  useEffect(() => {
    stream?.getAudioTracks().forEach((track) => (track.enabled = micOn));
  }, [stream, micOn]);

  useEffect(() => {
    stream?.getVideoTracks().forEach((track) => (track.enabled = videoOn));
  }, [stream, videoOn]);

  const hasVideo = (stream?.getVideoTracks().length ?? 0) > 0;
  const hasAudio = (stream?.getAudioTracks().length ?? 0) > 0;
  // Still waiting for the browser's permission prompt to be answered.
  const waiting = stream === null && error === null;
  return { stream, hasVideo, hasAudio, error, waiting };
}

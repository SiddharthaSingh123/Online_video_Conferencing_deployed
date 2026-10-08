"use client";

import { useEffect, useState } from "react";

function stopTracks(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

async function requestMedia(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("unsupported");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err) {
    if ((err as Error).name === "NotAllowedError") throw err;
    // e.g. a computer with no camera: fall back to whichever single device exists
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true });
    } catch {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  }
}

// Asks for camera + mic once, then mutes/unmutes the tracks as the toggles change.
// If permission is denied, `stream` stays null and `error` explains why.
export function useLocalMedia(micOn: boolean, videoOn: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // `cancelled` covers the case where the page unmounts before permission is granted.
    let cancelled = false;
    let acquired: MediaStream | null = null;

    requestMedia()
      .then((s) => {
        if (cancelled) {
          stopTracks(s);
          return;
        }
        acquired = s;
        setStream(s);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(
          err.name === "NotAllowedError"
            ? "Camera and microphone access is blocked. You can still join without them."
            : "No camera or microphone found."
        );
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
  return { stream, hasVideo, error };
}

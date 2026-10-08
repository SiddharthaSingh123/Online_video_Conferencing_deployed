"use client";

import { useEffect, useState } from "react";

// How loud the microphone is right now: 0 (silent) to 1 (loud), in steps of 0.1.
export function useMicLevel(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const track = stream?.getAudioTracks()[0];
    if (!track) return;

    // The analyser lets us read the raw sound wave coming from the mic.
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    audioContext.createMediaStreamSource(new MediaStream([track])).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let frame = 0;

    const measure = () => {
      analyser.getByteTimeDomainData(samples);
      // Silence is 128; the further the samples swing from it, the louder the sound.
      let peak = 0;
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128));
      // Ignore faint background noise; a swing of 40 counts as full volume.
      const loudness = Math.min(1, Math.max(0, peak - 3) / 40);
      // Rounded to 10 steps so React only re-renders when the meter visibly changes.
      setLevel(Math.round(loudness * 10) / 10);
      frame = requestAnimationFrame(measure);
    };
    measure();

    // Browsers keep audio paused until the user has clicked or typed on the page.
    const resume = () => audioContext.resume();
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      audioContext.close();
    };
  }, [stream]);

  return level;
}

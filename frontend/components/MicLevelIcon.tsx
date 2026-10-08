"use client";

import { Mic } from "lucide-react";
import { useMicLevel } from "@/lib/useMicLevel";

// Mic icon that fills green from the bottom while you speak, like Zoom's toolbar.
// A green copy of the icon sits on top and is cut off above the current level.
export default function MicLevelIcon({ stream }: { stream: MediaStream | null }) {
  const level = useMicLevel(stream);

  return (
    <span className="relative inline-block size-5">
      <Mic className="size-full" />
      <Mic
        aria-hidden
        className="absolute inset-0 size-full text-green-500"
        style={{ clipPath: `inset(${(1 - level) * 100}% 0 0 0)` }}
      />
    </span>
  );
}

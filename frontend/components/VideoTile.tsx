"use client";

import { useEffect, useRef } from "react";
import { MicOff } from "lucide-react";
import { avatarColor, getInitials } from "@/lib/utils";

type VideoTileProps = {
  name: string;
  label?: string; // extra text after the name, e.g. "(Host)"
  stream?: MediaStream | null;
  showVideo?: boolean;
  micOff?: boolean;
  // true for local tile (no echo); false/omitted for remote tiles so we hear them
  muted?: boolean;
};

// One participant square: live camera if available, otherwise an initials avatar.
export default function VideoTile({ name, label, stream, showVideo = false, micOff = false, muted = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoVisible = showVideo && !!stream;

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream ?? null;
  }, [stream, videoVisible]);

  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-[#2b2b2b]">
      {videoVisible ? (
        // Local tile is muted (no echo). Remote tiles play audio so you can hear others.
        // Local tile is mirrored so it looks like a mirror.
        <video ref={videoRef} autoPlay playsInline muted={muted} className={`h-full w-full object-cover ${muted ? "-scale-x-100" : ""}`} />
      ) : (
        <div
          className="flex size-20 items-center justify-center rounded-full text-2xl font-semibold text-white"
          style={{ backgroundColor: avatarColor(name) }}
        >
          {getInitials(name) || "?"}
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex max-w-[85%] items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
        {micOff && <MicOff className="size-3.5 shrink-0 text-danger" />}
        <span className="truncate">
          {name}
          {label && <span className="text-white/70"> {label}</span>}
        </span>
      </div>
    </div>
  );
}

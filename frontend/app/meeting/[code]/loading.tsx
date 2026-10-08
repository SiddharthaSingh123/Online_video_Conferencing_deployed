import { LoaderCircle } from "lucide-react";

// Shown by Next.js while the meeting room page loads.
export default function Loading() {
  return (
    <div className="flex h-dvh items-center justify-center bg-room text-white/70">
      <LoaderCircle className="size-8 animate-spin" />
    </div>
  );
}

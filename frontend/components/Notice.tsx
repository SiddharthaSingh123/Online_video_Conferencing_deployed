"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Info, X } from "lucide-react";

// Messages the meeting room can send back to the dashboard as /?notice=<key>.
const NOTICES = new Map([
  ["removed", "You were removed by the host"],
  ["ended", "The host ended the meeting"],
]);

export default function Notice() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const message = NOTICES.get(searchParams.get("notice") ?? "");
  if (!message) return null;

  return (
    <div
      role="status"
      className="mb-6 flex w-full items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 py-1 pl-4 pr-1 text-sm text-amber-900"
    >
      <Info className="size-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        onClick={() => router.replace("/")}
        aria-label="Dismiss"
        className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-amber-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

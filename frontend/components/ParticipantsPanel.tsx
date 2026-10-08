"use client";

import { useState } from "react";
import { LoaderCircle, Mic, MicOff, X } from "lucide-react";
import type { Participant } from "@/lib/api";
import { avatarColor, getInitials } from "@/lib/utils";

type ParticipantsPanelProps = {
  participants: Participant[];
  myId: number;
  myMicOn: boolean;
  isHost: boolean;
  onMuteAll: () => Promise<void>;
  onRemove: (participantId: number) => Promise<void>;
  onClose: () => void;
};

export default function ParticipantsPanel({
  participants,
  myId,
  myMicOn,
  isHost,
  onMuteAll,
  onRemove,
  onClose,
}: ParticipantsPanelProps) {
  // The participant whose "Remove?" confirmation is showing, if any.
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      setConfirmingId(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    // Full-screen overlay below lg; a side panel next to the video grid on desktop.
    <aside className="fixed inset-0 z-40 flex flex-col bg-toolbar lg:static lg:z-auto lg:w-80 lg:shrink-0 lg:border-l lg:border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 py-1 pl-4 pr-1">
        <h2 className="text-sm font-semibold">Participants ({participants.length})</h2>
        <button
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Close participants"
        >
          <X className="size-5" />
        </button>
      </div>

      {isHost && (
        <div className="border-b border-white/10 p-3">
          <button
            onClick={() => run(onMuteAll)}
            disabled={busy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white/10 text-sm font-medium hover:bg-white/15 disabled:opacity-60"
          >
            <MicOff className="size-4" />
            Mute all
          </button>
        </div>
      )}

      {error && <p className="mx-3 mt-3 rounded-md bg-danger/20 px-3 py-2 text-sm text-red-200">{error}</p>}

      <ul className="flex-1 overflow-y-auto py-2">
        {participants.map((p) => {
          const isMe = p.id === myId;
          // My own mic state is known locally; everyone else's comes from the server.
          const muted = isMe ? !myMicOn : p.is_muted;
          const tags = [p.role === "host" ? "Host" : null, isMe ? "me" : null].filter(Boolean);
          const confirming = confirmingId === p.id;

          return (
            <li key={p.id} className="flex min-h-14 items-center gap-3 px-4 py-1.5 hover:bg-white/5">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ backgroundColor: avatarColor(p.display_name) }}
              >
                {getInitials(p.display_name)}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm">
                {confirming ? (
                  `Remove ${p.display_name}?`
                ) : (
                  <>
                    {p.display_name}
                    {tags.length > 0 && <span className="text-white/60"> ({tags.join(", ")})</span>}
                  </>
                )}
              </span>

              {!confirming &&
                (muted ? (
                  <MicOff className="size-4 shrink-0 text-danger" aria-label="Muted" />
                ) : (
                  <Mic className="size-4 shrink-0 text-white/60" aria-label="Unmuted" />
                ))}

              {isHost && p.role !== "host" &&
                (confirming ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="min-h-11 min-w-11 rounded-md px-2 text-xs text-white/70 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => run(() => onRemove(p.id))}
                      disabled={busy}
                      className="flex min-h-11 items-center gap-1 rounded-md bg-danger px-3 text-xs font-semibold hover:bg-danger/90 disabled:opacity-60"
                    >
                      {busy && <LoaderCircle className="size-3 animate-spin" />}
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingId(p.id)}
                    aria-label={`Remove ${p.display_name}`}
                    className="min-h-11 shrink-0 rounded-md px-3 text-xs text-white/80 hover:bg-white/10"
                  >
                    Remove
                  </button>
                ))}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

import { MicOff, X } from "lucide-react";
import type { Participant } from "@/lib/api";
import { avatarColor, getInitials } from "@/lib/utils";

type ParticipantsPanelProps = {
  participants: Participant[];
  myId: number;
  myMicOn: boolean;
  onClose: () => void;
};

export default function ParticipantsPanel({ participants, myId, myMicOn, onClose }: ParticipantsPanelProps) {
  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-toolbar">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold">Participants ({participants.length})</h2>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Close participants"
        >
          <X className="size-4" />
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto py-2">
        {participants.map((p) => {
          const tags = [p.role === "host" ? "Host" : null, p.id === myId ? "me" : null].filter(Boolean);
          return (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2 hover:bg-white/5">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ backgroundColor: avatarColor(p.display_name) }}
              >
                {getInitials(p.display_name)}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm">
                {p.display_name}
                {tags.length > 0 && <span className="text-white/60"> ({tags.join(", ")})</span>}
              </span>
              {p.id === myId && !myMicOn && <MicOff className="size-4 text-danger" />}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

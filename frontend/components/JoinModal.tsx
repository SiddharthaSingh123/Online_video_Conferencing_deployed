"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import Modal from "@/components/Modal";
import { api, ApiError } from "@/lib/api";
import { extractMeetingCode, saveDisplayName } from "@/lib/utils";

type JoinModalProps = {
  defaultName: string;
  onClose: () => void;
};

export default function JoinModal({ defaultName, onClose }: JoinModalProps) {
  // Rendered only while open, so state starts fresh every time it opens.
  const router = useRouter();
  const [meetingInput, setMeetingInput] = useState("");
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = meetingInput.trim() !== "" && name.trim() !== "" && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const code = extractMeetingCode(meetingInput);
    if (!code) {
      setError("Meeting not found");
      return;
    }

    setLoading(true);
    try {
      await api.getMeeting(code);
      saveDisplayName(name.trim());
      router.push(`/j/${code}`);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "Meeting not found" : (err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Modal title="Join meeting" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="meeting-id" className="text-sm font-medium text-ink">
            Meeting ID or invite link
          </label>
          <input
            id="meeting-id"
            className="input"
            placeholder="e.g. 123 4567 890"
            value={meetingInput}
            onChange={(e) => setMeetingInput(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="display-name" className="text-sm font-medium text-ink">
            Your name
          </label>
          <input
            id="display-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {loading && <LoaderCircle className="size-4 animate-spin" />}
            Join
          </button>
        </div>
      </form>
    </Modal>
  );
}

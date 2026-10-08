"use client";

import { useState } from "react";
import { Check, Copy, LoaderCircle } from "lucide-react";
import Modal from "@/components/Modal";
import { api, type Meeting } from "@/lib/api";
import {
  copyToClipboard,
  formatMeetingCode,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/utils";

const DURATIONS = [15, 30, 40, 60, 90, 120];

type ScheduleModalProps = {
  onClose: () => void;
  onScheduled: () => void;
};

// Default start: the next full half hour from now.
function nextHalfHour(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

export default function ScheduleModal({ onClose, onScheduled }: ScheduleModalProps) {
  // Rendered only while open, so state starts fresh every time it opens.
  const [defaultStart] = useState(nextHalfHour);
  const [title, setTitle] = useState("My Meeting");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => toDateInputValue(defaultStart));
  const [time, setTime] = useState(() => toTimeInputValue(defaultStart));
  const [duration, setDuration] = useState(40);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<Meeting | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = title.trim() !== "" && date !== "" && time !== "" && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // "YYYY-MM-DDTHH:MM" without a timezone is parsed as local time; toISOString converts to UTC.
    const start = new Date(`${date}T${time}`);
    if (start.getTime() <= Date.now()) {
      setError("Please pick a time in the future");
      return;
    }

    setLoading(true);
    try {
      const meeting = await api.createScheduledMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_start: start.toISOString(),
        duration_minutes: duration,
      });
      setCreated(meeting);
      onScheduled();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!created) return;
    const ok = await copyToClipboard(created.invite_link);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (created) {
    return (
      <Modal title="Meeting scheduled" onClose={onClose}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-800">
            <Check className="size-4" />
            <span>
              <strong>{created.title}</strong> has been scheduled.
            </span>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Meeting ID</p>
            <p className="mt-1 text-lg font-semibold text-ink">{formatMeetingCode(created.meeting_code)}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Invite link</p>
            <div className="mt-1 flex gap-2">
              <input className="input" value={created.invite_link} readOnly />
              <button className="btn-secondary shrink-0" onClick={handleCopy}>
                {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Schedule meeting" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium text-ink">
            Topic
          </label>
          <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-ink">
            Description <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="description"
            className="input resize-none"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="date" className="text-sm font-medium text-ink">
              Date
            </label>
            <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="time" className="text-sm font-medium text-ink">
              Time
            </label>
            <input id="time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="duration" className="text-sm font-medium text-ink">
            Duration
          </label>
          <select
            id="duration"
            className="input"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} minutes
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {loading && <LoaderCircle className="size-4 animate-spin" />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

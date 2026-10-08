import Link from "next/link";
import { CircleAlert } from "lucide-react";

type MeetingErrorProps = { title: string; message: string };

// Friendly full-page error used when a meeting link is invalid or the meeting has ended.
export default function MeetingError({ title, message }: MeetingErrorProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center">
      <div className="mb-2 flex size-16 items-center justify-center rounded-full bg-panel">
        <CircleAlert className="size-8 text-muted" />
      </div>
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      <Link href="/" className="btn-primary mt-3">
        Back to home
      </Link>
    </div>
  );
}

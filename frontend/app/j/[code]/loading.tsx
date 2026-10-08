import { LoaderCircle } from "lucide-react";

// Next.js wraps the page in <Suspense> with this as the fallback. Needed because the
// page reads the meeting code from the URL, which is only known at request time.
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-muted">
      <LoaderCircle className="size-8 animate-spin" />
    </div>
  );
}

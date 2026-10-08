import { LoaderCircle } from "lucide-react";

// Shown by Next.js while the pre-join page loads.
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-muted">
      <LoaderCircle className="size-8 animate-spin" />
    </div>
  );
}

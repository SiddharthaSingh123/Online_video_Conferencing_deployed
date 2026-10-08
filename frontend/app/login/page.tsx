"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import Notice from "@/components/Notice";
import { useAuth } from "@/lib/auth";

// The seeded demo account (see backend/seed.py), shown so anyone can try the app.
const DEMO_EMAIL = "siddhartha@gmail.com";
const DEMO_PASSWORD = "123456";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Sign in to start, schedule and manage your meetings."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="inline-flex min-h-11 items-center font-medium text-zoom-blue hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {/* e.g. "You were removed by the host" for a guest who isn't logged in */}
      <Suspense fallback={null}>
        <Notice />
      </Suspense>

      <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-line bg-panel py-1 pl-3 pr-1 text-sm">
        <p className="min-w-0 text-muted">
          Demo account: <span className="font-medium text-ink">{DEMO_EMAIL}</span> /{" "}
          <span className="font-medium text-ink">{DEMO_PASSWORD}</span>
        </p>
        <button
          type="button"
          onClick={() => {
            setEmail(DEMO_EMAIL);
            setPassword(DEMO_PASSWORD);
          }}
          className="min-h-11 shrink-0 rounded-md px-2 font-medium text-zoom-blue hover:bg-white"
        >
          Use demo account
        </button>
      </div>

      {/* noValidate: we show our own inline messages instead of the browser's popups */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-ink">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={!email.trim() || !password || loading}>
          {loading && <LoaderCircle className="size-4 animate-spin" />}
          Sign in
        </button>
      </form>
    </AuthLayout>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isValidEmail } from "@/lib/utils";

type FieldErrors = { name?: string; email?: string; password?: string };

// Same rules as the backend, checked here first so mistakes show up next to the field.
function validate(name: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = "Please enter your name";
  if (!isValidEmail(email)) errors.email = "Please enter a valid email address";
  if (password.length < 6) errors.password = "Password must be at least 6 characters";
  return errors;
}

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const errors = validate(name, email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await signup(name, email, password);
      router.push("/");
    } catch (err) {
      // "Email already used" belongs next to the email field; anything else goes below the form.
      if (err instanceof ApiError && err.status === 409) setFieldErrors({ email: err.message });
      else setError((err as Error).message);
      setLoading(false);
    }
  }

  const inputClass = (invalid: boolean) => `input ${invalid ? "border-danger" : ""}`;

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Optional: without an account you use the shared default one."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-zoom-blue hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {/* noValidate: we show our own inline messages instead of the browser's popups */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field id="name" label="Full name" error={fieldErrors.name}>
          <input
            id="name"
            autoComplete="name"
            className={inputClass(!!fieldErrors.name)}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Field>

        <Field id="email" label="Email address" error={fieldErrors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={inputClass(!!fieldErrors.email)}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field id="password" label="Password" error={fieldErrors.password} hint="At least 6 characters">
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className={inputClass(!!fieldErrors.password)}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading && <LoaderCircle className="size-4 animate-spin" />}
          Sign up
        </button>
      </form>
    </AuthLayout>
  );
}

type FieldProps = { id: string; label: string; error?: string; hint?: string; children: React.ReactNode };

// Label, input, then either the field's error (red) or an optional hint below it.
function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

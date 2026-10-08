import Link from "next/link";
import Logo from "@/components/Logo";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

// Shared frame for the login and signup pages, in the style of Zoom's sign-in page.
export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="flex h-14 shrink-0 items-center border-b border-line px-4 sm:px-6">
        <Logo />
      </header>

      <main className="flex flex-1 justify-center px-4 py-10 sm:items-center sm:py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>

          <div className="mt-6">{children}</div>

          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
          {/* Accounts are optional: the app works logged out as the default user. */}
          <div className="mt-1 text-center">
            <Link href="/" className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink hover:underline">
              Continue without an account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

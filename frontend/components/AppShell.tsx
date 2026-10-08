"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Contact,
  House,
  MessageSquare,
  Phone,
  Search,
  Settings,
  Video,
  type LucideIcon,
} from "lucide-react";
import Logo from "@/components/Logo";
import type { User } from "@/lib/api";
import { getInitials } from "@/lib/utils";

type NavItem = { label: string; icon: LucideIcon; href?: string };

// Only Home and Meetings are real pages; the rest are visual placeholders.
const NAV_ITEMS: NavItem[] = [
  { label: "Home", icon: House, href: "/" },
  { label: "Meetings", icon: Video, href: "/meetings" },
  { label: "Team Chat", icon: MessageSquare },
  { label: "Phone", icon: Phone },
  { label: "Calendar", icon: CalendarDays },
  { label: "Contacts", icon: Contact },
];

export default function AppShell({ user, children }: { user: User | null; children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-shell">
      <TopNav user={user} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="mb-2 mr-2 flex-1 overflow-y-auto rounded-xl bg-white">{children}</main>
      </div>
    </div>
  );
}

function TopNav({ user }: { user: User | null }) {
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-4 px-4">
      <Logo />

      <div className="flex flex-1 items-center justify-center gap-3">
        <ChevronLeft className="size-5 text-muted" />
        <ChevronRight className="size-5 text-muted/50" />
        <label className="flex h-9 w-full max-w-[550px] items-center gap-2 rounded-lg bg-[#dfe1e6] px-3 text-sm text-muted">
          <Search className="size-4" />
          <input
            className="w-full bg-transparent text-ink outline-none placeholder:text-muted"
            placeholder="Search (Ctrl+E)"
          />
        </label>
      </div>

      <div className="flex items-center gap-4">
        <Bell className="size-5 text-ink" />
        <Settings className="size-5 text-ink" />
        <div
          className="flex size-8 items-center justify-center rounded-lg text-xs font-semibold text-white"
          style={{ backgroundColor: user?.avatar_color ?? "#747487" }}
          title={user?.name}
        >
          {user ? getInitials(user.name) : ""}
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-[104px] shrink-0 flex-col items-center gap-1 px-2 pb-4">
      {NAV_ITEMS.map((item) => {
        const active = item.href === pathname;
        const content = (
          <>
            <item.icon className="size-5" strokeWidth={1.75} />
            <span className="text-xs">{item.label}</span>
          </>
        );
        const className = `flex w-full flex-col items-center gap-1.5 rounded-xl py-3 text-ink ${
          active ? "bg-white shadow-sm" : "hover:bg-black/5"
        }`;

        return item.href ? (
          <Link key={item.label} href={item.href} className={className}>
            {content}
          </Link>
        ) : (
          <div key={item.label} className={`${className} cursor-default opacity-80`}>
            {content}
          </div>
        );
      })}

      <div className="mt-auto flex w-full flex-col items-center gap-1.5 py-3 text-ink opacity-80">
        <Settings className="size-5" strokeWidth={1.75} />
        <span className="text-xs">Settings</span>
      </div>
    </nav>
  );
}

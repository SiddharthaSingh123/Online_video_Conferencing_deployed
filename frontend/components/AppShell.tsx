"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Contact,
  House,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquare,
  Phone,
  Search,
  Settings,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth";
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

// Frame for the logged-in pages (dashboard, meetings). Logged-out visitors go to /login.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  // Below lg the sidebar is hidden and slides in as a drawer from the hamburger button.
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    // Keep ?notice=... (e.g. "You were removed by the host") so the login page can show it.
    if (status === "loggedOut") router.replace(`/login${window.location.search}`);
  }, [status, router]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  if (status !== "loggedIn") {
    return (
      <div className="flex h-dvh items-center justify-center bg-shell text-muted">
        <LoaderCircle className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-shell">
      <TopNav onMenuClick={() => setDrawerOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[104px] shrink-0 lg:flex">
          <SidebarNav />
        </div>
        <main className="mx-2 mb-2 flex-1 overflow-y-auto rounded-xl bg-white lg:ml-0">{children}</main>
      </div>

      {/* Drawer (below lg). While closed it is moved off-screen and `inert` keeps it out of keyboard focus. */}
      <div className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? "" : "pointer-events-none"}`} inert={!drawerOpen}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 flex w-[104px] flex-col bg-shell pt-2 shadow-xl transition-transform ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="mx-auto flex size-11 items-center justify-center rounded-lg text-ink hover:bg-black/5"
          >
            <X className="size-5" />
          </button>
          <SidebarNav onNavigate={() => setDrawerOpen(false)} />
        </div>
      </div>
    </div>
  );
}

function TopNav({ onMenuClick }: { onMenuClick: () => void }) {
  // On mobile the search box collapses to an icon that opens it on its own row.
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="flex h-[52px] shrink-0 items-center gap-2 px-2 sm:gap-4 sm:px-4">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-black/5 lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <Logo />

        <div className="hidden flex-1 items-center justify-center gap-3 sm:flex">
          <ChevronLeft className="hidden size-5 text-muted lg:block" />
          <ChevronRight className="hidden size-5 text-muted/50 lg:block" />
          <SearchBox />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
          <button
            onClick={() => setSearchOpen((open) => !open)}
            aria-label="Search"
            aria-expanded={searchOpen}
            className="flex size-11 items-center justify-center rounded-lg text-ink hover:bg-black/5 sm:hidden"
          >
            <Search className="size-5" />
          </button>
          <Bell className="size-5 text-ink" />
          <Settings className="size-5 text-ink" />
          <ProfileMenu />
        </div>
      </header>

      {searchOpen && (
        <div className="px-2 pb-2 sm:hidden">
          <SearchBox autoFocus />
        </div>
      )}
    </>
  );
}

// Avatar button with a dropdown showing who is logged in and a Log out button.
function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking anywhere outside the menu or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass = "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm text-ink hover:bg-panel";

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-11 items-center justify-center rounded-lg hover:bg-black/5"
      >
        <span
          className="flex size-8 items-center justify-center rounded-lg text-xs font-semibold text-white"
          style={{ backgroundColor: user?.avatar_color ?? "#747487" }}
        >
          {user ? getInitials(user.name) : ""}
        </span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-64 rounded-xl border border-line bg-white p-2 shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <button role="menuitem" onClick={logout} className={itemClass}>
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  return (
    <label className="flex h-11 w-full max-w-[550px] items-center gap-2 rounded-lg bg-[#dfe1e6] px-3 text-muted">
      <Search className="size-4 shrink-0" />
      <input
        autoFocus={autoFocus}
        className="w-full bg-transparent text-base text-ink outline-none placeholder:text-muted"
        placeholder="Search (Ctrl+E)"
      />
    </label>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col items-center gap-1 px-2 pb-4">
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
          <Link key={item.label} href={item.href} className={className} onClick={onNavigate}>
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

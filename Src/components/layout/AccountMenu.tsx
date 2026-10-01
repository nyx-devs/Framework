"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/auth/actions";

export type AccountUser = {
  name: string;
  email: string;
  role: string;
  initials: string;
  avatarUrl?: string | null;
  rankLabel?: string | null;
  roleLabel?: string | null;
  robloxUsername?: string | null;
  discordUsername?: string | null;
};

function roleLabelFromRole(role: string): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "staff":
      return "Staff";
    default:
      return "Member";
  }
}

export default function AccountMenu({ user }: { user: AccountUser }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const subtitle =
    user.rankLabel || user.roleLabel || roleLabelFromRole(user.role);

  const isStaff =
    user.role === "staff" ||
    user.role === "admin" ||
    user.role === "senior_staff" ||
    user.role === "headteacher" ||
    user.role === "administrator";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded border border-white/30 bg-white/10 py-1 pl-1 pr-2 text-left transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/40"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-school-blue text-[10px] font-bold text-white"
          >
            {user.initials}
          </span>
        )}
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-[9rem] truncate text-xs font-semibold leading-tight text-white">
            {user.name}
          </span>
          <span className="block max-w-[9rem] truncate text-[10px] font-medium uppercase tracking-wide text-school-accent">
            {subtitle}
          </span>
        </span>
        <svg
          aria-hidden
          className={`h-3.5 w-3.5 shrink-0 text-white/80 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="menu-panel absolute right-0 z-50 mt-2 w-64 overflow-hidden"
        >
          <div className="border-b border-school-border bg-school-surface px-4 py-3">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-school-blue text-sm font-bold text-white">
                  {user.initials}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-school-navy">
                  {user.name}
                </p>
                <p className="truncate text-xs font-medium text-school-blue">
                  {subtitle}
                </p>
                {user.discordUsername && (
                  <p className="truncate text-[11px] text-school-muted">
                    Discord · @{user.discordUsername}
                  </p>
                )}
                {user.robloxUsername && (
                  <p className="truncate text-[11px] text-school-muted">
                    Roblox · {user.robloxUsername}
                  </p>
                )}
              </div>
            </div>
          </div>
          <ul className="py-1 text-sm">
            {[
              ["/dashboard", "Dashboard"],
              ["/dashboard/profile", "Profile & links"],
              ["/dashboard/sessions", "Sessions"],
              ["/dashboard/notifications", "Notifications"],
              ["/dashboard/safeguarding", "Safeguarding"],
              ["/dashboard/merits", "Merits"],
              ["/dashboard/applications", "My applications"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link
                  href={href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="menu-item"
                >
                  {label}
                </Link>
              </li>
            ))}
            {isStaff && (
              <li>
                <Link
                  href="/staff"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="menu-item"
                >
                  Staff portal
                </Link>
              </li>
            )}
          </ul>
          <div className="border-t border-school-border p-1">
            <form action={signOut}>
              <button
                type="submit"
                role="menuitem"
                className="w-full rounded px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

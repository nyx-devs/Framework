"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { isActivePath, type NavItem } from "@/lib/site";
import { signOut } from "@/lib/auth/actions";
import type { AccountUser } from "./AccountMenu";

/**
 * Mobile / tablet menu. A labelled "Menu" button toggles a panel that sits
 * under the header. Escape closes it and returns focus to the button.
 */
export default function MobileNav({
  items,
  discordUrl,
  accountUser,
}: {
  items: NavItem[];
  discordUrl?: string;
  accountUser?: AccountUser | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
  }

  return (
    <div
      className="lg:hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          close();
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="inline-flex h-11 items-center gap-2 border border-white/40 px-3 text-sm font-semibold text-white hover:bg-white/10"
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
        Menu
      </button>

      <div
        id="mobile-nav"
        hidden={!open}
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-5rem)] overflow-y-auto border-b border-school-border bg-white shadow-md"
      >
        <nav aria-label="Main menu" className="container-page py-2">
          {accountUser && (
            <div className="mb-2 flex items-center gap-3 border-b border-school-border px-3 py-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-school-navy text-sm font-bold text-white"
              >
                {accountUser.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-school-navy">{accountUser.name}</p>
                <p className="truncate text-xs text-school-muted">{accountUser.email}</p>
              </div>
            </div>
          )}

          <ul>
            {items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href} className="border-b border-school-border last:border-b-0">
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block border-l-4 px-3 py-3 text-base font-semibold",
                      item.cta
                        ? "my-2 border-transparent bg-school-blue text-white"
                        : active
                          ? "border-school-blue bg-school-blue-light text-school-navy"
                          : "border-transparent text-school-slate hover:bg-school-surface"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-2 space-y-1 border-t border-school-border px-3 pb-3 pt-3 text-sm font-semibold text-school-blue">
            {accountUser ? (
              <>
                <Link href="/dashboard" onClick={close} className="block py-1.5 underline underline-offset-4">
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/applications"
                  onClick={close}
                  className="block py-1.5 underline underline-offset-4"
                >
                  My applications
                </Link>
                <Link href="/dashboard/profile" onClick={close} className="block py-1.5 underline underline-offset-4">
                  Profile
                </Link>
                <form action={signOut} className="pt-1">
                  <button type="submit" className="py-1.5 font-semibold text-red-700 underline underline-offset-4">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" onClick={close} className="block py-1.5 underline underline-offset-4">
                  Sign in
                </Link>
                <Link href="/register" onClick={close} className="block py-1.5 underline underline-offset-4">
                  Register
                </Link>
              </>
            )}
            {discordUrl && (
              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-1.5 underline underline-offset-4"
              >
                Discord
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}

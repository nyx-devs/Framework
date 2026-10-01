"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { isActivePath } from "@/lib/site";

export type NavItem = { label: string; href: string };

export default function HeaderNav({
  items,
  variant = "bar",
}: {
  items: NavItem[];
  variant?: "bar" | "toggle";
}) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  if (variant === "toggle") {
    return (
      <div className="relative">
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded border border-school-border bg-white text-school-navy shadow-sm"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        {open && (
          <div
            id="mobile-nav"
            className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,20rem)] rounded border border-school-border bg-white py-2 shadow-lg"
          >
            <nav className="flex flex-col" aria-label="Mobile">
              {items.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium",
                    isActivePath(pathname, item.href)
                      ? "bg-school-blue-light text-school-navy"
                      : "text-school-navy hover:bg-school-surface"
                  )}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-1 border-t border-school-border px-3 pt-2">
                <Link
                  href="/dashboard"
                  className="btn btn-primary btn-block"
                  onClick={() => setOpen(false)}
                >
                  Student portal
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    );
  }

  return (
    <nav className="hidden items-stretch lg:flex" aria-label="Main">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative px-3.5 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors",
              active
                ? "text-school-navy after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-[#c9a227]"
                : "text-school-slate hover:text-school-navy"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { isActivePath } from "@/lib/site";

export default function SleekNav({
  items,
}: {
  items: { label: string; href: string }[];
}) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] font-medium tracking-wide transition-colors",
                active
                  ? "bg-school-surface text-school-navy"
                  : "text-school-navy/65 hover:bg-school-surface/80 hover:text-school-navy"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-school-navy transition hover:bg-school-surface lg:hidden"
        aria-expanded={open}
        aria-controls="sleek-mobile-nav"
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
          id="sleek-mobile-nav"
          className="absolute inset-x-0 top-full z-50 border-b border-school-border bg-white/95 shadow-lg backdrop-blur-md lg:hidden"
        >
          <nav className="container-page flex flex-col py-3" aria-label="Mobile">
            {items.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium",
                  isActivePath(pathname, item.href)
                    ? "bg-school-surface text-school-navy"
                    : "text-school-navy/80 hover:bg-school-surface"
                )}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="mt-2 rounded-full bg-[#0c2340] px-3 py-2.5 text-center text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Student portal
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/applications", label: "My applications" },
  { href: "/dashboard/sessions", label: "Sessions" },
  { href: "/dashboard/merits", label: "Merits" },
  { href: "/dashboard/messages", label: "Mail" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/safeguarding", label: "Safeguarding" },
  { href: "/dashboard/profile", label: "Profile" },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-8 flex flex-wrap gap-1 border-b border-school-border"
      aria-label="Account"
    >
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors sm:px-4",
              active
                ? "border-school-blue text-school-blue"
                : "border-transparent text-school-slate hover:text-school-navy hover:border-school-border"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/staff", label: "Overview", exact: true },
  { href: "/staff/applications", label: "Applications" },
  { href: "/staff/interviews", label: "Interviews" },
  { href: "/staff/merits", label: "Merits" },
  { href: "/staff/sessions", label: "Sessions" },
  { href: "/staff/safeguarding", label: "Safeguarding" },
  { href: "/staff/messages", label: "Messages" },
  { href: "/staff/users", label: "Staff" },
  { href: "/staff/departments", label: "Departments" },
  { href: "/staff/positions", label: "Positions" },
  { href: "/staff/notifications", label: "Notifications" },
  { href: "/staff/audit-logs", label: "Audit logs" },
  { href: "/staff/settings", label: "Settings" },
  { href: "/staff/database", label: "Staff database" },
];

export default function StaffSidebar({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-school-border bg-school-surface min-h-full">
      <div className="p-4 border-b border-school-border">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Staff portal
        </p>
        <p className="text-sm font-bold text-school-navy mt-0.5">Ro-School</p>
      </div>
      <nav className="p-2 space-y-0.5" aria-label="Staff navigation">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "force-navy bg-[#0c2340] text-white"
                  : "text-school-slate hover:bg-school-surface"
              )}
            >
              <span>{item.label}</span>
              {item.href === "/staff/notifications" && unread > 0 && (
                <span
                  className={cn(
                    "text-xs font-semibold rounded-full min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center",
                    active ? "bg-white text-school-navy" : "bg-school-blue text-white"
                  )}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 mt-4 border-t border-school-border">
        <Link
          href="/"
          className="text-xs text-school-muted hover:text-school-navy"
        >
          ← Public school website
        </Link>
      </div>
    </aside>
  );
}

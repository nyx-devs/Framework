"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; exact?: boolean };
type NavSection = { title: string | null; items: NavItem[] };

const sections: NavSection[] = [
  {
    title: null,
    items: [{ href: "/admin", label: "Dashboard", exact: true }],
  },
  {
    title: "Applications",
    items: [
      { href: "/admin/applications", label: "All applications" },
      { href: "/admin/applications?status=interview", label: "Interviews" },
    ],
  },
  {
    title: "Staff",
    items: [
      { href: "/admin/staff", label: "Staff directory" },
      { href: "/admin/ranks", label: "Ranks" },
      { href: "/admin/permissions", label: "Permissions" },
    ],
  },
  {
    title: "School",
    items: [
      { href: "/admin/positions", label: "Positions" },
      { href: "/admin/departments", label: "Departments" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/users", label: "Users" },
      { href: "/admin/audit-logs", label: "Audit logs" },
      { href: "/admin/settings", label: "Settings" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-slate-950 text-slate-300 flex flex-col min-h-full">
      <div className="px-4 py-5 border-b border-slate-800">
        <p className="text-white font-bold text-sm tracking-tight">Ro-School Admin</p>
        <p className="text-[11px] text-school-muted mt-0.5">Ro-School School · Internal</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map((sec, i) => (
          <div key={i}>
            {sec.title && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-school-muted">
                {sec.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {sec.items.map((item) => {
                const pathOnly = item.href.split("?")[0];
                const active = item.exact
                  ? pathname === pathOnly
                  : pathname === pathOnly || pathname.startsWith(pathOnly + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "block rounded-md px-2.5 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-slate-800 text-white font-medium"
                          : "hover:bg-slate-900 hover:text-white"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-800 text-xs space-y-1">
        <Link href="/staff" className="block text-school-muted hover:text-slate-300">
          Staff portal →
        </Link>
        <Link href="/" className="block text-school-muted hover:text-slate-300">
          Public website →
        </Link>
      </div>
    </aside>
  );
}

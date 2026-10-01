"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActivePath, type NavItem } from "@/lib/site";

/** Desktop navigation. Marks the current section with aria-current. */
export default function MainNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="container-page">
      <ul className="flex items-stretch">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);

          if (item.cta) {
            return (
              <li key={item.href} className="ml-auto flex items-center py-1.5">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="whitespace-nowrap rounded-sm bg-school-blue px-4 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-school-navy"
                >
                  {item.label}
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap border-b-[3px] px-3 py-3.5 text-[15px] font-semibold transition-colors",
                  active
                    ? "border-school-blue text-school-navy"
                    : "border-transparent text-school-slate hover:border-school-border hover:text-school-blue"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

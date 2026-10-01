import Link from "next/link";
import Image from "next/image";
import { mainNav, site } from "@/lib/site";
import AccountMenu from "./AccountMenu";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { getSessionProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { getOrRefreshGroupRank } from "@/lib/roblox/group";
import { bandFromRankId, labelForBand } from "@/lib/roblox/ranks";
import { getUnreadNotificationCount } from "@/lib/notifications/actions";
import SleekNav from "./SleekNav";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function siteRoleLabel(role: string): string {
  if (role === "admin") return "Admin";
  if (role === "staff") return "Staff";
  return "Member";
}

export default async function Header() {
  const session = await getSessionProfile();
  const displayName =
    session?.discord?.display_name ||
    session?.profile.full_name?.trim() ||
    session?.user.email?.split("@")[0] ||
    "Member";

  let rankLabel: string | null = null;
  let roleLabel: string | null = null;
  let robloxUsername: string | null = null;

  if (session) {
    try {
      const supabase = await createClient();
      const { data: rbx } = await supabase
        .from("profiles")
        .select(
          "roblox_user_id, roblox_username, roblox_rank_id, roblox_rank_name, role"
        )
        .eq("id", session.user.id)
        .maybeSingle();
      robloxUsername = rbx?.roblox_username || null;
      if (rbx?.roblox_user_id) {
        try {
          const info = await getOrRefreshGroupRank(
            session.user.id,
            Number(rbx.roblox_user_id)
          );
          if (info?.isMember && info.rankName) {
            rankLabel = info.rankName;
            roleLabel = labelForBand(info.band);
          } else if (info?.isMember) {
            rankLabel = labelForBand(info.band);
            roleLabel = rankLabel;
          } else if (rbx.roblox_rank_name) {
            rankLabel = rbx.roblox_rank_name;
            roleLabel = labelForBand(bandFromRankId(rbx.roblox_rank_id));
          }
        } catch {
          if (rbx.roblox_rank_name) rankLabel = rbx.roblox_rank_name;
        }
      }
      if (!rankLabel) {
        rankLabel = siteRoleLabel(session.profile.role || rbx?.role || "applicant");
      }
      if (!roleLabel) {
        roleLabel = siteRoleLabel(session.profile.role || "applicant");
      }
    } catch {
      rankLabel = siteRoleLabel(session.profile.role || "applicant");
      roleLabel = rankLabel;
    }
  }

  const unread = session != null ? await getUnreadNotificationCount() : 0;
  const accountUser = session
    ? {
        name: displayName,
        email: session.profile.email || session.user.email || "",
        role: session.profile.role || "applicant",
        initials: initialsFromName(displayName),
        avatarUrl:
          session.discord?.avatar_url || session.profile.avatar_url || null,
        rankLabel,
        roleLabel,
        robloxUsername,
        discordUsername: session.discord?.discord_username || null,
      }
    : null;

  const navItems = mainNav.map((item) => ({
    label: item.label,
    href: item.href,
  }));

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/85 backdrop-blur-md">
      <div className="container-page relative flex items-center justify-between gap-4 py-3 sm:py-3.5">
        <Link href="/" className="group flex shrink-0 flex-col items-center text-center">
          <span className="relative flex h-11 w-11 items-center justify-center sm:h-12 sm:w-12">
            <Image
              src="/assets/logo1.png"
              alt=""
              width={48}
              height={48}
              className="object-contain"
              priority
            />
          </span>
          <span className="mt-1 max-w-[8.5rem] font-serif text-[10px] font-bold leading-tight tracking-wide text-school-navy group-hover:text-school-blue sm:max-w-[10rem] sm:text-[11px]">
            {site.name}
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
          <SleekNav items={navItems} />
          <div className="ml-1 hidden h-4 w-px bg-school-border lg:block" aria-hidden />
          <div className="flex items-center gap-0.5 sm:gap-1">
            <ThemeToggle />
            {accountUser ? (
              <>
                <Link
                  href="/dashboard/notifications"
                  className="relative hidden rounded-full p-2 text-school-navy/60 transition hover:bg-school-surface hover:text-school-navy sm:inline-flex"
                  aria-label={
                    unread > 0 ? `${unread} unread notifications` : "Notifications"
                  }
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
                  </svg>
                  {unread > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
                <div className="sleek-account">
                  <AccountMenu user={accountUser} />
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="ml-1 rounded-full bg-[#0c2340] px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-school-blue"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

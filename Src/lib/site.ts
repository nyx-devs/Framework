/**
 * School branding — driven by environment variables so this repo
 * works as a generic Ro-School framework. Set values in `.env.local`.
 */
export const site = {
  name: process.env.NEXT_PUBLIC_SCHOOL_NAME || "Ro-School",
  shortName: process.env.NEXT_PUBLIC_SCHOOL_SHORT_NAME || "Ro-School",
  tagline:
    process.env.NEXT_PUBLIC_SCHOOL_TAGLINE ||
    "Roblox learning community",
  motto: process.env.NEXT_PUBLIC_SCHOOL_MOTTO || "Learning · Kindness · Community",
  description:
    process.env.NEXT_PUBLIC_SCHOOL_DESCRIPTION ||
    "Official website for a Roblox Ro-School — news, student portal, staff vacancies and community links.",
  rpNotice:
    process.env.NEXT_PUBLIC_SCHOOL_RP_NOTICE ||
    "This is a Roblox-based learning community (Ro-School). It is not a registered educational institution and does not offer formal qualifications.",
  addressLines: (
    process.env.NEXT_PUBLIC_SCHOOL_ADDRESS ||
    "Ro-School|Roblox learning community|United Kingdom"
  ).split("|"),
};

export const discordInviteUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "";
export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
export const robloxExperienceUrl =
  process.env.NEXT_PUBLIC_ROBLOX_EXPERIENCE_URL || "";
export const robloxGroupUrl = process.env.NEXT_PUBLIC_ROBLOX_GROUP_URL || "";

export type NavItem = { label: string; href: string; cta?: boolean };

export const mainNav: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Our school", href: "/school-life" },
  { label: "Pupils", href: "/students" },
  { label: "Parents", href: "/parents" },
  { label: "News", href: "/news" },
  { label: "Join us", href: "/positions" },
];

export const announcement: {
  label: string;
  text: string;
  href: string;
  linkLabel: string;
} | null = {
  label: "School notice",
  text: "Sign in to the student portal to link Roblox and view merits.",
  href: "/dashboard",
  linkLabel: "Student portal",
};

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Community and school events.
 * These are sample entries for a Roblox learning community: replace with real schedule.
 * Dates are YYYY-MM-DD. Past events drop off the "upcoming" lists automatically.
 * Times are UK time.
 *
 * Do not invent clubs, sports days or real-world trips that Ro-School does not run.
 */

import { todayInUk } from "@/lib/format";

export type EventCategory =
  | "Open Day"
  | "Assembly"
  | "Session"
  | "Community"
  | "Announcement";

export interface SchoolEvent {
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: EventCategory;
  description: string;
}

const events: SchoolEvent[] = [
  {
    slug: "open-day",
    title: "Open Day",
    date: "2026-10-03",
    time: "2:00pm – 4:00pm",
    location: "Roblox experience",
    category: "Open Day",
    description:
      "A chance to look around the experience, meet staff and ask questions before you join. Everyone is welcome.",
  },
  {
    slug: "whole-school-assembly",
    title: "Whole School Assembly",
    date: "2026-10-09",
    time: "6:00pm",
    location: "Roblox experience · Main hall",
    category: "Assembly",
    description:
      "The autumn assembly. Announcements from the Senior Leadership Team and a look at what’s coming up.",
  },
  {
    slug: "department-showcase",
    title: "Department Showcase",
    date: "2026-10-18",
    time: "7:00pm",
    location: "Roblox experience",
    category: "Session",
    description:
      "Heads of department share what their teams have been working on. Open to all students and staff.",
  },
  {
    slug: "community-evening",
    title: "Community Evening",
    date: "2026-10-25",
    time: "7:30pm",
    location: "Discord + Roblox",
    category: "Community",
    description:
      "A relaxed evening for members to chat, ask questions and meet the staff team.",
  },
];

export function getAllEvents(): SchoolEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date));
}

export function getUpcomingEvents(limit?: number): SchoolEvent[] {
  const today = todayInUk();
  const upcoming = getAllEvents().filter((e) => e.date >= today);
  return limit ? upcoming.slice(0, limit) : upcoming;
}

export function getEventBySlug(slug: string): SchoolEvent | undefined {
  return events.find((e) => e.slug === slug);
}

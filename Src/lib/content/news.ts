/**
 * School news. Add new items at the top; the site sorts by date anyway.
 * `body` is an array of paragraphs. Dates are YYYY-MM-DD.
 * Keep wording specific to a Roblox learning community — no real exams, clubs or trips.
 */

export const newsCategories = [
  "School News",
  "Staff",
  "Departments",
  "Community",
] as const;

export type NewsCategory = (typeof newsCategories)[number];

export interface NewsItem {
  slug: string;
  title: string;
  date: string;
  category: NewsCategory;
  summary: string;
  body: string[];
}

const items: NewsItem[] = [
  {
    slug: "welcome-to-bluebird-school",
    title: "Welcome to Ro-School School",
    date: "2026-09-12",
    category: "School News",
    summary:
      "A short introduction to the Roblox learning community, the staff team and how to get involved.",
    body: [
      "Welcome to Ro-School School. We’re a Roblox learning community and community, built around sessions in the experience, a staff team and a friendly Discord server.",
      "If you’re new, the About page is the best place to start. It explains what Ro-School is and how it works. You can also meet the SLT, look through the departments and see the latest news.",
      "Ro-School is not a real school. Sessions and community life happen on Roblox and Discord. We do not offer real qualifications or exams.",
      "Come and say hello in the Discord server. Someone from the team will point you in the right direction.",
    ],
  },
  {
    slug: "staff-applications-open",
    title: "Staff applications are now open",
    date: "2026-09-09",
    category: "Staff",
    summary:
      "We’re recruiting for teaching, support and leadership roles. Apply on the website.",
    body: [
      "Applications are open for a small number of roles across the school. Have a look at the vacancies page to see what’s available and what each role involves.",
      "What matters most is that you’re reliable, friendly and happy to run or support sessions in the Roblox experience. Each vacancy lists what we’re looking for.",
      "Applications are submitted on this website only. Create an account, open a vacancy, complete the form and track your status from your dashboard. We do not take applications via Discord DMs.",
      "Closing dates are shown on every vacancy.",
    ],
  },
  {
    slug: "session-times-on-discord",
    title: "Where to find session times",
    date: "2026-09-05",
    category: "School News",
    summary:
      "Session times, and any changes to them, are posted in the Discord server.",
    body: [
      "Sessions run in the Ro-School Roblox experience, and the timetable is posted in the Discord server. If a session changes, the update goes there first.",
      "New members should join the Discord and read the community rules. The students page explains how to get started.",
    ],
  },
  {
    slug: "departments-updated",
    title: "Departments list updated",
    date: "2026-09-02",
    category: "Departments",
    summary:
      "Each department has its own head, so it’s clearer who to speak to about sessions.",
    body: [
      "This term the departments list has been refreshed. Each one has a head of department who looks after the sessions in that area.",
      "You can see the full list on the departments page, along with a short description of each team.",
    ],
  },
  {
    slug: "meet-the-staff-team",
    title: "Meet the staff team",
    date: "2026-08-28",
    category: "Staff",
    summary: "An overview of how the staff team is set up and who does what.",
    body: [
      "The staff team is split into senior leadership (SLT), department leaders, teaching staff and support staff. The staff page explains each role and what it involves.",
      "The SLT page will list individual senior leaders as details are confirmed. If you’re not sure who to speak to, start with a member of the support team on Discord.",
    ],
  },
  {
    slug: "community-update-august",
    title: "Community update",
    date: "2026-08-20",
    category: "Community",
    summary:
      "Thank you to everyone who has joined so far, and a reminder about the community rules.",
    body: [
      "Thank you to everyone who has joined Ro-School so far. We’ve been getting things ready and it’s good to see the community growing.",
      "New members should read the community rules first, then introduce themselves. The rules are on the community page.",
    ],
  },
];

export function getAllNews(): NewsItem[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

export function getLatestNews(limit = 5): NewsItem[] {
  return getAllNews().slice(0, limit);
}

export function getNewsBySlug(slug: string): NewsItem | undefined {
  return items.find((item) => item.slug === slug);
}

export function getNewsByCategory(category: NewsCategory): NewsItem[] {
  return getAllNews().filter((item) => item.category === category);
}

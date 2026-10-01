/**
 * Default daily session timetable (GMT / UTC).
 * Every day 19:15–20:40 GMT (7:15 pm – 8:40 pm GMT).
 * Override labels via env if needed.
 */
export const SESSION_START_GMT = { hour: 19, minute: 15 };
export const SESSION_END_GMT = { hour: 20, minute: 40 };

export const SESSION_DEFAULT_TITLE =
  process.env.NEXT_PUBLIC_SESSION_TITLE || "Daily school session";

export const SESSION_DEFAULT_DESCRIPTION =
  process.env.NEXT_PUBLIC_SESSION_DESCRIPTION ||
  "School is in session every day from 7:15 pm to 8:40 pm GMT.";

export function sessionBoundsForDate(dateYmd: string): {
  starts_at: string;
  ends_at: string;
} {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const starts = new Date(
    Date.UTC(y, m - 1, d, SESSION_START_GMT.hour, SESSION_START_GMT.minute, 0)
  );
  const ends = new Date(
    Date.UTC(y, m - 1, d, SESSION_END_GMT.hour, SESSION_END_GMT.minute, 0)
  );
  return { starts_at: starts.toISOString(), ends_at: ends.toISOString() };
}

export function upcomingDateKeys(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i)
    );
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function formatSessionWindowLabel(): string {
  return "Every day · 7:15 pm – 8:40 pm GMT";
}

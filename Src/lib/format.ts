/**
 * Dates in the content files are plain ISO dates ("2026-10-03").
 * They are read at midday UTC and formatted in UTC so they never shift
 * a day depending on the server or visitor time zone.
 */
function parse(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}

export function formatDate(iso: string) {
  return parse(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatLongDate(iso: string) {
  return parse(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function dayOfMonth(iso: string) {
  return parse(iso).toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" });
}

export function shortMonth(iso: string) {
  return parse(iso).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
}

export function monthYear(iso: string) {
  return parse(iso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Today's date in the UK as YYYY-MM-DD. */
export function todayInUk(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
}

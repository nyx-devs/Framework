/** School email domain used for in-website addresses. */
export const SCHOOL_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_SCHOOL_EMAIL_DOMAIN || "school.local";

export function isSchoolAddress(address: string): boolean {
  const a = address.trim().toLowerCase();
  return a.endsWith(`@${SCHOOL_EMAIL_DOMAIN}`) && a.includes("@");
}

export function normalizeSchoolAddress(address: string): string {
  return address.trim().toLowerCase();
}

/**
 * Build a local-part from a display name or handle.
 * "eqeno" → "eqeno"
 * "Jane Smith" → "jane.smith"
 */
export function localPartFromName(fullName: string): string {
  const raw = fullName.trim().toLowerCase();
  const ascii = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.+/g, ".");
  return ascii.slice(0, 32) || "member";
}

export function schoolEmailFromName(fullName: string): string {
  return `${localPartFromName(fullName)}@${SCHOOL_EMAIL_DOMAIN}`;
}

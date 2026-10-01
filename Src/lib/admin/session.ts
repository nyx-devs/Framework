import { createHmac, timingSafeEqual, scryptSync } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "bluebird_admin_session";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.BLUEBIRD_ADMIN_PASSWORD ||
    "dev-only-change-me"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export type AdminSession = {
  email: string;
  exp: number;
};

export async function createAdminSession(email: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const body = Buffer.from(JSON.stringify({ email, exp } satisfies AdminSession)).toString(
    "base64url"
  );
  const sig = sign(body);
  const value = `${body}.${sig}`;
  const jar = await cookies();
  jar.set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as AdminSession;
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    if (!data.email) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Verify password against BLUEBIRD_ADMIN_PASSWORD (never logged or sent to client).
 * Uses timing-safe comparison on derived hashes.
 */
export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.BLUEBIRD_ADMIN_PASSWORD;
  if (!expected || expected.length < 8) return false;
  if (!password) return false;

  // Derive fixed-length digests so lengths don't leak via timing
  const salt = "bluebird-admin-v1";
  const a = scryptSync(password, salt, 32);
  const b = scryptSync(expected, salt, 32);
  return timingSafeEqual(a, b);
}

export function isAdminEmailAllowed(email: string): boolean {
  const list = (process.env.BLUEBIRD_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) {
    // If no allow-list, any email + correct password works (dev convenience)
    return true;
  }
  return list.includes(email.trim().toLowerCase());
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new Error("ADMIN_UNAUTHENTICATED");
  return session;
}

/**
 * Pure helpers for the auth email flow (no Next.js imports, so they can be
 * unit tested).
 *
 * WHY THIS EXISTS
 * Supabase's PKCE sign-up / password-reset flow saves a "code verifier" in a
 * cookie when the user starts the flow. The email link must open on the SAME
 * host, or the cookie is not sent and the callback fails with
 * "PKCE code verifier not found in storage".
 * So the link we put in the email must point at the address the user is
 * actually on, not at whatever NEXT_PUBLIC_SITE_URL happens to say.
 */

type Input = {
  origin?: string | null;
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  envUrl?: string | null;
};

function toOrigin(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function isLocalHost(hostname: string) {
  const h = hostname.replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/** Where the person making this request actually is. */
function requestOrigin({ origin, host, forwardedHost, forwardedProto }: Input): string | null {
  const fromHeader = toOrigin(origin);
  if (fromHeader) return fromHeader;

  const h = (forwardedHost ?? host)?.split(",")[0].trim();
  if (!h) return null;
  const hostname = h.replace(/:\d+$/, "");
  const proto = forwardedProto?.split(",")[0].trim() || (isLocalHost(hostname) ? "http" : "https");
  return toOrigin(`${proto}://${h}`);
}

/**
 * The base URL to put in auth emails.
 *  - On localhost / 127.0.0.1 the request's own address always wins, so a
 *    production NEXT_PUBLIC_SITE_URL in your local .env cannot break local sign-up.
 *  - Anywhere else, the configured NEXT_PUBLIC_SITE_URL is used (canonical), and
 *    the request address is only a fallback.
 */
export function resolveSiteUrl(input: Input): string {
  const req = requestOrigin(input);
  const env = toOrigin(input.envUrl);
  if (req && isLocalHost(new URL(req).hostname)) return req;
  return env ?? req ?? "https://your-school.vercel.app/0";
}

/** Turns Supabase's raw callback errors into something a member can act on. */
export function friendlyCallbackError(message: string, next: string): string {
  const m = message.toLowerCase();
  const isReset = next.startsWith("/reset-password");

  if (m.includes("code verifier") || m.includes("pkce")) {
    return isReset
      ? "This password reset link was opened in a different browser or device from the one you asked for it on. Please request a new link and open it in the same browser."
      : "We couldn’t finish signing you in from this link because it was opened in a different browser or device. Your email address should now be confirmed, so try signing in with your email and password.";
  }
  if (m.includes("expired") || m.includes("invalid") || m.includes("already been used")) {
    return isReset
      ? "This password reset link has expired or has already been used. Please request a new one."
      : "This link has expired or has already been used. If you’ve already confirmed your email, just sign in.";
  }
  return `Authentication callback failed: ${message}`;
}

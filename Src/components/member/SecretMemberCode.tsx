"use client";

import { useState } from "react";

/** Private member code — hidden by default. Treat like a password. */
export default function SecretMemberCode({ code }: { code: string | null }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!code) {
    return (
      <p className="text-sm text-amber-700">
        Code not assigned yet. Run SQL migration 008 in Supabase, then refresh.
      </p>
    );
  }

  // Narrowed: TypeScript keeps string | null inside nested functions otherwise
  const value = code;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
        Top secret — never share in Discord, screenshots, or with other members
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-2xl font-semibold tracking-widest text-school-navy">
          {revealed ? value : "••••••"}
        </p>
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="rounded border border-school-border px-3 py-1.5 text-sm font-medium text-school-navy hover:bg-school-surface"
        >
          {revealed ? "Hide" : "Reveal"}
        </button>
        {revealed && (
          <button
            type="button"
            onClick={copy}
            className="rounded bg-school-blue px-3 py-1.5 text-sm font-semibold text-white hover:bg-school-navy"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <p className="text-xs text-school-muted">
        Only you should know this code. Staff may ask you to confirm it in a
        private channel to verify your identity — it must never be posted publicly.
      </p>
    </div>
  );
}

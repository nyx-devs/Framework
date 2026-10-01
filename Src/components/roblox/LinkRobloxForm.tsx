"use client";

import { useState, useTransition } from "react";
import {
  startRobloxLink,
  confirmRobloxLink,
  unlinkRoblox,
  refreshMyRobloxRank,
} from "@/lib/roblox/link";

type Pending = {
  code: string;
  roblox_username: string;
  roblox_user_id: number;
  expires_at: string;
} | null;

export default function LinkRobloxForm({
  linkedUsername,
  linkedUserId,
  pending,
}: {
  linkedUsername?: string | null;
  linkedUserId?: number | null;
  pending?: Pending;
}) {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [code, setCode] = useState(pending?.code || "");
  const [pendingName, setPendingName] = useState(pending?.roblox_username || "");
  const [pendingId, setPendingId] = useState(
    pending?.roblox_user_id ? String(pending.roblox_user_id) : ""
  );
  const [busy, startTransition] = useTransition();

  if (linkedUserId) {
    return (
      <div className="mt-3 space-y-3">
        <p className="text-sm text-school-navy">
          Linked as <strong>{linkedUsername || linkedUserId}</strong>
          <span className="ml-2 font-mono text-xs text-school-muted">
            ID {linkedUserId}
          </span>
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            className="rounded border border-school-border px-3 py-1.5 text-sm font-medium text-school-navy hover:bg-school-surface disabled:opacity-60"
            onClick={() => {
              startTransition(async () => {
                setError(null);
                setInfo(null);
                const r = await refreshMyRobloxRank();
                if (r.error) {
                  setError(r.error);
                  return;
                }
                if (r.ok) {
                  setInfo(
                    `Rank: ${r.rankName || "—"} (#${r.rankId ?? "—"}) · ${r.band}`
                  );
                  setTimeout(() => window.location.reload(), 600);
                }
              });
            }}
          >
            {busy ? "Refreshing…" : "Refresh rank from Roblox"}
          </button>
          <button
            type="button"
            disabled={busy}
            className="text-sm text-red-600 hover:underline"
            onClick={() => {
              startTransition(async () => {
                const r = await unlinkRoblox();
                if (r.error) setError(r.error);
                else window.location.reload();
              });
            }}
          >
            Unlink
          </button>
        </div>
        {info && <p className="text-sm text-emerald-700">{info}</p>}
        {error && <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-4 text-sm">
      {!code ? (
        <form
          className="space-y-2"
          action={(fd) => {
            startTransition(async () => {
              setError(null);
              const r = await startRobloxLink(fd);
              if (r.error) {
                setError(r.error);
                return;
              }
              if (r.ok) {
                setCode(r.code);
                setPendingName(r.robloxUsername);
                setPendingId(String(r.robloxUserId));
              }
            });
          }}
        >
          <label className="block">
            <span className="font-medium text-school-navy">Roblox username</span>
            <input
              name="username"
              required
              className="field-input"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-school-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Continue
          </button>
        </form>
      ) : (
        <div className="space-y-3 rounded-lg border border-school-border bg-school-surface p-4">
          <p>
            Linking <strong>{pendingName}</strong> (ID {pendingId})
          </p>
          <p>
            Put{" "}
            <code className="rounded bg-white px-2 py-0.5 font-mono font-bold">
              {code}
            </code>{" "}
            in your Roblox About, save, then confirm.
          </p>
          <form
            action={() => {
              startTransition(async () => {
                setError(null);
                const r = await confirmRobloxLink();
                if (r.error) setError(r.error);
                else window.location.reload();
              });
            }}
          >
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-school-navy px-4 py-2 text-sm font-semibold text-white"
            >
              Confirm link
            </button>
          </form>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

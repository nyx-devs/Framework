"use client";

import { useState, useTransition } from "react";

type ActionResult = { error?: string; ok?: boolean; total?: number };

export default function AwardMeritForm({
  action,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMessage(null);
    setError(null);
    start(async () => {
      const res = await action(fd);
      if (res.error) setError(res.error);
      else {
        setMessage(
          `Merit awarded. Student total is now ${res.total ?? "updated"}.`
        );
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-school-muted mb-1">
          Student profile ID (UUID from their account)
        </label>
        <input
          name="student_id"
          required
          placeholder="Paste student profile UUID"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          Student must have Roblox linked on their profile. Search is available
          via Staff → Users.
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium text-school-muted mb-1">
          Type
        </label>
        <select
          name="merit_kind"
          defaultValue="positive"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="positive">Positive merit</option>
          <option value="bad">Bad merit</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-school-muted mb-1">
          Amount
        </label>
        <select
          name="amount"
          defaultValue="1"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="5">5</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-school-muted mb-1">
          Reason
        </label>
        <input
          name="reason"
          required
          maxLength={200}
          placeholder="Excellent participation"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Awarding…" : "Award merit"}
        </button>
      </div>
      {error && <p className="sm:col-span-2 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="sm:col-span-2 text-sm text-green-700">{message}</p>
      )}
    </form>
  );
}

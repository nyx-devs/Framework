"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  sendSchoolMail,
  searchDirectory,
  type MailResult,
} from "@/lib/mail/actions";
import { SCHOOL_EMAIL_DOMAIN } from "@/lib/mail/domain";

const initial: MailResult = {};

export default function ComposeMailForm({
  fromAddress,
}: {
  fromAddress: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(sendSchoolMail, initial);
  const [to, setTo] = useState(searchParams.get("to") || "");
  const [subject, setSubject] = useState(searchParams.get("subject") || "");
  const [suggestions, setSuggestions] = useState<
    { id: string; full_name: string | null; school_email: string | null }[]
  >([]);

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard/messages?tab=sent");
      router.refresh();
    }
  }, [state?.success, router]);

  useEffect(() => {
    const q = to.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      searchDirectory(q).then(setSuggestions).catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [to]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {state.error}
        </div>
      )}
      {state?.success && (
        <div
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800"
        >
          {state.success}
        </div>
      )}

      <div>
        <label className="field-label">
          From
        </label>
        <input
          type="text"
          disabled
          value={fromAddress}
          className="w-full rounded border border-school-border bg-school-surface px-3 py-2 text-sm text-school-muted"
        />
      </div>

      <div className="relative">
        <label
          htmlFor="to"
          className="field-label"
        >
          To
        </label>
        <input
          id="to"
          name="to"
          type="text"
          required
          autoComplete="off"
          placeholder={`name@${SCHOOL_EMAIL_DOMAIN}`}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="field-input"
        />
        <p className="mt-1 text-xs text-school-muted">
          Use a member&apos;s school address ending in @{SCHOOL_EMAIL_DOMAIN}
        </p>
        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-school-border bg-white shadow-lg">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-school-surface"
                  onClick={() => {
                    setTo(s.school_email || "");
                    setSuggestions([]);
                  }}
                >
                  <span className="font-medium text-school-navy">
                    {s.full_name || "Member"}
                  </span>
                  <span className="text-xs text-school-muted">
                    {s.school_email}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label
          htmlFor="subject"
          className="field-label"
        >
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="field-input"
        />
      </div>

      <div>
        <label
          htmlFor="body"
          className="field-label"
        >
          Message
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={8}
          maxLength={10000}
          className="field-input"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary"
        >
          {pending ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/messages")}
          className="rounded border border-school-border px-4 py-2 text-sm font-medium text-school-navy hover:bg-school-surface"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

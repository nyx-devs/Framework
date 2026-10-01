"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePassword, type AuthResult } from "@/lib/auth/actions";

const initial: AuthResult = {};

export default function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initial);

  return (
    <form action={formAction} className="mt-6 space-y-4">
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
        <label
          htmlFor="password"
          className="block text-sm font-medium text-school-navy mb-1"
        >
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field-input"
        />
        <p className="mt-1 text-xs text-school-muted">At least 8 characters.</p>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-school-navy mb-1"
        >
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field-input"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-school-blue text-white py-2.5 text-sm font-semibold hover:bg-school-navy transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Updating password…" : "Update password"}
      </button>

      <p className="text-center text-sm text-school-muted">
        <Link href="/login" className="text-school-blue font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

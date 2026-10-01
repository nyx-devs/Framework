"use client";

import { useActionState } from "react";
import { resetPasswordRequest, type AuthResult } from "@/lib/auth/actions";

const initial: AuthResult = {};

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    resetPasswordRequest,
    initial
  );

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

      {!state?.success && (
        <>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-school-navy mb-1"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="field-input"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded bg-school-blue text-white py-2.5 text-sm font-semibold hover:bg-school-navy transition-colors disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </>
      )}
    </form>
  );
}

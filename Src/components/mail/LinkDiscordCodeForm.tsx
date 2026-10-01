"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LinkDiscordCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/discord/link-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not link Discord.");
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="discord-code" className="mb-1 block text-xs font-medium text-school-navy">
          Bot link code
        </label>
        <input
          id="discord-code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="field-input"
        />
      </div>
      <button
        type="submit"
        disabled={pending || code.length !== 6}
        className="rounded bg-[#5865F2] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4752C4] disabled:opacity-60"
      >
        {pending ? "Linking…" : "Link with code"}
      </button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
      {success && (
        <p className="w-full text-sm text-green-700">Discord linked successfully.</p>
      )}
    </form>
  );
}

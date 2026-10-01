"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Ensure profile has a unique 6-digit member_code.
 * Prefers DB RPC ensure_member_code_for (SECURITY DEFINER) so RLS cannot block it.
 */
export async function ensureMemberCode(userId: string): Promise<string | null> {
  const supabase = await createClient();

  // 1) Fast path: already set
  const { data: profile, error: selectError } = await supabase
    .from("profiles")
    .select("member_code")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    console.error(
      "[member_code] select failed — did you run migration 008?",
      selectError.message
    );
  }

  if (profile?.member_code && /^\d{6}$/.test(profile.member_code)) {
    return profile.member_code;
  }

  // 2) Prefer RPC (works even when column was just added)
  const { data: rpcCode, error: rpcError } = await supabase.rpc(
    "ensure_member_code_for",
    { p_user_id: userId }
  );

  if (!rpcError && rpcCode && /^\d{6}$/.test(String(rpcCode))) {
    return String(rpcCode);
  }

  if (rpcError) {
    console.error(
      "[member_code] RPC failed — run supabase/migrations/008_member_codes.sql",
      rpcError.message
    );
  }

  // 3) Fallback: app-side generate + update
  for (let i = 0; i < 40; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { data: clash } = await supabase
      .from("profiles")
      .select("id")
      .eq("member_code", code)
      .maybeSingle();
    if (clash) continue;

    const { error } = await supabase
      .from("profiles")
      .update({ member_code: code })
      .eq("id", userId);

    if (!error) {
      const { data: again } = await supabase
        .from("profiles")
        .select("member_code")
        .eq("id", userId)
        .maybeSingle();
      if (again?.member_code) return again.member_code;
      return code;
    }
  }

  return null;
}

export async function getMyMemberCode(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return ensureMemberCode(user.id);
}

export async function lookupByMemberCode(code: string) {
  const supabase = await createClient();
  const cleaned = code.trim();
  if (!/^\d{6}$/.test(cleaned)) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, school_email, role, member_code")
    .eq("member_code", cleaned)
    .maybeSingle();

  return data;
}

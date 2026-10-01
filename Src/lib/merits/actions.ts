"use server";

import { createClient } from "@/lib/supabase/server";
import { awardMerit } from "@/lib/merits/service";
import { revalidatePath } from "next/cache";

export async function getMyMerits() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { total: 0, history: [] as const };

  const { data: totalRow } = await supabase
    .from("merit_totals")
    .select("total, positive_total, bad_total")
    .eq("student_id", user.id)
    .maybeSingle();

  const { data: history } = await supabase
    .from("merits")
    .select(
      "id, amount, reason, awarded_by_name, source, created_at, status, student_roblox_username, merit_kind"
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  let total = totalRow?.total ?? 0;
  if (totalRow == null && history?.length) {
    total = history
      .filter((h) => h.status === "active")
      .reduce((s, h) => s + h.amount, 0);
  }

  return {
    total,
    positiveTotal: (totalRow as { positive_total?: number } | null)?.positive_total ?? undefined,
    badTotal: (totalRow as { bad_total?: number } | null)?.bad_total ?? undefined,
    history: history || [],
  };
}

export async function staffAwardMerit(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
    const { data: sp } = await supabase
      .from("staff_profiles")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!sp) return { error: "Staff only" };
  }

  const studentId = String(formData.get("student_id") || "").trim();
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason") || "").trim();
  const meritKind = String(formData.get("merit_kind") || "positive") === "bad" ? "bad" as const : "positive" as const;

  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name, roblox_user_id, roblox_username")
    .eq("id", studentId)
    .maybeSingle();

  if (!student?.roblox_user_id) {
    return {
      error:
        "Student must have a linked Roblox account (roblox_user_id) before merits can be awarded.",
    };
  }

  const result = await awardMerit({
    studentRobloxId: student.roblox_user_id,
    studentRobloxUsername: student.roblox_username,
    amount,
    reason,
    meritKind,
    awardedByProfileId: user.id,
    awardedByName: profile?.full_name || "Staff",
    awardedByRank: profile?.role || "staff",
    source: "website",
  });

  if (!result.ok) return { error: result.error };

  revalidatePath("/staff/merits");
  revalidatePath("/dashboard/merits");
  return { ok: true, total: result.total };
}

export async function staffSearchStudents(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, roblox_username, roblox_user_id, member_code")
    .or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,roblox_username.ilike.%${q}%`
    )
    .limit(15);

  return data || [];
}


export async function staffAwardBadMerit(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { hasPermission } = await import("@/lib/permissions");
  const can = await hasPermission("merits.award_bad");
  if (!can) {
    const canAward = await hasPermission("merits.award");
    if (!canAward) return { error: "No permission to issue bad merits" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  const studentId = String(formData.get("student_id") || "").trim();
  const amount = Math.abs(Number(formData.get("amount") || 1));
  const reason = String(formData.get("reason") || "").trim();

  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name, roblox_user_id, roblox_username")
    .eq("id", studentId)
    .maybeSingle();

  if (!student?.roblox_user_id) {
    return { error: "Student must have a linked Roblox account." };
  }

  const result = await awardMerit({
    studentRobloxId: student.roblox_user_id,
    studentRobloxUsername: student.roblox_username,
    amount,
    reason,
    meritKind: "bad",
    awardedByProfileId: user.id,
    awardedByName: profile?.full_name || "Staff",
    awardedByRank: profile?.role || "staff",
    source: "website",
  });

  if (!result.ok) return { error: result.error };
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/staff/merits");
  revalidatePath("/dashboard/merits");
  return { ok: true, total: result.total };
}

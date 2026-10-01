"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canAccessStaffDatabase } from "@/lib/permissions";

export type StaffDbEntry = {
  id: string;
  application_id: string | null;
  profile_id: string | null;
  discord_username: string;
  roblox_username: string;
  rank_label: string;
  subroles: string[];
  date_accepted: string;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffDbHistory = {
  id: string;
  entry_id: string;
  actor_id: string | null;
  action: string;
  changes: unknown;
  created_at: string;
};

async function requireHt() {
  const ok = await canAccessStaffDatabase();
  if (!ok) throw new Error("FORBIDDEN");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function listStaffDatabase(opts?: {
  q?: string;
  rank?: string;
}): Promise<{ error?: string; rows: StaffDbEntry[] }> {
  try {
    await requireHt();
  } catch {
    return { error: "Forbidden", rows: [] };
  }
  const admin = createServiceClient();
  const query = admin
    .from("staff_database_entries")
    .select("*")
    .order("date_accepted", { ascending: false })
    .limit(200);
  const { data, error } = await query;
  if (error) {
    console.warn("[staff_db] list", error);
    return { error: error.message, rows: [] };
  }
  let rows = (data || []) as StaffDbEntry[];
  const q = (opts?.q || "").trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (r) =>
        r.discord_username?.toLowerCase().includes(q) ||
        r.roblox_username?.toLowerCase().includes(q) ||
        r.rank_label?.toLowerCase().includes(q) ||
        (r.notes || "").toLowerCase().includes(q) ||
        (r.subroles || []).some((s) => s.toLowerCase().includes(q))
    );
  }
  if (opts?.rank) {
    rows = rows.filter(
      (r) => r.rank_label.toLowerCase() === opts.rank!.toLowerCase()
    );
  }
  return { rows };
}

export async function getStaffDatabaseEntry(
  id: string
): Promise<{ error?: string; entry?: StaffDbEntry; history?: StaffDbHistory[] }> {
  try {
    await requireHt();
  } catch {
    return { error: "Forbidden" };
  }
  const admin = createServiceClient();
  const { data: entry, error } = await admin
    .from("staff_database_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !entry) return { error: error?.message || "Not found" };
  const { data: history } = await admin
    .from("staff_database_history")
    .select("*")
    .eq("entry_id", id)
    .order("created_at", { ascending: false })
    .limit(50);
  return {
    entry: entry as StaffDbEntry,
    history: (history || []) as StaffDbHistory[],
  };
}

export async function createStaffDatabaseEntry(formData: FormData) {
  try {
    const user = await requireHt();
    const discord_username = String(formData.get("discord_username") || "").trim();
    const roblox_username = String(formData.get("roblox_username") || "").trim();
    const rank_label = String(formData.get("rank_label") || "").trim();
    const date_accepted = String(formData.get("date_accepted") || "").trim();
    const notes = String(formData.get("notes") || "").trim() || null;
    const application_id =
      String(formData.get("application_id") || "").trim() || null;
    const subrolesRaw = String(formData.get("subroles") || "");
    const subroles = subrolesRaw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!discord_username || !roblox_username || !rank_label) {
      return { error: "Discord username, Roblox username and rank are required." };
    }

    const admin = createServiceClient();
    const { data, error } = await admin
      .from("staff_database_entries")
      .insert({
        discord_username,
        roblox_username,
        rank_label,
        subroles,
        date_accepted: date_accepted || new Date().toISOString().slice(0, 10),
        notes,
        application_id,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("*")
      .single();

    if (error) return { error: error.message };

    await admin.from("staff_database_history").insert({
      entry_id: data.id,
      actor_id: user.id,
      action: "created",
      changes: { discord_username, roblox_username, rank_label, subroles },
    });

    revalidatePath("/staff/database");
    return { ok: true, id: data.id as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateStaffDatabaseEntry(
  id: string,
  formData: FormData
) {
  try {
    const user = await requireHt();
    const discord_username = String(formData.get("discord_username") || "").trim();
    const roblox_username = String(formData.get("roblox_username") || "").trim();
    const rank_label = String(formData.get("rank_label") || "").trim();
    const date_accepted = String(formData.get("date_accepted") || "").trim();
    const notes = String(formData.get("notes") || "").trim() || null;
    const subroles = String(formData.get("subroles") || "")
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!discord_username || !roblox_username || !rank_label) {
      return { error: "Required fields missing." };
    }

    const admin = createServiceClient();
    const { data: prev } = await admin
      .from("staff_database_entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const { error } = await admin
      .from("staff_database_entries")
      .update({
        discord_username,
        roblox_username,
        rank_label,
        subroles,
        date_accepted: date_accepted || prev?.date_accepted,
        notes,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { error: error.message };

    await admin.from("staff_database_history").insert({
      entry_id: id,
      actor_id: user.id,
      action: "updated",
      changes: {
        before: prev,
        after: {
          discord_username,
          roblox_username,
          rank_label,
          subroles,
          date_accepted,
          notes,
        },
      },
    });

    revalidatePath("/staff/database");
    revalidatePath(`/staff/database/${id}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

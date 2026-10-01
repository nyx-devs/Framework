"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getOrRefreshGroupRank } from "@/lib/roblox/group";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

function makeCode(): string {
  return "BB-" + randomBytes(3).toString("hex").toUpperCase();
}

/** Resolve Roblox username → user id via public API (not proof of ownership). */
export async function resolveRobloxUsername(
  username: string
): Promise<{ id: number; name: string } | { error: string }> {
  const clean = username.trim().replace(/^@/, "");
  if (!clean || clean.length < 3 || clean.length > 20) {
    return { error: "Enter a valid Roblox username." };
  }
  try {
    const res = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [clean], excludeBannedUsers: true }),
      cache: "no-store",
    });
    if (!res.ok) return { error: "Could not look up that username." };
    const json = (await res.json()) as {
      data?: Array<{ id: number; name: string }>;
    };
    const hit = json.data?.[0];
    if (!hit?.id) return { error: "No Roblox user found with that username." };
    return { id: hit.id, name: hit.name };
  } catch {
    return { error: "Roblox lookup failed. Try again later." };
  }
}

async function fetchRobloxDescription(userId: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://users.roblox.com/v1/users/${userId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { description?: string };
    return json.description || "";
  } catch {
    return null;
  }
}

/**
 * Step 1: user submits username → store pending code (service role).
 * Ownership is NOT claimed yet.
 */
export async function startRobloxLink(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const username = String(formData.get("username") || "").trim();
  const resolved = await resolveRobloxUsername(username);
  if ("error" in resolved) return { error: resolved.error };

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return { error: "Server misconfigured." };
  }

  // Already linked to someone else?
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("roblox_user_id", resolved.id)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) {
    return {
      error: "That Roblox account is already linked to another Ro-School account.",
    };
  }

  const code = makeCode();
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await admin.from("roblox_link_codes").upsert(
    {
      user_id: user.id,
      code,
      roblox_user_id: resolved.id,
      roblox_username: resolved.name,
      expires_at: expires,
      used_at: null,
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/dashboard/profile");
  return {
    ok: true as const,
    code,
    robloxUsername: resolved.name,
    robloxUserId: resolved.id,
  };
}

/**
 * Step 2: verify code appears in Roblox profile description, then link.
 */
export async function confirmRobloxLink() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return { error: "Server misconfigured." };
  }

  const { data: pending } = await admin
    .from("roblox_link_codes")
    .select("*")
    .eq("user_id", user.id)
    .is("used_at", null)
    .maybeSingle();

  if (!pending) {
    return { error: "No pending link. Start by entering your Roblox username." };
  }
  if (new Date(pending.expires_at).getTime() < Date.now()) {
    return { error: "Code expired. Start again." };
  }

  const description = await fetchRobloxDescription(Number(pending.roblox_user_id));
  if (description == null) {
    return { error: "Could not read Roblox profile. Try again." };
  }
  if (!description.includes(pending.code)) {
    return {
      error: `Put the code ${pending.code} in your Roblox profile About section, save, then try again.`,
    };
  }

  // Unique constraint
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("roblox_user_id", pending.roblox_user_id)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) {
    return { error: "That Roblox account is already linked elsewhere." };
  }

  const { error } = await admin
    .from("profiles")
    .update({
      roblox_user_id: pending.roblox_user_id,
      roblox_username: pending.roblox_username,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[roblox/link]", error.message);
    return { error: "Could not save link." };
  }

  await admin
    .from("roblox_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", pending.id);

  await getOrRefreshGroupRank(user.id, Number(pending.roblox_user_id), {
    force: true,
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/");
  return { ok: true as const };
}

export async function unlinkRoblox() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return { error: "Server misconfigured." };
  }

  await admin
    .from("profiles")
    .update({
      roblox_user_id: null,
      roblox_username: null,
      roblox_group_id: null,
      roblox_rank_id: null,
      roblox_rank_name: null,
      roblox_group_member: false,
      roblox_rank_checked_at: null,
    })
    .eq("id", user.id);

  await admin.from("roblox_link_codes").delete().eq("user_id", user.id);

  revalidatePath("/dashboard/profile");
  return { ok: true as const };
}

export async function getPendingRobloxLink() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  try {
    const admin = createServiceClient();
    const { data } = await admin
      .from("roblox_link_codes")
      .select("code, roblox_username, roblox_user_id, expires_at, used_at")
      .eq("user_id", user.id)
      .is("used_at", null)
      .maybeSingle();
    if (!data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function refreshMyRobloxRank() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return { error: "Server misconfigured" };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("roblox_user_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.roblox_user_id) {
    return { error: "Link a Roblox account first" };
  }

  const info = await getOrRefreshGroupRank(
    user.id,
    Number(profile.roblox_user_id),
    { force: true }
  );

  revalidatePath("/dashboard/profile");
  revalidatePath("/");

  if (!info) return { error: "Could not load rank" };
  if (info.source === "unavailable") {
    return {
      error: `Roblox API unavailable (${info.debug || "unknown"}). Check BLUEBIRD_ROBLOX_GROUP_ID on Vercel.`,
    };
  }
  if (!info.isMember) {
    return {
      error: `Not in group ${info.groupId}. Join the Ro-School group on Roblox. (${info.debug || ""})`,
    };
  }
  return {
    ok: true as const,
    rankName: info.rankName,
    rankId: info.rankId,
    band: info.band,
  };
}

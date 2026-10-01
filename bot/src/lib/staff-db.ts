import { getSupabase, resolveDiscordUser } from "./supabase.js";

const HT_ROLE_ID = Number(
  process.env.ROBLOX_HT_ROLE_ID || process.env.BLUEBIRD_HT_ROLE_ID || "590036116"
);
const GROUP_ID = Number(
  process.env.BLUEBIRD_ROBLOX_GROUP_ID || process.env.ROBLOX_GROUP_ID || "0"
);
const HT_RANK_MIN = 120;

export async function isHtPlusDiscord(discordUserId: string): Promise<boolean> {
  const user = await resolveDiscordUser(discordUserId);
  if (!user) return false;
  if (user.isAdmin) return true;

  const sb = getSupabase();
  const { data: profile } = await sb
    .from("profiles")
    .select("role, roblox_user_id, roblox_role_id, roblox_rank_id")
    .eq("id", user.userId)
    .maybeSingle();

  if (profile?.role === "admin") return true;
  if (profile?.roblox_role_id && Number(profile.roblox_role_id) === HT_ROLE_ID) {
    return true;
  }
  if (
    profile?.roblox_rank_id != null &&
    Number(profile.roblox_rank_id) >= HT_RANK_MIN
  ) {
    return true;
  }

  const robloxId = profile?.roblox_user_id
    ? Number(profile.roblox_user_id)
    : null;
  if (!robloxId || !GROUP_ID) return false;

  try {
    const res = await fetch(
      `https://groups.roblox.com/v2/users/${robloxId}/groups/roles`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return false;
    const json = (await res.json()) as {
      data?: Array<{
        group?: { id?: number };
        role?: { id?: number; rank?: number };
      }>;
    };
    const entry = (json.data || []).find(
      (d) => Number(d.group?.id) === Number(GROUP_ID)
    );
    if (!entry?.role) return false;
    if (entry.role.id != null && Number(entry.role.id) === HT_ROLE_ID) return true;
    if (typeof entry.role.rank === "number" && entry.role.rank >= HT_RANK_MIN) {
      return true;
    }
  } catch (e) {
    console.warn("[staff-db] roblox check", e);
  }
  return false;
}

export async function createStaffDbEntry(input: {
  applicationId?: string | null;
  discordUsername: string;
  robloxUsername: string;
  rankLabel: string;
  subroles: string[];
  dateAccepted: string;
  notes: string | null;
  actorUserId: string | null;
  /** pending_review until HT+ approves */
  status?: "pending_review" | "approved";
}) {
  const sb = getSupabase();
  const status = input.status || "pending_review";
  const { data, error } = await sb
    .from("staff_database_entries")
    .insert({
      application_id: input.applicationId || null,
      discord_username: input.discordUsername,
      roblox_username: input.robloxUsername,
      rank_label: input.rankLabel,
      subroles: input.subroles,
      date_accepted: input.dateAccepted,
      notes: input.notes,
      status,
      created_by: input.actorUserId,
      updated_by: input.actorUserId,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await sb.from("staff_database_history").insert({
    entry_id: data.id,
    actor_id: input.actorUserId,
    action: status === "pending_review" ? "submitted_for_review" : "created",
    changes: {
      discord_username: input.discordUsername,
      roblox_username: input.robloxUsername,
      rank_label: input.rankLabel,
      subroles: input.subroles,
      status,
    },
  });

  return data;
}

export async function setStaffDbStatus(
  entryId: string,
  status: "pending_review" | "approved" | "rejected",
  actorUserId: string | null
) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("staff_database_entries")
    .update({
      status,
      updated_by: actorUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await sb.from("staff_database_history").insert({
    entry_id: entryId,
    actor_id: actorUserId,
    action: `status_${status}`,
    changes: { status },
  });
  return data;
}

export async function searchStaffDb(q: string, limit = 15) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("staff_database_entries")
    .select(
      "id, discord_username, roblox_username, rank_label, subroles, date_accepted, notes, status"
    )
    .order("date_accepted", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const needle = q.trim().toLowerCase();
  let rows = data || [];
  if (needle) {
    rows = rows.filter(
      (r) =>
        r.discord_username?.toLowerCase().includes(needle) ||
        r.roblox_username?.toLowerCase().includes(needle) ||
        r.rank_label?.toLowerCase().includes(needle) ||
        (r.notes || "").toLowerCase().includes(needle)
    );
  }
  return rows.slice(0, limit);
}

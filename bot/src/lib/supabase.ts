import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Service-role client — bot only. Never expose this key. */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the bot"
    );
  }
  client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

export type Ro-SchoolUser = {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: string;
  schoolEmail: string | null;
  memberCode: string | null;
  discordUserId: string;
  discordUsername: string | null;
  isStaff: boolean;
  isAdmin: boolean;
};

export async function resolveDiscordUser(
  discordUserId: string
): Promise<Ro-SchoolUser | null> {
  const sb = getSupabase();
  const { data: conn } = await sb
    .from("discord_connections")
    .select("user_id, discord_user_id, discord_username")
    .eq("discord_user_id", discordUserId)
    .maybeSingle();

  if (!conn?.user_id) return null;

  const { data: profile } = await sb
    .from("profiles")
    .select("id, email, full_name, role, school_email, member_code")
    .eq("id", conn.user_id)
    .maybeSingle();

  if (!profile) return null;

  const role = profile.role || "applicant";
  return {
    userId: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role,
    schoolEmail: profile.school_email,
    memberCode: profile.member_code || null,
    discordUserId: conn.discord_user_id,
    discordUsername: conn.discord_username,
    isStaff: role === "staff" || role === "admin",
    isAdmin: role === "admin",
  };
}

export async function isStaffByDiscord(discordUserId: string): Promise<boolean> {
  const u = await resolveDiscordUser(discordUserId);
  if (!u) return false;
  if (u.isStaff) return true;

  // Also check staff_profiles
  const sb = getSupabase();
  const { data } = await sb
    .from("staff_profiles")
    .select("id, is_active")
    .eq("user_id", u.userId)
    .eq("is_active", true)
    .maybeSingle();
  return !!data;
}

/**
 * Roblox integration – SERVER ONLY.
 */
export type RobloxUserSummary = {
  userId: number;
  username: string;
  displayName: string;
};

export type RobloxLinkStatus = {
  linked: boolean;
  robloxUserId: number | null;
  username: string | null;
  displayName: string | null;
  verifiedAt: string | null;
};

export {
  BLUEBIRD_GROUP_ID,
  BLUEBIRD_RANKS,
  bandFromRankId,
  profileRoleFromBand,
  bandHasPermission,
  isStaffBand,
  type BluebirdRankBand,
} from "@/lib/roblox/ranks";

export {
  fetchGroupRankForUser,
  getOrRefreshGroupRank,
  type GroupRankInfo,
} from "@/lib/roblox/group";

function getOpenCloudApiKey(): string | null {
  return process.env.ROBLOX_OPEN_CLOUD_API_KEY || null;
}

export function isRobloxConfigured(): boolean {
  return Boolean(
    getOpenCloudApiKey() ||
      process.env.ROBLOX_OAUTH_CLIENT_ID ||
      process.env.BLUEBIRD_ROBLOX_GROUP_ID
  );
}

export async function lookupUserByUsername(
  username: string
): Promise<{ ok: true; user: RobloxUserSummary } | { ok: false; error: string }> {
  void username;
  if (!getOpenCloudApiKey()) {
    return { ok: false, error: "Roblox Open Cloud is not configured on this server." };
  }
  return { ok: false, error: "Roblox user lookup is not implemented yet." };
}

export async function getLinkedRobloxAccount(
  profileId: string
): Promise<RobloxLinkStatus> {
  try {
    const { createServiceClient } = await import("@/lib/supabase/admin");
    const admin = createServiceClient();
    const { data } = await admin
      .from("profiles")
      .select("roblox_user_id, roblox_username, roblox_display_name, roblox_verified_at")
      .eq("id", profileId)
      .maybeSingle();
    if (!data?.roblox_user_id) {
      return {
        linked: false,
        robloxUserId: null,
        username: null,
        displayName: null,
        verifiedAt: null,
      };
    }
    return {
      linked: true,
      robloxUserId: Number(data.roblox_user_id),
      username: data.roblox_username,
      displayName: data.roblox_display_name,
      verifiedAt: data.roblox_verified_at,
    };
  } catch {
    return {
      linked: false,
      robloxUserId: null,
      username: null,
      displayName: null,
      verifiedAt: null,
    };
  }
}

export async function beginRobloxLink(
  profileId: string
): Promise<{ ok: boolean; authorizeUrl?: string; error?: string }> {
  void profileId;
  if (!process.env.ROBLOX_OAUTH_CLIENT_ID) {
    return { ok: false, error: "Roblox OAuth is not configured." };
  }
  return { ok: false, error: "Roblox account linking is not implemented yet." };
}

export async function syncGroupRankForUser(
  robloxUserId: number
): Promise<{ ok: boolean; rank?: number; error?: string }> {
  const { fetchGroupRankForUser } = await import("@/lib/roblox/group");
  const info = await fetchGroupRankForUser(robloxUserId);
  if (info.source === "unavailable") {
    return { ok: false, error: "Roblox group API unavailable" };
  }
  return { ok: true, rank: info.rankId ?? undefined };
}

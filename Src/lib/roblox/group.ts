/**
 * Roblox group rank — SERVER ONLY.
 * Prefer public groups API (returns role.rank 0–255 and role.id).
 */
import {
  bandFromRankId,
  profileRoleFromBand,
  type BluebirdRankBand,
} from "@/lib/roblox/ranks";
import { createServiceClient } from "@/lib/supabase/admin";

export type GroupRankInfo = {
  groupId: number;
  isMember: boolean;
  rankId: number | null;
  /** Roblox group role unique id (not 0–255 rank). */
  roleId: number | null;
  rankName: string | null;
  band: BluebirdRankBand;
  checkedAt: string;
  source: "api" | "cache" | "unavailable";
  debug?: string;
};

const CACHE_MS = 2 * 60 * 1000;

function configuredGroupId(): number {
  const raw =
    process.env.BLUEBIRD_ROBLOX_GROUP_ID ||
    process.env.ROBLOX_GROUP_ID ||
    "0";
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? n : 0;
}

async function fetchViaPublicApi(
  robloxUserId: number,
  groupId: number,
  checkedAt: string
): Promise<GroupRankInfo | null> {
  try {
    const res = await fetch(
      `https://groups.roblox.com/v2/users/${robloxUserId}/groups/roles`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    );
    if (!res.ok) {
      return {
        groupId,
        isMember: false,
        rankId: null,
        roleId: null,
        rankName: null,
        band: "none",
        checkedAt,
        source: "unavailable",
        debug: `public_api_http_${res.status}`,
      };
    }
    const json = (await res.json()) as {
      data?: Array<{
        group?: { id?: number };
        role?: { id?: number; name?: string; rank?: number };
      }>;
    };
    const data = json.data || [];
    const entry = data.find((d) => Number(d.group?.id) === Number(groupId));
    if (entry?.role) {
      const rankId =
        typeof entry.role.rank === "number"
          ? entry.role.rank
          : entry.role.rank != null
            ? Number(entry.role.rank)
            : null;
      return {
        groupId,
        isMember: true,
        rankId: rankId != null && Number.isFinite(rankId) ? rankId : null,
        roleId: entry.role.id != null ? Number(entry.role.id) : null,
        rankName: entry.role.name || null,
        band: bandFromRankId(rankId),
        checkedAt,
        source: "api",
        debug: `public_ok_rank_${rankId}`,
      };
    }
    return {
      groupId,
      isMember: false,
      rankId: null,
      roleId: null,
      rankName: null,
      band: "none",
      checkedAt,
      source: "api",
      debug: `public_ok_not_in_group_among_${data.length}_groups`,
    };
  } catch (e) {
    console.warn("[roblox/group] public API", e);
    return null;
  }
}

export async function fetchGroupRankForUser(
  robloxUserId: number
): Promise<GroupRankInfo> {
  const groupId = configuredGroupId();
  const checkedAt = new Date().toISOString();
  if (!groupId) {
    return {
      groupId: 0,
      isMember: false,
      rankId: null,
      roleId: null,
      rankName: null,
      band: "none",
      checkedAt,
      source: "unavailable",
      debug: "no_group_id_configured",
    };
  }
  const viaPublic = await fetchViaPublicApi(robloxUserId, groupId, checkedAt);
  if (viaPublic) return viaPublic;
  return {
    groupId,
    isMember: false,
    rankId: null,
    roleId: null,
    rankName: null,
    band: "none",
    checkedAt,
    source: "unavailable",
    debug: "public_api_failed",
  };
}

/**
 * Read cached rank or refresh from Roblox and persist on profiles.
 */
export async function getOrRefreshGroupRank(
  profileId: string,
  robloxUserId: number,
  opts?: { force?: boolean }
): Promise<GroupRankInfo> {
  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "role, roblox_rank_id, roblox_role_id, roblox_rank_name, roblox_group_member, roblox_rank_checked_at, roblox_group_id"
    )
    .eq("id", profileId)
    .maybeSingle();

  const checked = profile?.roblox_rank_checked_at
    ? new Date(profile.roblox_rank_checked_at).getTime()
    : 0;
  const fresh = Date.now() - checked < CACHE_MS;

  if (!opts?.force && fresh && profile?.roblox_rank_checked_at) {
    const rankId = profile.roblox_rank_id as number | null;
    return {
      groupId: Number(profile.roblox_group_id) || configuredGroupId(),
      isMember: Boolean(profile.roblox_group_member),
      rankId,
      roleId:
        profile.roblox_role_id != null
          ? Number(profile.roblox_role_id)
          : null,
      rankName: profile.roblox_rank_name,
      band: profile.roblox_group_member ? bandFromRankId(rankId) : "none",
      checkedAt: profile.roblox_rank_checked_at,
      source: "cache",
    };
  }

  const info = await fetchGroupRankForUser(robloxUserId);

  if (info.source === "unavailable") {
    if (profile?.roblox_rank_checked_at) {
      const rankId = profile.roblox_rank_id as number | null;
      return {
        groupId: Number(profile.roblox_group_id) || configuredGroupId(),
        isMember: Boolean(profile.roblox_group_member),
        rankId,
        roleId:
          profile.roblox_role_id != null
            ? Number(profile.roblox_role_id)
            : null,
        rankName: profile.roblox_rank_name,
        band: profile.roblox_group_member
          ? bandFromRankId(rankId)
          : "none",
        checkedAt: profile.roblox_rank_checked_at,
        source: "unavailable",
        debug: info.debug,
      };
    }
    return info;
  }

  const patch: Record<string, unknown> = {
    roblox_group_id: info.groupId || null,
    roblox_rank_id: info.rankId,
    roblox_role_id: info.roleId,
    roblox_rank_name: info.rankName,
    roblox_group_member: info.isMember,
    roblox_rank_checked_at: info.checkedAt,
  };

  const currentRole = (profile?.role as string) || "applicant";
  const derived = profileRoleFromBand(info.band);

  if (currentRole !== "admin") {
    if (info.isMember && derived === "admin") patch.role = "admin";
    else if (info.isMember && derived === "staff") patch.role = "staff";
    else if (!info.isMember && currentRole === "staff") patch.role = "applicant";
  }

  const { error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", profileId);
  if (error) console.error("[roblox/group] update", error.message);

  return info;
}

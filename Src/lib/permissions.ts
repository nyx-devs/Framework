import { createClient } from "@/lib/supabase/server";
import {
  bandHasPermission,
  isStaffBand,
  type BluebirdRankBand,
} from "@/lib/roblox/ranks";
import { getOrRefreshGroupRank } from "@/lib/roblox/group";

export type PermissionKey =
  | "applications.view"
  | "applications.review"
  | "applications.assign"
  | "applications.message"
  | "applications.interview"
  | "applications.accept"
  | "applications.reject"
  | "merits.view_own"
  | "merits.view"
  | "merits.award"
  | "merits.award_bad"
  | "merits.remove"
  | "merits.manage"
  | "staff.view"
  | "staff.create"
  | "staff.edit"
  | "staff.disable"
  | "positions.view"
  | "positions.create"
  | "positions.edit"
  | "positions.delete"
  | "departments.view"
  | "departments.manage"
  | "audit.view"
  | "discord.manage"
  | "settings.manage"
  | "notifications.view"
  | "notifications.manage"
  | "sessions.view"
  | "sessions.create"
  | "sessions.edit"
  | "sessions.cancel"
  | "sessions.attendance"
  | "safeguarding.create"
  | "safeguarding.view"
  | "safeguarding.manage"
  | "safeguarding.assign"
  | "safeguarding.resolve"
  | "safeguarding.audit"
  | "staff_database.view"
  | "staff_database.edit"
  | "staff_database.create";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

/**
 * Server-side permission check.
 * Order: profile.admin → Roblox group rank band → staff_profiles RBAC.
 * Never trust browser-submitted roles.
 */
export async function hasPermission(key: PermissionKey): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, roblox_user_id, roblox_rank_id, roblox_role_id, roblox_group_member, roblox_rank_checked_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") return true;

  // Roblox group–derived band (refresh if linked)
  if (profile?.roblox_user_id) {
    try {
      const info = await getOrRefreshGroupRank(
        user.id,
        Number(profile.roblox_user_id)
      );
      if (info && bandHasPermission(info.band, key)) return true;
      // Demoted / left group: do not fall through to stale staff_profiles alone for staff keys
      if (info && !info.isMember && key.startsWith("merits.award")) {
        return false;
      }
    } catch (e) {
      console.warn("[permissions] group rank check", e);
    }
  }

  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("id, is_active, role_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!staff?.role_id) {
    // Students: allow view_own merits
    if (key === "merits.view_own" || key === "notifications.view") return true;
    return false;
  }

  const { data: perms } = await supabase
    .from("role_permissions")
    .select("permission:permissions(key)")
    .eq("role_id", staff.role_id);

  if (!perms) return false;

  return perms.some((row) => {
    const p = row.permission as { key?: string } | null;
    return p?.key === key;
  });
}

export async function requirePermission(key: PermissionKey) {
  const ok = await hasPermission(key);
  if (!ok) throw new Error("FORBIDDEN");
}

export async function getStaffContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, roblox_user_id, roblox_username, roblox_rank_id, roblox_rank_name, roblox_group_member, roblox_rank_checked_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  // Refresh group rank when opening staff portal
  let band: BluebirdRankBand = "none";
  if (profile?.roblox_user_id) {
    try {
      const info = await getOrRefreshGroupRank(
        user.id,
        Number(profile.roblox_user_id)
      );
      band = info?.band || "none";
    } catch {
      /* ignore */
    }
  }

  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("id, is_active, role_id, display_name, department_id, role:roles(id, key, name), department:departments(id, name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  const isStaff =
    profile?.role === "admin" ||
    profile?.role === "staff" ||
    Boolean(staff) ||
    isStaffBand(band);

  if (!isStaff) return null;

  return { user, profile, staff, band };
}

export async function requireStaff() {
  const ctx = await getStaffContext();
  if (!ctx) throw new Error("FORBIDDEN");
  return ctx;
}


/** Roblox group *role* id for HT+ (not rank 0–255). Default from school group. */
export function configuredHtRoleId(): number {
  const n = Number(
    process.env.ROBLOX_HT_ROLE_ID || process.env.BLUEBIRD_HT_ROLE_ID || "590036116"
  );
  return Number.isFinite(n) ? n : 590036116;
}

/**
 * HT+ staff database access: admin profile, HT+ band, or matching Roblox role id.
 */
export async function canAccessStaffDatabase(): Promise<boolean> {
  if (await hasPermission("staff_database.view")) return true;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, roblox_user_id, roblox_role_id, roblox_rank_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "admin") return true;
  const htRole = configuredHtRoleId();
  if (profile?.roblox_role_id && Number(profile.roblox_role_id) === htRole) {
    return true;
  }
  // Rank bands HT+
  if (profile?.roblox_user_id) {
    try {
      const info = await getOrRefreshGroupRank(
        user.id,
        Number(profile.roblox_user_id)
      );
      if (
        info?.band === "headteacher" ||
        info?.band === "deputy_head" ||
        info?.band === "owner" ||
        info?.band === "administration"
      ) {
        return true;
      }
      if (info?.roleId != null && Number(info.roleId) === htRole) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

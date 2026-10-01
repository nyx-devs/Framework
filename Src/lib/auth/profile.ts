"use server";

import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { discordAvatarUrl } from "@/lib/discord";
import { ensureSchoolEmail } from "@/lib/mail/actions";
import { ensureMemberCode } from "@/lib/member/code";
import { getOrRefreshGroupRank } from "@/lib/roblox/group";

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  member_code?: string | null;
};

export type DiscordConnectionRow = {
  discord_user_id: string;
  discord_username: string;
  discord_global_name: string | null;
  discord_avatar: string | null;
  avatar_url: string;
  display_name: string;
};

export async function ensureProfile(user: User): Promise<ProfileRow | null> {
  const supabase = await createClient();

  const meta = user.user_metadata || {};
  const fullName =
    (meta.full_name as string | undefined)?.trim() ||
    (meta.name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Member";

  const email = user.email || "";
  const avatarFromMeta =
    (meta.avatar_url as string | undefined) ||
    (meta.picture as string | undefined) ||
    null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  let profile: ProfileRow | null = null;

  if (existing) {
    const needsUpdate =
      (!existing.full_name && fullName) ||
      (existing.email !== email && email) ||
      (!existing.avatar_url && avatarFromMeta);

    if (needsUpdate) {
      const { data: updated } = await supabase
        .from("profiles")
        .update({
          email: email || existing.email,
          full_name: existing.full_name || fullName,
          avatar_url: existing.avatar_url || avatarFromMeta,
        })
        .eq("id", user.id)
        .select("id, email, full_name, role, avatar_url")
        .maybeSingle();
      profile = (updated as ProfileRow) || (existing as ProfileRow);
    } else {
      profile = existing as ProfileRow;
    }
  } else {
    const { data: created, error } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email,
        full_name: fullName,
        role: "applicant",
        avatar_url: avatarFromMeta,
      })
      .select("id, email, full_name, role, avatar_url")
      .maybeSingle();

    if (error) {
      const { data: again } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (again) {
        profile = again as ProfileRow;
      } else {
        console.error("[ensureProfile] insert failed", error.message);
        return null;
      }
    } else {
      profile = created as ProfileRow;
    }
  }

  await syncDiscordConnectionFromUser(user).catch((err) => {
    console.error("[ensureProfile] discord sync failed", err);
  });

  await ensureSchoolEmail(user.id, profile?.full_name).catch((err) => {
    console.error("[ensureProfile] school email failed", err);
  });

  try {
    const { data: rbx } = await supabase
      .from("profiles")
      .select("roblox_user_id")
      .eq("id", user.id)
      .maybeSingle();
    if (rbx?.roblox_user_id) {
      await getOrRefreshGroupRank(user.id, Number(rbx.roblox_user_id));
    }
  } catch (e) {
    console.warn("[ensureProfile] rank refresh", e);
  }
  await ensureMemberCode(user.id).catch((err) => {
    console.error("[ensureProfile] member code failed", err);
  });

  return profile;
}

export async function syncDiscordConnectionFromUser(
  user: User
): Promise<void> {
  const identities = user.identities || [];
  const discordIdentity = identities.find((i) => i.provider === "discord");
  if (!discordIdentity) return;

  const data = (discordIdentity.identity_data || {}) as Record<string, unknown>;
  const discordUserId = String(
    data.provider_id || data.sub || discordIdentity.id || ""
  );
  if (!discordUserId) return;

  const username = String(
    data.preferred_username || data.name || data.full_name || "discord_user"
  );

  const globalName =
    (typeof data.custom_claims === "object" &&
      data.custom_claims &&
      (data.custom_claims as { global_name?: string }).global_name) ||
    (typeof data.full_name === "string" ? data.full_name : null) ||
    null;

  let avatarHash: string | null = null;
  const avatarUrl = (data.avatar_url || data.picture) as string | undefined;
  if (avatarUrl && avatarUrl.includes("/avatars/")) {
    const parts = avatarUrl.split("/");
    const file = parts[parts.length - 1] || "";
    avatarHash =
      file.split("?")[0]?.replace(/\.(png|jpg|jpeg|gif|webp)$/i, "") || null;
  } else if (typeof data.avatar === "string") {
    avatarHash = data.avatar;
  }

  const supabase = await createClient();

  const { data: existingByDiscord } = await supabase
    .from("discord_connections")
    .select("user_id")
    .eq("discord_user_id", discordUserId)
    .maybeSingle();

  if (existingByDiscord && existingByDiscord.user_id !== user.id) {
    console.warn(
      "[syncDiscordConnection] Discord ID already linked to another account",
      discordUserId
    );
    return;
  }

  await supabase.from("discord_connections").upsert(
    {
      user_id: user.id,
      discord_user_id: discordUserId,
      discord_username: username,
      discord_global_name: globalName,
      discord_avatar: avatarHash,
      linked_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  const displayName = (globalName || username || "").trim() || null;
  const resolvedAvatar = discordAvatarUrl(discordUserId, avatarHash);

  await supabase
    .from("profiles")
    .update({
      ...(displayName ? { full_name: displayName } : {}),
      avatar_url: resolvedAvatar,
    })
    .eq("id", user.id);
}

export async function getDiscordConnection(
  userId: string
): Promise<DiscordConnectionRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("discord_connections")
    .select(
      "discord_user_id, discord_username, discord_global_name, discord_avatar"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.discord_user_id) return null;

  const displayName =
    data.discord_global_name?.trim() ||
    data.discord_username ||
    "Discord user";

  return {
    discord_user_id: data.discord_user_id,
    discord_username: data.discord_username,
    discord_global_name: data.discord_global_name,
    discord_avatar: data.discord_avatar,
    avatar_url: discordAvatarUrl(data.discord_user_id, data.discord_avatar),
    display_name: displayName,
  };
}

export async function getSessionProfile(): Promise<{
  user: User;
  profile: ProfileRow;
  discord: DiscordConnectionRow | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await ensureProfile(user);
  const discord = await getDiscordConnection(user.id);

  if (!profile) {
    return {
      user,
      profile: {
        id: user.id,
        email: user.email || "",
        full_name:
          discord?.display_name ||
          (user.user_metadata?.full_name as string) ||
          user.email?.split("@")[0] ||
          "Member",
        role: "applicant",
        avatar_url: discord?.avatar_url || null,
      },
      discord,
    };
  }

  return { user, profile, discord };
}

/**
 * Discord integration – SERVER ONLY.
 * Never import this module into client components.
 * Bot token and guild ID must stay in server env vars.
 */

import { createClient } from "@/lib/supabase/server";

const DISCORD_API = "https://discord.com/api/v10";

function getBotToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN || null;
}

function getGuildId(): string | null {
  return process.env.DISCORD_GUILD_ID || null;
}

export type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
  url?: string;
};

export async function sendChannelMessage(
  channelId: string,
  content: string,
  embeds?: DiscordEmbed[]
): Promise<{ ok: boolean; error?: string }> {
  const token = getBotToken();
  if (!token) {
    return { ok: false, error: "Discord bot token not configured" };
  }
  if (!channelId) {
    return { ok: false, error: "No channel ID" };
  }

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: content || undefined,
        embeds: embeds?.length ? embeds : undefined,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[discord] send failed", res.status, text);
      return { ok: false, error: `Discord API ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[discord] network error", err);
    return { ok: false, error: "Discord network error" };
  }
}

/** Resolve channel ID for a purpose + optional department */
export async function getDiscordChannelId(
  purpose: string,
  departmentId?: string | null
): Promise<string | null> {
  try {
    const supabase = await createClient();
    if (departmentId) {
      const { data } = await supabase
        .from("discord_channels")
        .select("channel_id")
        .eq("purpose", purpose)
        .eq("department_id", departmentId)
        .eq("is_active", true)
        .maybeSingle();
      if (data?.channel_id) return data.channel_id;
    }
    // Fallback: global purpose channel (department_id null)
    const { data } = await supabase
      .from("discord_channels")
      .select("channel_id")
      .eq("purpose", purpose)
      .is("department_id", null)
      .eq("is_active", true)
      .maybeSingle();
    return data?.channel_id || null;
  } catch {
    return null;
  }
}

export async function notifyNewApplication(params: {
  referenceCode: string;
  applicantName: string;
  positionTitle: string;
  departmentName?: string | null;
  departmentId?: string | null;
  applicationId: string;
  siteUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const channelId = await getDiscordChannelId(
    "recruitment",
    params.departmentId
  );
  if (!channelId) {
    return { ok: false, error: "No recruitment channel configured" };
  }

  const viewUrl = `${params.siteUrl}/staff/applications/${params.applicationId}`;

  return sendChannelMessage(channelId, "", [
    {
      title: "New application",
      color: 0x1a3a6b,
      fields: [
        { name: "Applicant", value: params.applicantName, inline: true },
        { name: "Position", value: params.positionTitle, inline: true },
        {
          name: "Department",
          value: params.departmentName || "—",
          inline: true,
        },
        { name: "Reference", value: params.referenceCode, inline: true },
        { name: "Status", value: "Submitted", inline: true },
      ],
      footer: { text: "Ro-School · Staff Portal" },
      timestamp: new Date().toISOString(),
      url: viewUrl,
      description: `[View application](${viewUrl})`,
    },
  ]);
}

export async function notifyStatusChange(params: {
  referenceCode: string;
  positionTitle: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  applicationId: string;
  departmentId?: string | null;
  siteUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const channelId = await getDiscordChannelId(
    "recruitment",
    params.departmentId
  );
  if (!channelId) return { ok: false, error: "No channel configured" };

  const viewUrl = `${params.siteUrl}/staff/applications/${params.applicationId}`;

  return sendChannelMessage(channelId, "", [
    {
      title: "Application updated",
      color: 0x2a5a9e,
      fields: [
        { name: "Reference", value: params.referenceCode, inline: true },
        { name: "Position", value: params.positionTitle, inline: true },
        {
          name: "Status",
          value: `${params.fromStatus} → ${params.toStatus}`,
          inline: false,
        },
        { name: "Changed by", value: params.changedBy, inline: true },
      ],
      description: `[View application](${viewUrl})`,
      footer: { text: "Ro-School" },
      timestamp: new Date().toISOString(),
    },
  ]);
}

export async function notifyInterviewScheduled(params: {
  referenceCode: string;
  positionTitle: string;
  when: string;
  location: string;
  applicationId: string;
  siteUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const channelId = await getDiscordChannelId("interviews");
  if (!channelId) return { ok: false, error: "No interview channel configured" };

  const viewUrl = `${params.siteUrl}/staff/applications/${params.applicationId}`;

  return sendChannelMessage(channelId, "", [
    {
      title: "Interview scheduled",
      color: 0xc9a227,
      fields: [
        { name: "Reference", value: params.referenceCode, inline: true },
        { name: "Position", value: params.positionTitle, inline: true },
        { name: "When", value: params.when, inline: false },
        { name: "Location", value: params.location || "TBC", inline: true },
      ],
      description: `[View application](${viewUrl})`,
      footer: { text: "Ro-School · Do not share applicant details in open channels" },
      timestamp: new Date().toISOString(),
    },
  ]);
}

/** Optional: sync Discord roles when Ro-School role changes. Never trust Discord for auth. */
export async function syncDiscordRolesForUser(
  discordUserId: string,
  bluebirdRoleKey: string
): Promise<{ ok: boolean; error?: string }> {
  const token = getBotToken();
  const guildId = getGuildId();
  if (!token || !guildId) {
    return { ok: false, error: "Discord not configured" };
  }

  try {
    const supabase = await createClient();
    const { data: mappings } = await supabase
      .from("discord_role_mappings")
      .select("discord_role_id, role:roles(key), sync_enabled");

    const active = (mappings || []).filter((m) => m.sync_enabled);
    const target = active.find((m) => {
      const r = m.role as { key?: string } | null;
      return r?.key === bluebirdRoleKey;
    });

    // Remove other mapped roles, add target
    for (const m of active) {
      const roleId = m.discord_role_id;
      const r = m.role as { key?: string } | null;
      const shouldHave = r?.key === bluebirdRoleKey;
      const method = shouldHave ? "PUT" : "DELETE";
      await fetch(
        `${DISCORD_API}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
        {
          method,
          headers: { Authorization: `Bot ${token}` },
        }
      ).catch(() => null);
    }

    if (!target) {
      return { ok: true }; // nothing to assign
    }
    return { ok: true };
  } catch (err) {
    console.error("[discord] role sync failed", err);
    return { ok: false, error: "Role sync failed" };
  }
}


/**
 * Build a public Discord CDN avatar URL from user id + avatar hash.
 * Falls back to Discord's default embed avatar when no custom avatar exists.
 */
export function discordAvatarUrl(
  discordUserId: string,
  avatarHash: string | null | undefined,
  size = 128
): string {
  if (avatarHash) {
    const ext = avatarHash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${discordUserId}/${avatarHash}.${ext}?size=${size}`;
  }
  let index = 0;
  try {
    index = Number((BigInt(discordUserId) >> BigInt(22)) % BigInt(6));
  } catch {
    index = 0;
  }
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

/**
 * Open (or reuse) a DM channel with a Discord user and send a message.
 * Requires the bot to share a mutual server with the user.
 * Never include private application answers in DMs.
 */
export async function sendDirectMessage(
  discordUserId: string,
  content: string,
  embeds?: DiscordEmbed[]
): Promise<{ ok: boolean; error?: string }> {
  const token = getBotToken();
  if (!token) {
    return { ok: false, error: "Discord bot token not configured" };
  }
  if (!discordUserId) {
    return { ok: false, error: "No Discord user ID" };
  }

  try {
    const channelRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: discordUserId }),
    });

    if (!channelRes.ok) {
      const text = await channelRes.text().catch(() => "");
      console.error("[discord] DM channel failed", channelRes.status, text);
      return { ok: false, error: `Discord DM channel ${channelRes.status}` };
    }

    const channel = (await channelRes.json()) as { id?: string };
    if (!channel.id) {
      return { ok: false, error: "No DM channel id" };
    }

    return sendChannelMessage(channel.id, content, embeds);
  } catch (err) {
    console.error("[discord] DM network error", err);
    return { ok: false, error: "Discord DM network error" };
  }
}

/** Check whether a Discord user is a member of the configured guild. */
export async function isGuildMember(discordUserId: string): Promise<boolean> {
  const token = getBotToken();
  const guildId = getGuildId();
  if (!token || !guildId || !discordUserId) return false;

  try {
    const res = await fetch(
      `${DISCORD_API}/guilds/${guildId}/members/${discordUserId}`,
      {
        headers: { Authorization: `Bot ${token}` },
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Notify an applicant via Discord DM about an application status change.
 * Looks up discord_connections by Ro-School user id. Does not send private answers.
 */
export async function notifyApplicantStatusDm(params: {
  applicantUserId: string;
  referenceCode: string;
  positionTitle: string;
  toStatus: string;
  siteUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: conn } = await supabase
      .from("discord_connections")
      .select("discord_user_id, discord_username")
      .eq("user_id", params.applicantUserId)
      .maybeSingle();

    if (!conn?.discord_user_id) {
      return { ok: false, error: "Applicant has no linked Discord account" };
    }

    const statusLabel = params.toStatus.replace(/_/g, " ");
    const viewUrl = `${params.siteUrl}/dashboard/applications`;

    return sendDirectMessage(conn.discord_user_id, "", [
      {
        title: "Application status update",
        color: 0x1a3a6b,
        description:
          `Your application for **${params.positionTitle}** (${params.referenceCode}) is now: **${statusLabel}**.\n\n` +
          `[View your applications](${viewUrl})`,
        footer: { text: "Ro-School" },
        timestamp: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.error("[discord] applicant DM failed", err);
    return { ok: false, error: "Applicant DM failed" };
  }
}


/**
 * DM a Ro-School user by their website user id (looks up discord_connections).
 * Used for mail, notifications, status updates, etc.
 */
export async function notifyBluebirdUserDm(params: {
  userId: string;
  title: string;
  description: string;
  url?: string;
  color?: number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: conn } = await supabase
      .from("discord_connections")
      .select("discord_user_id")
      .eq("user_id", params.userId)
      .maybeSingle();

    if (!conn?.discord_user_id) {
      return { ok: false, error: "No linked Discord account" };
    }

    return sendDirectMessage(conn.discord_user_id, "", [
      {
        title: params.title,
        description: params.description,
        color: params.color ?? 0x1a3a6b,
        url: params.url,
        footer: { text: "Ro-School" },
        timestamp: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.error("[discord] notifyBluebirdUserDm failed", err);
    return { ok: false, error: "DM failed" };
  }
}

export function getDiscordOAuthUrl(state: string, redirectUri: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) throw new Error("DISCORD_CLIENT_ID not set");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCode(
  code: string,
  redirectUri: string
): Promise<{
  id: string;
  username: string;
  global_name?: string;
  avatar?: string;
} | null> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) return null;
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) return null;

  const userRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) return null;
  const user = (await userRes.json()) as {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string;
  };
  return user;
}

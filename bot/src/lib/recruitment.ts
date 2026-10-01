import {
  Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from "discord.js";
import {
  APPLY_CHANNEL_ID,
  DATABASE_CHANNEL_ID,
  DECISIONS_CHANNEL_ID,
  HT_REVIEW_CHANNEL_ID,
} from "./channels.js";
import { getSupabase } from "./supabase.js";

const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://your-school.vercel.app"
).replace(/\/$/, "");

export function applyEmbed() {
  return new EmbedBuilder()
    .setColor(0x1e4d8c)
    .setTitle("Apply for staff — Ro-School")
    .setDescription(
      [
        "Want to join the staff team?",
        "",
        "**How to apply**",
        "1. Sign in on the website",
        "2. Open **Positions** and choose a role",
        "3. Submit your application",
        "",
        "You will be told here when there is a decision.",
        "",
        `[Positions](${SITE}/positions) · [Sign in](${SITE}/login)`,
      ].join("\n")
    )
    .setFooter({ text: "Ro-School" })
    .setTimestamp();
}

export function applyButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("View positions")
      .setStyle(ButtonStyle.Link)
      .setURL(`${SITE}/positions`),
    new ButtonBuilder()
      .setLabel("Sign in / apply")
      .setStyle(ButtonStyle.Link)
      .setURL(`${SITE}/login?redirect=/positions`)
  );
}

export async function ensureApplyEmbed(client: Client) {
  const channelId = APPLY_CHANNEL_ID;
  if (!channelId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased() || channel.isDMBased()) return;
    const text = channel as TextChannel;
    const messages = await text.messages.fetch({ limit: 15 });
    const existing = messages.find(
      (m) =>
        m.author.id === client.user?.id &&
        m.embeds[0]?.title?.includes("Apply for staff")
    );
    if (existing) {
      await existing.edit({
        embeds: [applyEmbed()],
        components: [applyButtons()],
      });
      return;
    }
    await text.send({ embeds: [applyEmbed()], components: [applyButtons()] });
  } catch (e) {
    console.warn("[recruitment] ensureApplyEmbed", e);
  }
}

/**
 * After accept: post in DATABASE channel explaining what to fill out,
 * with button that opens the staff-db modal (or website form).
 */

/** Persistent embed in database channel: Been accepted? Add yourself. */
export function databaseSelfServeEmbed() {
  return new EmbedBuilder()
    .setColor(0x1e4d8c)
    .setTitle("Been accepted? Add yourself to the staff database")
    .setDescription(
      [
        "If your staff application has been **accepted**, complete your entry here.",
        "",
        "**You will need**",
        "• Discord username",
        "• Roblox username",
        "• Rank",
        "• Subrole(s) (if any)",
        "• Notes (optional)",
        "",
        "Click **Add me to the database** below. Your entry is sent to **HT+** for review.",
        "",
        "Only use this after you have been accepted.",
      ].join("\n")
    )
    .setFooter({ text: "Ro-School · Staff database" })
    .setTimestamp();
}

export function databaseSelfServeButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("staff_db_fill:manual")
      .setLabel("Add me to the database")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setLabel("Open on website")
      .setStyle(ButtonStyle.Link)
      .setURL(`${SITE}/staff/database/new`)
  );
}

/** Post or refresh the self-serve database embed */
export async function ensureDatabaseEmbed(client: Client) {
  const channelId = DATABASE_CHANNEL_ID;
  if (!channelId) {
    console.warn("[recruitment] DISCORD_DATABASE_CHANNEL_ID not set");
    return;
  }
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased() || channel.isDMBased()) {
      console.warn("[recruitment] database channel not text", channelId);
      return;
    }
    const text = channel as TextChannel;
    const messages = await text.messages.fetch({ limit: 20 });
    const existing = messages.find(
      (m) =>
        m.author.id === client.user?.id &&
        (m.embeds[0]?.title?.includes("Add yourself to the staff database") ||
          m.embeds[0]?.title?.includes("Been accepted?"))
    );
    if (existing) {
      await existing.edit({
        embeds: [databaseSelfServeEmbed()],
        components: [databaseSelfServeButtons()],
      });
      console.log("[recruitment] refreshed database embed", existing.id);
      return;
    }
    const msg = await text.send({
      embeds: [databaseSelfServeEmbed()],
      components: [databaseSelfServeButtons()],
    });
    console.log("[recruitment] posted database embed", msg.id);
  } catch (e) {
    console.warn("[recruitment] ensureDatabaseEmbed", e);
  }
}


export async function postDatabaseIntake(opts: {
  client: Client;
  applicationId: string;
  discordUserId?: string | null;
  referenceCode?: string | null;
  applicantName?: string | null;
  positionTitle?: string | null;
}) {
  const channelId = DATABASE_CHANNEL_ID;
  if (!channelId) return;

  const mention = opts.discordUserId ? `<@${opts.discordUserId}>` : "Accepted applicant";

  const embed = new EmbedBuilder()
    .setColor(0x1e4d8c)
    .setTitle("Staff database — please complete your entry")
    .setDescription(
      [
        `${mention} — your application has been **accepted**.`,
        "",
        "Please complete the **staff database** form. You will need:",
        "• Discord username",
        "• Roblox username",
        "• Rank",
        "• Subrole(s) (if any)",
        "• Notes (optional)",
        "",
        "Click **Fill in database** below. Your entry is sent to **HT+** for review.",
        "",
        `Or use the website: [Staff database form](${SITE}/staff/database/new?applicationId=${encodeURIComponent(opts.applicationId)})`,
      ].join("\n")
    )
    .addFields(
      {
        name: "Reference",
        value: opts.referenceCode || opts.applicationId.slice(0, 8),
        inline: true,
      },
      {
        name: "Position",
        value: opts.positionTitle || "—",
        inline: true,
      }
    )
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`staff_db_fill:${opts.applicationId}`)
      .setLabel("Fill in database")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setLabel("Open on website")
      .setStyle(ButtonStyle.Link)
      .setURL(
        `${SITE}/staff/database/new?applicationId=${encodeURIComponent(opts.applicationId)}`
      )
  );

  try {
    const channel = await opts.client.channels.fetch(channelId);
    if (!channel?.isTextBased() || channel.isDMBased()) return;
    await (channel as TextChannel).send({
      content: opts.discordUserId ? mention : undefined,
      embeds: [embed],
      components: [row],
      allowedMentions: opts.discordUserId
        ? { users: [opts.discordUserId] }
        : undefined,
    });
  } catch (e) {
    console.warn("[recruitment] postDatabaseIntake", e);
  }
}

/** Notify HT+ channel that a database entry needs review */
export async function postHtReviewNotice(opts: {
  client: Client;
  entryId: string;
  discordUsername: string;
  robloxUsername: string;
  rankLabel: string;
  subroles: string[];
  notes?: string | null;
}) {
  const channelId = HT_REVIEW_CHANNEL_ID;
  if (!channelId) return;

  const embed = new EmbedBuilder()
    .setColor(0xc9a227)
    .setTitle("Staff database — pending HT+ review")
    .setDescription(
      "A new staff database entry was submitted. **HT+** should review and approve or request changes."
    )
    .addFields(
      { name: "Discord", value: opts.discordUsername, inline: true },
      { name: "Roblox", value: opts.robloxUsername, inline: true },
      { name: "Rank", value: opts.rankLabel, inline: true },
      {
        name: "Subroles",
        value: opts.subroles.length ? opts.subroles.join(", ") : "—",
        inline: true,
      },
      {
        name: "Notes",
        value: opts.notes || "—",
        inline: false,
      }
    )
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`staff_db_approve:${opts.entryId}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`staff_db_reject_entry:${opts.entryId}`)
      .setLabel("Reject entry")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setLabel("Open on website")
      .setStyle(ButtonStyle.Link)
      .setURL(`${SITE}/staff/database/${opts.entryId}`)
  );

  try {
    const channel = await opts.client.channels.fetch(channelId);
    if (!channel?.isTextBased() || channel.isDMBased()) return;
    await (channel as TextChannel).send({
      content: "**HT+ review required**",
      embeds: [embed],
      components: [row],
    });
  } catch (e) {
    console.warn("[recruitment] postHtReviewNotice", e);
  }
}

export async function postDecisionEveryone(opts: {
  client: Client;
  status: "accepted" | "rejected";
  referenceCode?: string | null;
  applicantName?: string | null;
  positionTitle?: string | null;
  applicationId?: string | null;
}) {
  const channelId = DECISIONS_CHANNEL_ID;
  if (!channelId) return;
  const accepted = opts.status === "accepted";
  const embed = new EmbedBuilder()
    .setColor(accepted ? 0x1b6b45 : 0xb42318)
    .setTitle(accepted ? "Application accepted" : "Application not successful")
    .addFields(
      {
        name: "Reference",
        value: opts.referenceCode || opts.applicationId?.slice(0, 8) || "—",
        inline: true,
      },
      { name: "Applicant", value: opts.applicantName || "—", inline: true },
      { name: "Position", value: opts.positionTitle || "—", inline: true }
    )
    .setTimestamp();

  try {
    const channel = await opts.client.channels.fetch(channelId);
    if (!channel?.isTextBased() || channel.isDMBased()) return;
    await (channel as TextChannel).send({
      content: "@everyone",
      embeds: [embed],
      allowedMentions: { parse: ["everyone"] },
    });
  } catch (e) {
    console.warn("[recruitment] postDecisionEveryone", e);
  }
}

export async function dmApplicant(opts: {
  client: Client;
  discordUserId: string;
  status: "accepted" | "rejected";
  referenceCode?: string | null;
}) {
  const accepted = opts.status === "accepted";
  const embed = new EmbedBuilder()
    .setColor(accepted ? 0x1b6b45 : 0xb42318)
    .setTitle(
      accepted
        ? "Your application was accepted"
        : "Update on your application"
    )
    .setDescription(
      accepted
        ? `Congratulations! Please check the **staff database** channel and complete your entry so HT+ can review it.\n\n[Dashboard](${SITE}/dashboard)`
        : `Thank you for applying. Your application was not successful this time.\n\n[Dashboard](${SITE}/dashboard/applications)`
    )
    .setTimestamp();
  try {
    const user = await opts.client.users.fetch(opts.discordUserId);
    await user.send({ embeds: [embed] });
  } catch (e) {
    console.warn("[recruitment] dm", e);
  }
}

export async function discordIdForProfile(
  profileId: string | null | undefined
): Promise<string | null> {
  if (!profileId) return null;
  try {
    const sb = getSupabase();
    const { data } = await sb
      .from("discord_connections")
      .select("discord_user_id")
      .eq("user_id", profileId)
      .maybeSingle();
    return data?.discord_user_id || null;
  } catch {
    return null;
  }
}

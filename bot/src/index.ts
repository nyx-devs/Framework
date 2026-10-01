/**
 * Ro-School Discord bot
 *   cd bot && npm install && npm run register && npm run start
 */
import "./load-env.js";
import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  ActivityType,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type Interaction,
} from "discord.js";
import { handleCommand } from "./commands/handlers.js";
import { resolveDiscordUser } from "./lib/supabase.js";
import {
  isHtPlusDiscord,
  createStaffDbEntry,
} from "./lib/staff-db.js";
import { startDmQueueWorker } from "./lib/dm-queue.js";
import {
  ensureApplyEmbed,
  ensureDatabaseEmbed,
  postHtReviewNotice,
} from "./lib/recruitment.js";
import { setStaffDbStatus } from "./lib/staff-db.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("DISCORD_BOT_TOKEN is required");
  process.exit(1);
}

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://your-school.vercel.app";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`[roschool-bot] Logged in as ${c.user.tag}`);
  c.user.setPresence({
    activities: [{ name: "Ro-School · /help", type: ActivityType.Watching }],
    status: "online",
  });
  // Public apply embed so people can start applications themselves
  await ensureApplyEmbed(c).catch((e) =>
    console.warn("[roschool-bot] apply embed", e)
  );
  await ensureDatabaseEmbed(c).catch((e) =>
    console.warn("[roschool-bot] database embed", e)
  );
  startDmQueueWorker(c);
});

function buildStaffDbModal(applicationId: string | null) {
  const modal = new ModalBuilder()
    .setCustomId(
      applicationId
        ? `staff_db_modal:${applicationId}`
        : "staff_db_modal:manual"
    )
    .setTitle("Staff database entry");

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("discord_username")
        .setLabel("Discord username")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(64)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("roblox_username")
        .setLabel("Roblox username")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(64)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("rank_label")
        .setLabel("Rank")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(64)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("subroles")
        .setLabel("Subrole(s) — comma separated")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(200)
    ),
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("notes")
        .setLabel("Notes (optional)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500)
    )
  );
  return modal;
}

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }

    // Button: Complete staff database
    if (interaction.isButton()) {
      const id = interaction.customId;
      if (id.startsWith("staff_db_fill:")) {
        // Accepted staff (or HT+) can fill the form
        const applicationId = id.slice("staff_db_fill:".length) || null;
        await interaction.showModal(buildStaffDbModal(applicationId));
        return;
      }

      if (id.startsWith("staff_db_approve:")) {
        if (!(await isHtPlusDiscord(interaction.user.id))) {
          await interaction.reply({
            content: "Only HT+ can approve staff database entries.",
            ephemeral: true,
          });
          return;
        }
        const entryId = id.slice("staff_db_approve:".length);
        const actor = await resolveDiscordUser(interaction.user.id);
        await setStaffDbStatus(entryId, "approved", actor?.userId || null);
        await interaction.reply({
          content: `Approved staff database entry \`${entryId.slice(0, 8)}\`.`,
          ephemeral: true,
        });
        try {
          await interaction.message.edit({
            content: `✅ **Approved** by <@${interaction.user.id}>`,
            components: [],
          });
        } catch {
          /* ignore */
        }
        return;
      }

      if (id.startsWith("staff_db_reject_entry:")) {
        if (!(await isHtPlusDiscord(interaction.user.id))) {
          await interaction.reply({
            content: "Only HT+ can reject staff database entries.",
            ephemeral: true,
          });
          return;
        }
        const entryId = id.slice("staff_db_reject_entry:".length);
        const actor = await resolveDiscordUser(interaction.user.id);
        await setStaffDbStatus(entryId, "rejected", actor?.userId || null);
        await interaction.reply({
          content: `Rejected staff database entry \`${entryId.slice(0, 8)}\`.`,
          ephemeral: true,
        });
        try {
          await interaction.message.edit({
            content: `❌ **Rejected** by <@${interaction.user.id}>`,
            components: [],
          });
        } catch {
          /* ignore */
        }
        return;
      }
    }

    // Modal submit
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;
      if (!id.startsWith("staff_db_modal:")) return;

      // Fill-in is for the accepted member (or staff helping them).
      // HT+ approval is a separate step after submit.


      const applicationIdRaw = id.slice("staff_db_modal:".length);
      const applicationId =
        applicationIdRaw && applicationIdRaw !== "manual"
          ? applicationIdRaw
          : null;

      const discordUsername = interaction.fields
        .getTextInputValue("discord_username")
        .trim();
      const robloxUsername = interaction.fields
        .getTextInputValue("roblox_username")
        .trim();
      const rankLabel = interaction.fields.getTextInputValue("rank_label").trim();
      const subrolesRaw =
        interaction.fields.getTextInputValue("subroles")?.trim() || "";
      const notes =
        interaction.fields.getTextInputValue("notes")?.trim() || null;
      const subroles = subrolesRaw
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const actor = await resolveDiscordUser(interaction.user.id);

      try {
        const entry = await createStaffDbEntry({
          applicationId,
          discordUsername,
          robloxUsername,
          rankLabel,
          subroles,
          dateAccepted: new Date().toISOString().slice(0, 10),
          notes,
          actorUserId: actor?.userId || null,
          status: "pending_review",
        });

        const site = SITE.replace(/\/$/, "");

        // Notify HT+ review channel
        await postHtReviewNotice({
          client: interaction.client,
          entryId: entry.id,
          discordUsername,
          robloxUsername,
          rankLabel,
          subroles,
          notes,
        });

        await interaction.reply({
          content: [
            "✅ Submitted to the **Staff Database** (pending HT+ review).",
            `Discord: **${discordUsername}** · Roblox: **${robloxUsername}** · Rank: **${rankLabel}**`,
            subroles.length ? `Subroles: ${subroles.join(", ")}` : "",
            `[Track on website](${site}/staff/database/${entry.id})`,
          ]
            .filter(Boolean)
            .join("\n"),
          ephemeral: true,
        });
      } catch (e) {
        console.error("[staff_db modal]", e);
        await interaction.reply({
          content:
            "Could not save. Check the bot has SUPABASE_SERVICE_ROLE_KEY and the staff_database tables exist.",
          ephemeral: true,
        });
      }
    }
  } catch (e) {
    console.error("[interaction]", e);
    if (interaction.isRepliable() && !interaction.replied) {
      await interaction
        .reply({ content: "Something went wrong.", ephemeral: true })
        .catch(() => {});
    }
  }
});

client.login(token);

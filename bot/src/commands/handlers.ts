import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { getSupabase, resolveDiscordUser, isStaffByDiscord } from "../lib/supabase.js";
import { isHtPlusDiscord, searchStaffDb } from "../lib/staff-db.js";
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import { createLinkCode } from "../lib/codes.js";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://bluebird.example.com";
const COLOR = 0x1a3a6b;

function embed() {
  return new EmbedBuilder().setColor(COLOR).setTimestamp();
}

async function requireLinked(interaction: ChatInputCommandInteraction) {
  const user = await resolveDiscordUser(interaction.user.id);
  if (!user) {
    await interaction.reply({
      content:
        "Your Discord is not linked to a Ro-School account.\n" +
        `1. Sign in on the website: ${SITE}/login\n` +
        "2. Or run **/link** and enter the code on your Profile page.",
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }
  return user;
}

async function requireStaff(interaction: ChatInputCommandInteraction) {
  const user = await resolveDiscordUser(interaction.user.id);
  if (!user) {
    await interaction.reply({
      content:
        "Your Discord is not linked to a Ro-School account. Use **/link** first.",
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }
  const staff = await isStaffByDiscord(interaction.user.id);
  if (!staff && !user.isAdmin) {
    await interaction.reply({
      content: "Staff only. Your Ro-School role does not allow this.",
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }
  return user;
}

export async function handleCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const name = interaction.commandName;

  switch (name) {
    case "ping":
      await interaction.reply({
        content: `Pong · ${interaction.client.ws.ping}ms`,
        flags: MessageFlags.Ephemeral,
      });
      return;

    case "help":
      await interaction.reply({
        embeds: [
          embed()
            .setTitle("Ro-School · Command centre")
            .setDescription(
              [
                "**Account**",
                "`/link` `/whoami` `/code` `/unlink` `/testdm`",
                "",
                "**You**",
                "`/status` applications · `/positions` vacancies",
                "`/mail inbox|send` school mail · `/notifs` site alerts",
                "`/site` links · `/ping`",
                "",
                "**Staff**",
                "`/apps` `/app view|set-status` recruitment",
                "`/member` `/lookup` `/dm` `/stats` `/announce`",
                "",
                "You get **Discord DMs** when mail, application status, or site notifications fire (if linked).",
                "",
                `Website: ${SITE}`,
              ].join("\n")
            ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;

    case "site":
      await interaction.reply({
        embeds: [
          embed()
            .setTitle("Ro-School website")
            .addFields(
              { name: "Home", value: SITE, inline: false },
              { name: "Login", value: `${SITE}/login`, inline: true },
              { name: "Positions", value: `${SITE}/positions`, inline: true },
              { name: "Dashboard", value: `${SITE}/dashboard`, inline: true },
              { name: "Mail", value: `${SITE}/dashboard/messages`, inline: true }
            ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;

    case "link": {
      const existing = await resolveDiscordUser(interaction.user.id);
      if (existing) {
        await interaction.reply({
          embeds: [
            embed()
              .setTitle("Already linked")
              .setDescription(
                `Linked as **${existing.fullName || "Member"}**\n` +
                  `School mail: \`${existing.schoolEmail || "—"}\`\n` +
                  `Role: ${existing.role}`
              ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const code = await createLinkCode(interaction.user.id);
      await interaction.reply({
        embeds: [
          embed()
            .setTitle("Link your Discord")
            .setDescription(
              `Your code: **\`${code}\`**\n\n` +
                `1. Sign in at ${SITE}/login\n` +
                `2. Open ${SITE}/dashboard/profile\n` +
                `3. Enter this code in **Link Discord (bot code)**\n\n` +
                `Code expires in **15 minutes**.`
            ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    case "whoami": {
      const user = await requireLinked(interaction);
      if (!user) return;
      await interaction.reply({
        embeds: [
          embed()
            .setTitle(user.fullName || "Ro-School member")
            .addFields(
              { name: "Role", value: user.role, inline: true },
              {
                name: "School mail",
                value: user.schoolEmail || "—",
                inline: true,
              },
              {
                name: "Member code",
                value: user.memberCode || "—",
                inline: true,
              },
              {
                name: "Login email",
                value: user.email || "—",
                inline: false,
              },
              {
                name: "Dashboard",
                value: `${SITE}/dashboard`,
                inline: false,
              }
            ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    case "unlink": {
      const user = await requireLinked(interaction);
      if (!user) return;
      const sb = getSupabase();
      await sb
        .from("discord_connections")
        .delete()
        .eq("user_id", user.userId)
        .eq("discord_user_id", interaction.user.id);
      await interaction.reply({
        content:
          "Discord unlinked from your Ro-School account. Use **/link** or website OAuth to connect again.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    case "status": {
      const user = await requireLinked(interaction);
      if (!user) return;
      const sb = getSupabase();
      const { data: apps } = await sb
        .from("applications")
        .select(
          "id, status, reference_code, submitted_at, position:positions(title)"
        )
        .eq("applicant_id", user.userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!apps?.length) {
        await interaction.reply({
          content: `No applications yet. Browse ${SITE}/positions`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const lines = apps.map((a) => {
        const pos = a.position as { title?: string } | null;
        const st = String(a.status).replace(/_/g, " ");
        return `• **${a.reference_code || a.id.slice(0, 8)}** — ${pos?.title || "Position"} — _${st}_`;
      });

      await interaction.reply({
        embeds: [
          embed()
            .setTitle("Your applications")
            .setDescription(lines.join("\n"))
            .setFooter({ text: `${SITE}/dashboard/applications` }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    case "positions": {
      const sb = getSupabase();
      const { data: positions } = await sb
        .from("positions")
        .select("title, slug, department, status, closing_date")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(12);

      // published column may vary — fallback
      let list = positions;
      if (!list?.length) {
        const { data: alt } = await sb
          .from("positions")
          .select("title, slug, status, closing_date")
          .limit(12);
        list = alt as typeof list;
      }

      if (!list?.length) {
        await interaction.reply({
          content: `No published vacancies. ${SITE}/positions`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const lines = list.map((p) => {
        const slug = (p as { slug?: string }).slug;
        const title = (p as { title?: string }).title || "Vacancy";
        return slug
          ? `• **${title}** — ${SITE}/positions/${slug}`
          : `• **${title}**`;
      });

      await interaction.reply({
        embeds: [
          embed().setTitle("Open positions").setDescription(lines.join("\n")),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    case "mail": {
      const user = await requireLinked(interaction);
      if (!user) return;
      const sub = interaction.options.getSubcommand();
      const sb = getSupabase();

      if (sub === "inbox") {
        const { data: mail } = await sb
          .from("school_mail")
          .select("from_address, subject, body, created_at, read_at")
          .eq("to_user_id", user.userId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!mail?.length) {
          await interaction.reply({
            content: `Inbox empty. Your address: \`${user.schoolEmail || "—"}\``,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const lines = mail.map((m) => {
          const unread = m.read_at ? "" : "● ";
          return `${unread}**${m.subject}** from \`${m.from_address}\``;
        });

        await interaction.reply({
          embeds: [
            embed()
              .setTitle(`Inbox · ${user.schoolEmail || ""}`)
              .setDescription(lines.join("\n"))
              .setFooter({ text: `${SITE}/dashboard/messages` }),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (sub === "send") {
        const to = interaction.options.getString("to", true).trim().toLowerCase();
        const subject = interaction.options.getString("subject", true);
        const message = interaction.options.getString("message", true);

        if (!to.endsWith("@bbprimary.uk")) {
          await interaction.reply({
            content: "Address must end with `@bbprimary.uk`.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const { data: recipient } = await sb
          .from("profiles")
          .select("id, school_email")
          .eq("school_email", to)
          .maybeSingle();

        if (!recipient) {
          await interaction.reply({
            content: `No member found for \`${to}\`.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (recipient.id === user.userId) {
          await interaction.reply({
            content: "You cannot mail yourself.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const fromAddress = user.schoolEmail;
        if (!fromAddress) {
          await interaction.reply({
            content: "You do not have a school email yet. Open the website dashboard once.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const { error } = await sb.from("school_mail").insert({
          from_user_id: user.userId,
          to_user_id: recipient.id,
          from_address: fromAddress,
          to_address: to,
          subject,
          body: message,
        });

        if (error) {
          await interaction.reply({
            content: "Could not send mail.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await sb.from("notifications").insert({
          user_id: recipient.id,
          title: `New mail from ${fromAddress}`,
          body: subject,
          link: "/dashboard/messages",
          type: "school_mail",
        });

        await interaction.reply({
          content: `Sent to \`${to}\`.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      return;
    }

    case "member": {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      // requireStaff may have already replied on failure; on success interaction not replied
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      const target = interaction.options.getUser("user", true);
      const linked = await resolveDiscordUser(target.id);

      if (!linked) {
        await interaction.editReply({
          content: `**${target.tag}** is not linked to Ro-School.`,
        });
        return;
      }

      await interaction.editReply({
        embeds: [
          embed()
            .setTitle(linked.fullName || target.username)
            .addFields(
              { name: "Discord", value: `<@${target.id}>`, inline: true },
              { name: "Role", value: linked.role, inline: true },
              {
                name: "School mail",
                value: linked.schoolEmail || "—",
                inline: false,
              }
            ),
        ],
      });
      return;
    }

    case "apps": {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      const status = interaction.options.getString("status");
      const limit = Math.min(interaction.options.getInteger("limit") || 8, 15);
      const sb = getSupabase();

      let q = sb
        .from("applications")
        .select(
          "reference_code, status, submitted_at, position:positions(title)"
        )
        .order("submitted_at", { ascending: false })
        .limit(limit);

      if (status) q = q.eq("status", status);

      const { data: apps } = await q;

      if (!apps?.length) {
        await interaction.editReply({ content: "No applications found." });
        return;
      }

      const lines = apps.map((a) => {
        const pos = a.position as { title?: string } | null;
        return `• \`${a.reference_code}\` **${pos?.title || "—"}** — ${String(a.status).replace(/_/g, " ")}`;
      });

      await interaction.editReply({
        embeds: [
          embed()
            .setTitle("Applications")
            .setDescription(lines.join("\n"))
            .setFooter({ text: `${SITE}/staff/applications` }),
        ],
      });
      return;
    }

    case "app": {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      const sub = interaction.options.getSubcommand();
      const reference = interaction.options.getString("reference", true).trim();
      const sb = getSupabase();

      const { data: app } = await sb
        .from("applications")
        .select(
          `id, reference_code, status, applicant_id, submitted_at,
           position:positions(title)`
        )
        .eq("reference_code", reference)
        .maybeSingle();

      if (!app) {
        await interaction.editReply({
          content: `No application with reference \`${reference}\`.`,
        });
        return;
      }

      const pos = app.position as { title?: string } | null;

      if (sub === "view") {
        await interaction.editReply({
          embeds: [
            embed()
              .setTitle(app.reference_code || reference)
              .addFields(
                { name: "Position", value: pos?.title || "—", inline: true },
                {
                  name: "Status",
                  value: String(app.status).replace(/_/g, " "),
                  inline: true,
                },
                {
                  name: "Staff link",
                  value: `${SITE}/staff/applications/${app.id}`,
                  inline: false,
                }
              ),
          ],
        });
        return;
      }

      if (sub === "set-status") {
        const newStatus = interaction.options.getString("status", true);
        const from = app.status;

        await sb
          .from("applications")
          .update({ status: newStatus })
          .eq("id", app.id);

        // Timeline + notification (best-effort)
        await sb.from("timeline_events").insert({
          application_id: app.id,
          actor_id: staff.userId,
          event_type: "status_changed",
          summary: `Status changed: ${from} → ${newStatus} (via Discord)`,
          metadata: { from, to: newStatus, via: "discord_bot" },
        });

        await sb.from("notifications").insert({
          user_id: app.applicant_id,
          title: "Application update",
          body: `Your application ${app.reference_code} is now: ${newStatus.replace(/_/g, " ")}.`,
          link: `/dashboard/applications/${app.id}`,
          type: "status_changed",
        });

        await interaction.editReply({
          content: `Updated \`${app.reference_code}\`: **${String(from).replace(/_/g, " ")}** → **${newStatus.replace(/_/g, " ")}**`,
        });
        return;
      }
      return;
    }

    case "announce": {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      const title = interaction.options.getString("title", true);
      const message = interaction.options.getString("message", true);
      const sb = getSupabase();

      const { data: ch } = await sb
        .from("discord_channels")
        .select("channel_id")
        .eq("purpose", "announcements")
        .eq("is_active", true)
        .maybeSingle();

      const channelId = ch?.channel_id || interaction.channelId;

      try {
        const channel = await interaction.client.channels.fetch(channelId);
        if (channel && channel.isTextBased() && "send" in channel) {
          await channel.send({
            embeds: [
              embed()
                .setTitle(title)
                .setDescription(message)
                .setFooter({
                  text: `Posted by ${staff.fullName || interaction.user.username} · Ro-School`,
                }),
            ],
          });
          await interaction.editReply({ content: "Announcement posted." });
        } else {
          await interaction.editReply({
            content: "Could not post to that channel.",
          });
        }
      } catch (e) {
        console.error(e);
        await interaction.editReply({
          content:
            "Failed to post. Check bot permissions and discord_channels purpose `announcements`.",
        });
      }
      return;
    }


    case "code": {
      const user = await requireLinked(interaction);
      if (!user) return;
      await interaction.reply({
        embeds: [
          embed()
            .setTitle("Member code")
            .setDescription(
              user.memberCode
                ? `Your unique Ro-School code is **\`${user.memberCode}\`**`
                : "No code yet — open the website dashboard once, or ask staff to run migration 008."
            ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    case "notifs": {
      const user = await requireLinked(interaction);
      if (!user) return;
      const sb = getSupabase();
      const { data: rows } = await sb
        .from("notifications")
        .select("title, body, link, type, created_at, read_at")
        .eq("user_id", user.userId)
        .order("created_at", { ascending: false })
        .limit(8);

      if (!rows?.length) {
        await interaction.reply({
          content: "No notifications yet.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const lines = rows.map((n) => {
        const unread = n.read_at ? "" : "● ";
        return `${unread}**${n.title}**${n.body ? ` — ${String(n.body).slice(0, 80)}` : ""}`;
      });

      await interaction.reply({
        embeds: [
          embed()
            .setTitle("Notifications")
            .setDescription(lines.join("\\n"))
            .setFooter({ text: `${SITE}/dashboard` }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    case "testdm": {
      const user = await requireLinked(interaction);
      if (!user) return;
      try {
        const dm = await interaction.user.createDM();
        await dm.send({
          embeds: [
            embed()
              .setTitle("Test notification")
              .setDescription(
                `Hey **${user.fullName || interaction.user.username}** — Discord DMs are working.\\n\\n` +
                  `School mail: \`${user.schoolEmail || "—"}\`\\n` +
                  `Member code: \`${user.memberCode || "—"}\`\\n\\n` +
                  `You'll get DMs for new mail, application updates, and site notifications.`
              )
              .setFooter({ text: "Ro-School Secondary School" }),
          ],
        });
        await interaction.reply({
          content: "Check your DMs — test message sent.",
          flags: MessageFlags.Ephemeral,
        });
      } catch {
        await interaction.reply({
          content:
            "Could not DM you. Enable **Allow direct messages from server members** in Privacy settings for this server.",
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    case "lookup": {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }
      const query = interaction.options.getString("query", true).trim().toLowerCase();
      const sb = getSupabase();
      let profile = null as {
        id: string;
        full_name: string | null;
        school_email: string | null;
        role: string;
        member_code: string | null;
      } | null;

      if (/^\\d{6}$/.test(query)) {
        const { data } = await sb
          .from("profiles")
          .select("id, full_name, school_email, role, member_code")
          .eq("member_code", query)
          .maybeSingle();
        profile = data;
      } else if (query.endsWith("@bbprimary.uk")) {
        const { data } = await sb
          .from("profiles")
          .select("id, full_name, school_email, role, member_code")
          .eq("school_email", query)
          .maybeSingle();
        profile = data;
      } else {
        const { data } = await sb
          .from("profiles")
          .select("id, full_name, school_email, role, member_code")
          .or(`full_name.ilike.%${query}%,school_email.ilike.%${query}%`)
          .limit(1)
          .maybeSingle();
        profile = data;
      }

      if (!profile) {
        await interaction.editReply({ content: `No member matched \`${query}\`.` });
        return;
      }

      const { data: conn } = await sb
        .from("discord_connections")
        .select("discord_user_id, discord_username")
        .eq("user_id", profile.id)
        .maybeSingle();

      await interaction.editReply({
        embeds: [
          embed()
            .setTitle(profile.full_name || "Member")
            .addFields(
              { name: "Member code", value: profile.member_code || "—", inline: true },
              { name: "Role", value: profile.role, inline: true },
              { name: "School mail", value: profile.school_email || "—", inline: false },
              {
                name: "Discord",
                value: conn
                  ? `<@${conn.discord_user_id}> (\`${conn.discord_username}\`)`
                  : "Not linked",
                inline: false,
              }
            ),
        ],
      });
      return;
    }

    case "dm": {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      const target = interaction.options.getUser("user", true);
      const message = interaction.options.getString("message", true);
      const linked = await resolveDiscordUser(target.id);
      if (!linked) {
        await interaction.reply({
          content: `${target} is not linked to Ro-School.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      try {
        const channel = await target.createDM();
        await channel.send({
          embeds: [
            embed()
              .setTitle("Message from Ro-School staff")
              .setDescription(message)
              .setFooter({
                text: `From ${staff.fullName || interaction.user.username}`,
              }),
          ],
        });
        await interaction.reply({
          content: `DM sent to ${target}.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch {
        await interaction.reply({
          content: "Could not DM that user (privacy settings).",
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    case "stats": {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }
      const sb = getSupabase();
      const statuses = [
        "submitted",
        "under_review",
        "interview",
        "accepted",
        "rejected",
      ];
      const counts: string[] = [];
      for (const st of statuses) {
        const { count } = await sb
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("status", st);
        counts.push(`**${st.replace(/_/g, " ")}:** ${count ?? 0}`);
      }
      const { count: linked } = await sb
        .from("discord_connections")
        .select("user_id", { count: "exact", head: true });
      const { count: profiles } = await sb
        .from("profiles")
        .select("id", { count: "exact", head: true });

      await interaction.editReply({
        embeds: [
          embed()
            .setTitle("Live stats")
            .setDescription(
              [
                "**Applications**",
                ...counts,
                "",
                `**Accounts:** ${profiles ?? 0}`,
                `**Discord linked:** ${linked ?? 0}`,
              ].join("\\n")
            )
            .setFooter({ text: `${SITE}/staff` }),
        ],
      });
      return;
    }

    case "staffdb": {
        if (!(await isHtPlusDiscord(interaction.user.id))) {
          await interaction.reply({
            content: "Staff database is restricted to HT+ (Roblox rank).",
            ephemeral: true,
          });
          return;
        }
        const sub = interaction.options.getSubcommand();
        if (sub === "add") {
          const modal = new ModalBuilder()
            .setCustomId("staff_db_modal:manual")
            .setTitle("Staff database entry");
          modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId("discord_username")
                .setLabel("Discord username")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId("roblox_username")
                .setLabel("Roblox username")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId("rank_label")
                .setLabel("Rank")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId("subroles")
                .setLabel("Subrole(s) — comma separated")
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId("notes")
                .setLabel("Notes (optional)")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
            )
          );
          await interaction.showModal(modal);
          return;
        }
        const q = interaction.options.getString("query", true);
        const rows = await searchStaffDb(q);
        if (!rows.length) {
          await interaction.reply({
            content: "No matching staff database entries.",
            ephemeral: true,
          });
          return;
        }
        const lines = rows.map(
          (r) =>
            `**${r.discord_username}** · ${r.roblox_username} · ${r.rank_label}` +
            ((r.subroles as string[])?.length
              ? ` · ${(r.subroles as string[]).join(", ")}`
              : "")
        );
        await interaction.reply({
          content: lines.join("\n").slice(0, 1800),
          ephemeral: true,
        });
        return;
      }
      default:
      await interaction.reply({
        content: "Unknown command.",
        flags: MessageFlags.Ephemeral,
      });
  }
}

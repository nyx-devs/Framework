import { Client, EmbedBuilder } from "discord.js";
import { getSupabase } from "./supabase.js";

const POLL_MS = 4000;
const SITE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://your-school.vercel.app"
).replace(/\/$/, "");

async function markQueue(
  sb: ReturnType<typeof getSupabase>,
  id: string,
  status: "sent" | "failed",
  error?: string
) {
  await sb
    .from("discord_dm_queue")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      error: error?.slice(0, 500) || null,
    })
    .eq("id", id);
}

async function sendDm(
  client: Client,
  discordUserId: string,
  title: string,
  body: string,
  color: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await client.users.fetch(String(discordUserId));
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(body)
      .setFooter({ text: "Ro-School" })
      .setTimestamp();
    await user.send({ embeds: [embed] });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/** Process explicit queue rows */
async function processQueue(client: Client) {
  const sb = getSupabase();
  const { data: rows, error } = await sb
    .from("discord_dm_queue")
    .select("id, discord_user_id, title, body, color")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(15);

  if (error) {
    // Table might not exist yet
    if (!error.message?.includes("does not exist")) {
      console.warn("[dm-queue] fetch", error.message);
    }
    return;
  }
  if (!rows?.length) return;

  for (const row of rows) {
    const result = await sendDm(
      client,
      String(row.discord_user_id),
      row.title,
      row.body,
      row.color ?? 0x1a3a6b
    );
    if (result.ok) {
      console.log("[dm-queue] SENT to", row.discord_user_id);
      await markQueue(sb, row.id, "sent");
    } else {
      console.warn("[dm-queue] FAIL", row.discord_user_id, result.error);
      await markQueue(sb, row.id, "failed", result.error);
    }
  }
}

/**
 * Fallback: poll recently accepted/rejected applications and DM linked users.
 * Does not require the website to write to discord_dm_queue.
 */
async function processRecentDecisions(client: Client) {
  const sb = getSupabase();
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h

  const { data: apps, error } = await sb
    .from("applications")
    .select("id, status, reference_code, applicant_id, updated_at")
    .in("status", ["accepted", "rejected"])
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(25);

  if (error) {
    console.warn("[dm-apps] fetch applications", error.message);
    return;
  }
  if (!apps?.length) return;

  for (const app of apps) {
    if (!app.applicant_id) continue;

    // Already notified?
    const { data: existing } = await sb
      .from("discord_dm_queue")
      .select("id, status")
      .contains("meta", { applicationId: app.id })
      .in("status", ["sent", "pending", "failed"])
      .limit(1)
      .maybeSingle();

    // If failed before, allow one retry by only skipping sent
    if (existing?.status === "sent") continue;
    if (existing?.status === "pending") continue;

    const { data: conn } = await sb
      .from("discord_connections")
      .select("discord_user_id")
      .eq("user_id", app.applicant_id)
      .maybeSingle();

    if (!conn?.discord_user_id) {
      console.warn("[dm-apps] no Discord link for applicant", app.applicant_id);
      continue;
    }

    // Position title optional
    let positionTitle = "Position";
    try {
      const { data: full } = await sb
        .from("applications")
        .select("position:positions(title)")
        .eq("id", app.id)
        .maybeSingle();
      const pos = full?.position as { title?: string } | null;
      if (pos?.title) positionTitle = pos.title;
    } catch {
      /* ignore */
    }

    const accepted = app.status === "accepted";
    const ref = app.reference_code || String(app.id).slice(0, 8);
    const title = accepted
      ? "You've been accepted — Ro-School"
      : "Application update — Ro-School";
    const body = accepted
      ? [
          `Congratulations — your application for **${positionTitle}** (${ref}) has been **accepted**.`,
          "",
          "Next step: open the **staff database** channel and click **Add me to the database**.",
          "HT+ will review your entry after you submit it.",
          "",
          `Dashboard: ${SITE}/dashboard/applications`,
        ].join("\n")
      : [
          `Thank you for applying for **${positionTitle}** (${ref}).`,
          "",
          "Unfortunately your application was **not successful** this time.",
          "",
          `Dashboard: ${SITE}/dashboard/applications`,
        ].join("\n");
    const color = accepted ? 0x1b6b45 : 0xb42318;

    // Insert queue row first (dedupe)
    const { data: queued, error: qErr } = await sb
      .from("discord_dm_queue")
      .insert({
        discord_user_id: String(conn.discord_user_id),
        title,
        body,
        color,
        meta: { applicationId: app.id, status: app.status, source: "bot_poll" },
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    if (qErr) {
      // If table missing, send directly
      if (qErr.message?.includes("does not exist")) {
        const result = await sendDm(
          client,
          String(conn.discord_user_id),
          title,
          body,
          color
        );
        console.log(
          "[dm-apps] direct",
          app.id,
          result.ok ? "SENT" : result.error
        );
        continue;
      }
      // unique / race — skip
      console.warn("[dm-apps] queue insert", qErr.message);
      continue;
    }

    const result = await sendDm(
      client,
      String(conn.discord_user_id),
      title,
      body,
      color
    );
    if (queued?.id) {
      await markQueue(
        sb,
        queued.id,
        result.ok ? "sent" : "failed",
        result.error
      );
    }
    console.log(
      "[dm-apps]",
      app.status,
      app.id,
      result.ok ? "SENT → " + conn.discord_user_id : "FAIL " + result.error
    );
  }
}

export function startDmQueueWorker(client: Client) {
  console.log("[dm-queue] worker started — queue + application poll every 4s");

  const tick = async () => {
    try {
      await processQueue(client);
      await processRecentDecisions(client);
    } catch (e) {
      console.warn("[dm-queue] tick", e);
    }
  };

  setTimeout(tick, 1500);
  setInterval(tick, POLL_MS);
}

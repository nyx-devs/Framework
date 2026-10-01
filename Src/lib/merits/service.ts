/**
 * Central merits service — SERVER ONLY.
 * Database is the source of truth for Roblox, website and Discord.
 */
"use server";

import { createServiceClient } from "@/lib/supabase/admin";
import { sendChannelMessage, type DiscordEmbed } from "@/lib/discord";
import { writeAuditLog } from "@/lib/audit";

export type MeritSource = "roblox" | "discord" | "website" | "system";

export type AwardMeritInput = {
  studentRobloxId: number;
  /** positive (default) or bad (stored as negative amount) */
  meritKind?: "positive" | "bad";
  studentRobloxUsername?: string | null;
  amount: number;
  reason: string;
  awardedByRobloxId?: number | null;
  awardedByProfileId?: string | null;
  awardedByName?: string | null;
  awardedByRank?: string | null;
  source: MeritSource;
  serverId?: string | null;
  sessionId?: string | null;
  idempotencyKey?: string | null;
  studentDiscordId?: string | null;
};

export type AwardMeritResult =
  | {
      ok: true;
      meritId: string;
      total: number;
      studentName: string | null;
    }
  | { ok: false; error: string; code?: string };

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://your-school.vercel.app/0";
}

async function getMeritSettings(admin: ReturnType<typeof createServiceClient>) {
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "merits")
    .maybeSingle();
  const v = (data?.value || {}) as {
    max_amount?: number;
    min_amount?: number;
    enabled?: boolean;
  };
  return {
    max: v.max_amount ?? 5,
    min: v.min_amount ?? 1,
    enabled: v.enabled !== false,
  };
}

/** Award a merit. Validates amount/reason; writes ledger + total; best-effort Discord. */
export async function awardMerit(
  input: AwardMeritInput
): Promise<AwardMeritResult> {
  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return { ok: false, error: "Server misconfigured", code: "config" };
  }

  const settings = await getMeritSettings(admin);
  if (!settings.enabled) {
    return { ok: false, error: "Merit system is disabled", code: "disabled" };
  }

  const kind = input.meritKind === "bad" ? "bad" : "positive";
  let amount = Math.trunc(Number(input.amount));
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false, error: "Invalid merit amount", code: "amount" };
  }
  // Bad merits are stored as negative amounts
  if (kind === "bad") {
    amount = -Math.abs(amount);
  } else if (amount < 0) {
    // allow explicit negative as bad
    amount = -Math.abs(amount);
  }
  if (amount > 0 && (amount < settings.min || amount > settings.max)) {
    return {
      ok: false,
      error: `Amount must be between ${settings.min} and ${settings.max}`,
      code: "amount",
    };
  }
  if (amount < -50 || amount > 50) {
    return { ok: false, error: "Amount out of allowed range", code: "amount" };
  }
  const meritKind = amount < 0 ? "bad" : "positive";

  const reason = String(input.reason || "").trim().slice(0, 200);
  if (reason.length < 3) {
    return { ok: false, error: "Reason is required", code: "reason" };
  }

  const studentRobloxId = Number(input.studentRobloxId);
  if (!Number.isFinite(studentRobloxId) || studentRobloxId <= 0) {
    return { ok: false, error: "Invalid student Roblox ID", code: "student" };
  }

  // Resolve website profile by Roblox ID
  const { data: studentProfile } = await admin
    .from("profiles")
    .select("id, full_name, roblox_username, roblox_user_id")
    .eq("roblox_user_id", studentRobloxId)
    .maybeSingle();

  let studentDiscordId = input.studentDiscordId || null;
  if (studentProfile?.id && !studentDiscordId) {
    const { data: conn } = await admin
      .from("discord_connections")
      .select("discord_user_id")
      .eq("user_id", studentProfile.id)
      .maybeSingle();
    studentDiscordId = conn?.discord_user_id || null;
  }

  // Idempotency
  if (input.idempotencyKey) {
    const { data: existing } = await admin
      .from("merits")
      .select("id")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing) {
      const total = await sumActive(
        admin,
        studentProfile?.id || null,
        studentRobloxId
      );
      return {
        ok: true,
        meritId: existing.id,
        total,
        studentName: studentProfile?.full_name || input.studentRobloxUsername || null,
      };
    }
  }

  const row = {
    student_id: studentProfile?.id || null,
    student_roblox_id: studentRobloxId,
    student_roblox_username:
      input.studentRobloxUsername ||
      studentProfile?.roblox_username ||
      null,
    student_discord_id: studentDiscordId,
    amount,
    reason,
    awarded_by_id: input.awardedByProfileId || null,
    awarded_by_roblox_id: input.awardedByRobloxId || null,
    awarded_by_name: input.awardedByName || null,
    awarded_by_rank: input.awardedByRank || null,
    source: input.source,
    server_id: input.serverId || null,
    session_id: input.sessionId || null,
    status: "active" as const,
    merit_kind: meritKind,
    idempotency_key: input.idempotencyKey || null,
  };

  const { data: inserted, error } = await admin
    .from("merits")
    .insert(row)
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[merits] insert failed", error?.message);
    return { ok: false, error: "Could not save merit", code: "db" };
  }

  const total = await sumActive(
    admin,
    studentProfile?.id || null,
    studentRobloxId
  );

  if (studentProfile?.id) {
    const { data: allRows } = await admin
      .from("merits")
      .select("amount, merit_kind")
      .eq("student_id", studentProfile.id)
      .eq("status", "active");
    const rows = allRows || [];
    const positive_total = rows.filter((r) => (r.amount as number) > 0).reduce((s, r) => s + (r.amount as number), 0);
    const bad_total = rows.filter((r) => (r.amount as number) < 0).reduce((s, r) => s + Math.abs(r.amount as number), 0);
    await admin.from("merit_totals").upsert(
      {
        student_id: studentProfile.id,
        student_roblox_id: studentRobloxId,
        total,
        positive_total,
        bad_total,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" }
    );
  }

  await writeAuditLog({
    action: amount > 0 ? "merit.awarded" : "merit.removed",
    entityType: "merit",
    entityId: inserted.id,
    actorId: input.awardedByProfileId || undefined,
    details: {
      student_roblox_id: studentRobloxId,
      amount,
      reason,
      source: input.source,
      total,
    },
  });

  // In-app notification if linked
  if (studentProfile?.id && amount > 0) {
    await admin.from("notifications").insert({
      user_id: studentProfile.id,
      title: "Merit awarded",
      body: `+${amount} — ${reason}`,
      link: "/dashboard/merits",
      type: "merit",
    });
  }

  // Discord channel — best effort; DB already committed
  try {
    await notifyMeritChannel(admin, {
      studentName:
        studentProfile?.full_name ||
        input.studentRobloxUsername ||
        `Roblox ${studentRobloxId}`,
      amount,
      reason,
      awardedBy: input.awardedByName || "Staff",
      source: input.source,
      discordId: studentDiscordId,
      total,
    });
  } catch (err) {
    console.warn("[merits] Discord notify failed", err);
  }

  return {
    ok: true,
    meritId: inserted.id,
    total,
    studentName:
      studentProfile?.full_name || input.studentRobloxUsername || null,
  };
}

async function sumActive(
  admin: ReturnType<typeof createServiceClient>,
  studentId: string | null,
  robloxId: number
): Promise<number> {
  let q = admin.from("merits").select("amount").eq("status", "active");
  if (studentId) {
    q = q.eq("student_id", studentId);
  } else {
    q = q.eq("student_roblox_id", robloxId);
  }
  const { data } = await q;
  return (data || []).reduce((s, r) => s + (r.amount as number), 0);
}

async function notifyMeritChannel(
  admin: ReturnType<typeof createServiceClient>,
  params: {
    studentName: string;
    amount: number;
    reason: string;
    awardedBy: string;
    source: string;
    discordId: string | null;
    total: number;
  }
) {
  const { data: ch } = await admin
    .from("discord_channels")
    .select("channel_id, is_active")
    .eq("purpose", "merits")
    .eq("is_active", true)
    .maybeSingle();

  if (!ch?.channel_id) return;

  const mention = params.discordId ? `<@${params.discordId}>` : params.studentName;
  const sign = params.amount > 0 ? `+${params.amount}` : String(params.amount);

  const embeds: DiscordEmbed[] = [
    {
      title: "Merit awarded",
      color: 0x1a4a9c,
      fields: [
        { name: "Student", value: mention, inline: true },
        { name: "Amount", value: sign, inline: true },
        { name: "New total", value: String(params.total), inline: true },
        { name: "Reason", value: params.reason, inline: false },
        { name: "Awarded by", value: params.awardedBy, inline: true },
        {
          name: "Source",
          value: params.source.charAt(0).toUpperCase() + params.source.slice(1),
          inline: true,
        },
      ],
      footer: { text: "Ro-School · Merits" },
      timestamp: new Date().toISOString(),
      url: `${siteUrl()}/dashboard/merits`,
    },
  ];

  await sendChannelMessage(ch.channel_id, "", embeds);
}

export async function reverseMerit(params: {
  meritId: string;
  actorId: string;
  reason: string;
}): Promise<AwardMeritResult> {
  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return { ok: false, error: "Server misconfigured", code: "config" };
  }

  const { data: merit } = await admin
    .from("merits")
    .select("*")
    .eq("id", params.meritId)
    .maybeSingle();

  if (!merit || merit.status !== "active") {
    return { ok: false, error: "Merit not found or already reversed", code: "not_found" };
  }

  await admin
    .from("merits")
    .update({
      status: "reversed",
      reversed_by_id: params.actorId,
      reversed_at: new Date().toISOString(),
      reverse_reason: params.reason.slice(0, 200),
    })
    .eq("id", params.meritId);

  // Balancing entry
  return awardMerit({
    studentRobloxId: merit.student_roblox_id,
    studentRobloxUsername: merit.student_roblox_username,
    amount: -merit.amount,
    reason: `Reversal: ${params.reason}`,
    awardedByProfileId: params.actorId,
    awardedByName: "Staff (reversal)",
    source: "system",
    idempotencyKey: `reverse:${params.meritId}`,
  });
}

export async function getMeritTotalForProfile(studentId: string): Promise<number> {
  try {
    const admin = createServiceClient();
    const { data } = await admin
      .from("merit_totals")
      .select("total")
      .eq("student_id", studentId)
      .maybeSingle();
    if (data) return data.total;
    const { data: rows } = await admin
      .from("merits")
      .select("amount")
      .eq("student_id", studentId)
      .eq("status", "active");
    return (rows || []).reduce((s, r) => s + r.amount, 0);
  } catch {
    return 0;
  }
}

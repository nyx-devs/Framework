"use server";

import { createClient } from "@/lib/supabase/server";
import { notifyBluebirdUserDm } from "@/lib/discord";
import { revalidatePath } from "next/cache";
import {
  SCHOOL_EMAIL_DOMAIN,
  isSchoolAddress,
  normalizeSchoolAddress,
  localPartFromName,
  formatSchoolAddress,
} from "@/lib/mail/domain";

export type MailResult = { error?: string; success?: string; id?: string };

export type SchoolMailRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_address: string;
  to_address: string;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
  from_profile?: { full_name: string | null; school_email: string | null } | null;
  to_profile?: { full_name: string | null; school_email: string | null } | null;
};

/**
 * Ensure the current user has a school_email (e.g. eqeno@yourschool.example).
 * Prefers Discord username when linked, otherwise profile full_name / handle.
 */
export async function ensureSchoolEmail(userId: string, fullName?: string | null) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, school_email")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.school_email) return profile.school_email as string;

  // Prefer Discord username as the local-part (e.g. eqeno → eqeno@yourschool.example)
  const { data: discord } = await supabase
    .from("discord_connections")
    .select("discord_username, discord_global_name")
    .eq("user_id", userId)
    .maybeSingle();

  const name =
    discord?.discord_username ||
    discord?.discord_global_name ||
    fullName ||
    profile?.full_name ||
    "member";

  const local = localPartFromName(name);
  let candidate = formatSchoolAddress(local);
  let n = 0;

  // Resolve collisions: eqeno, eqeno2, eqeno3, …
  while (n < 50) {
    const { data: clash } = await supabase
      .from("profiles")
      .select("id")
      .eq("school_email", candidate)
      .neq("id", userId)
      .maybeSingle();
    if (!clash) break;
    n += 1;
    candidate = formatSchoolAddress(`${local}${n}`);
  }

  await supabase
    .from("profiles")
    .update({ school_email: candidate })
    .eq("id", userId);

  return candidate;
}

export async function getMySchoolEmail(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, school_email")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.school_email) return profile.school_email;
  return ensureSchoolEmail(user.id, profile?.full_name);
}

export async function lookupUserBySchoolEmail(address: string) {
  const supabase = await createClient();
  const normalized = normalizeSchoolAddress(address);
  if (!isSchoolAddress(normalized)) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, school_email, role")
    .eq("school_email", normalized)
    .maybeSingle();

  return data;
}

export async function sendSchoolMail(
  _prev: MailResult,
  formData: FormData
): Promise<MailResult> {
  const toRaw = String(formData.get("to") || "").trim();
  const subject = String(formData.get("subject") || "").trim() || "(no subject)";
  const body = String(formData.get("body") || "").trim();

  if (!body) return { error: "Message body is required." };
  if (body.length > 10000) return { error: "Message is too long." };
  if (subject.length > 200) return { error: "Subject is too long." };

  let toAddress = normalizeSchoolAddress(toRaw);
  if (!toAddress.includes("@")) {
    toAddress = formatSchoolAddress(toAddress);
  }
  if (!isSchoolAddress(toAddress)) {
    return {
      error: `Address must be on @${SCHOOL_EMAIL_DOMAIN} (e.g. name@${SCHOOL_EMAIL_DOMAIN}).`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const fromAddress = await ensureSchoolEmail(user.id);

  const { data: recipient } = await supabase
    .from("profiles")
    .select("id, school_email, full_name")
    .eq("school_email", toAddress)
    .maybeSingle();

  if (!recipient) {
    return {
      error: `No Ro-School account found for ${toAddress}.`,
    };
  }

  if (recipient.id === user.id) {
    return { error: "You cannot send mail to yourself." };
  }

  const { data: inserted, error } = await supabase
    .from("school_mail")
    .insert({
      from_user_id: user.id,
      to_user_id: recipient.id,
      from_address: fromAddress,
      to_address: toAddress,
      subject,
      body,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[school_mail] insert", error.message);
    return { error: "Could not send message. Please try again." };
  }

  // In-app notification + Discord DM for recipient
  try {
    await supabase.from("notifications").insert({
      user_id: recipient.id,
      title: `New mail from ${fromAddress}`,
      body: subject,
      link: `/dashboard/messages?id=${inserted?.id || ""}`,
      type: "school_mail",
    });
  } catch {
    /* best-effort */
  }

  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://your-school.vercel.app/0";
    const preview = body.length > 280 ? body.slice(0, 277) + "…" : body;
    await notifyBluebirdUserDm({
      userId: recipient.id,
      title: `📨 New school mail`,
      description:
        `**From:** \`${fromAddress}\`\n**Subject:** ${subject}\n\n${preview}\n\n` +
        `[Open inbox](${site}/dashboard/messages?id=${inserted?.id || ""})`,
      url: `${site}/dashboard/messages`,
      color: 0x5865f2,
    });
  } catch {
    /* best-effort */
  }

  revalidatePath("/dashboard/messages");
  revalidatePath("/staff/messages");
  return { success: "Message sent.", id: inserted?.id };
}

export async function listInbox(): Promise<SchoolMailRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("school_mail")
    .select(
      "id, from_user_id, to_user_id, from_address, to_address, subject, body, read_at, created_at"
    )
    .eq("to_user_id", user.id)
    .eq("archived_by_recipient", false)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data as SchoolMailRow[]) || [];
  if (!rows.length) return rows;

  const fromIds = [...new Set(rows.map((r) => r.from_user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, school_email")
    .in("id", fromIds);
  const map = new Map((profiles || []).map((pr) => [pr.id, pr]));
  return rows.map((r) => ({
    ...r,
    from_profile: map.get(r.from_user_id) || null,
  }));
}

export async function listSent(): Promise<SchoolMailRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("school_mail")
    .select(
      "id, from_user_id, to_user_id, from_address, to_address, subject, body, read_at, created_at"
    )
    .eq("from_user_id", user.id)
    .eq("archived_by_sender", false)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data as SchoolMailRow[]) || [];
  if (!rows.length) return rows;

  const toIds = [...new Set(rows.map((r) => r.to_user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, school_email")
    .in("id", toIds);
  const map = new Map((profiles || []).map((pr) => [pr.id, pr]));
  return rows.map((r) => ({
    ...r,
    to_profile: map.get(r.to_user_id) || null,
  }));
}

export async function getMailMessage(id: string): Promise<SchoolMailRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("school_mail")
    .select(
      "id, from_user_id, to_user_id, from_address, to_address, subject, body, read_at, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  if (data.from_user_id !== user.id && data.to_user_id !== user.id) return null;

  if (data.to_user_id === user.id && !data.read_at) {
    await supabase
      .from("school_mail")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    data.read_at = new Date().toISOString();
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, school_email")
    .in("id", [data.from_user_id, data.to_user_id]);
  const map = new Map((profiles || []).map((pr) => [pr.id, pr]));

  return {
    ...(data as SchoolMailRow),
    from_profile: map.get(data.from_user_id) || null,
    to_profile: map.get(data.to_user_id) || null,
  };
}

export async function searchDirectory(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, school_email, role")
    .not("school_email", "is", null)
    .or(`school_email.ilike.%${q}%,full_name.ilike.%${q}%`)
    .neq("id", user.id)
    .limit(15);

  return data || [];
}

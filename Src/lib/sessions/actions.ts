"use server";

import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { createInAppNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import {
  SESSION_DEFAULT_DESCRIPTION,
  SESSION_DEFAULT_TITLE,
  formatSessionWindowLabel,
  sessionBoundsForDate,
  upcomingDateKeys,
} from "@/lib/sessions/schedule";

export async function listStaffSessions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("school_sessions")
    .select(
      "id, title, subject, teacher_name, description, starts_at, ends_at, status, year_group, roblox_join_url, department_id"
    )
    .order("starts_at", { ascending: true })
    .limit(80);
  return data || [];
}

export async function listUpcomingSessions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("school_sessions")
    .select(
      "id, title, subject, teacher_name, description, starts_at, ends_at, status, year_group, roblox_join_url, department_id"
    )
    .in("status", ["scheduled", "live"])
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(50);
  // fallback if ends_at null
  if (!data?.length) {
    const { data: alt } = await supabase
      .from("school_sessions")
      .select(
        "id, title, subject, teacher_name, description, starts_at, ends_at, status, year_group, roblox_join_url, department_id"
      )
      .in("status", ["scheduled", "live"])
      .order("starts_at", { ascending: true })
      .limit(50);
    return alt || [];
  }
  return data;
}

export async function getSession(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("school_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function createSession(formData: FormData) {
  const can = await hasPermission("sessions.create");
  if (!can) return { error: "You do not have permission to create sessions." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const title = String(formData.get("title") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const teacher_name = String(formData.get("teacher_name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const starts_at = String(formData.get("starts_at") || "");
  const ends_at = String(formData.get("ends_at") || "") || null;
  const year_group = String(formData.get("year_group") || "").trim() || null;
  const roblox_join_url =
    String(formData.get("roblox_join_url") || "").trim() || null;

  if (!title || !starts_at) return { error: "Title and start time are required." };

  const { data, error } = await supabase
    .from("school_sessions")
    .insert({
      title,
      subject: subject || null,
      teacher_name: teacher_name || null,
      teacher_id: user.id,
      description,
      starts_at,
      ends_at,
      year_group,
      roblox_join_url,
      status: "scheduled",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error(error);
    return { error: "Could not create session." };
  }

  revalidatePath("/dashboard/sessions");
  revalidatePath("/staff/sessions");
  return { ok: true, id: data.id };
}

export async function cancelSession(id: string) {
  const can = await hasPermission("sessions.cancel");
  if (!can) return { error: "Forbidden" };
  const supabase = await createClient();
  await supabase
    .from("school_sessions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/dashboard/sessions");
  revalidatePath("/staff/sessions");
  return { ok: true };
}

export async function recordAttendance(formData: FormData) {
  const can = await hasPermission("sessions.attendance");
  if (!can) return { error: "Forbidden" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const session_id = String(formData.get("session_id") || "");
  const student_id = String(formData.get("student_id") || "");
  const status = String(formData.get("status") || "present");
  if (!session_id || !student_id) return { error: "Missing fields" };
  if (!["present", "late", "absent", "excused"].includes(status)) {
    return { error: "Invalid status" };
  }
  const { error } = await supabase.from("session_attendance").upsert(
    {
      session_id,
      student_id,
      status,
      recorded_by: user?.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,student_id" }
  );
  if (error) return { error: "Could not save attendance" };
  await createInAppNotification({
    userId: student_id,
    title: "Attendance recorded",
    body: `Your attendance was marked as ${status}.`,
    link: `/dashboard/sessions/${session_id}`,
    type: "attendance",
  });
  revalidatePath(`/staff/sessions/${session_id}`);
  return { ok: true };
}



/**
 * Ensure the next `days` daily sessions exist (7:15–8:40 pm GMT).
 * Safe to call repeatedly — skips days that already have a scheduled/live session
 * in that time window.
 */
export async function ensureDailySessions(days = 14) {
  const can = await hasPermission("sessions.create");
  // Allow service-style use from staff page even if only view — staff create preferred
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in", created: 0 };

  let created = 0;
  for (const ymd of upcomingDateKeys(days)) {
    const { starts_at, ends_at } = sessionBoundsForDate(ymd);

    // Do not recreate if a session already exists for this slot,
    // including cancelled ones (staff cancel must stick).
    const { data: existing } = await supabase
      .from("school_sessions")
      .select("id")
      .eq("starts_at", starts_at)
      .in("status", ["scheduled", "live", "cancelled", "completed"])
      .limit(1);

    if (existing?.length) continue;

    const { error } = await supabase.from("school_sessions").insert({
      title: SESSION_DEFAULT_TITLE,
      subject: "General",
      description: SESSION_DEFAULT_DESCRIPTION,
      starts_at,
      ends_at,
      status: "scheduled",
      teacher_id: user.id,
      created_by: user.id,
    });
    if (!error) created += 1;
    else console.warn("[sessions] ensure day", ymd, error.message);
  }

  revalidatePath("/dashboard/sessions");
  revalidatePath("/staff/sessions");
  return {
    ok: true,
    created,
    window: formatSessionWindowLabel(),
  };
}

export { formatSessionWindowLabel };

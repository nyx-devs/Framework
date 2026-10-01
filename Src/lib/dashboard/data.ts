import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/profile";

export type ApplicationRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  position: {
    id: string;
    title: string;
    slug: string;
    department: string | null;
    closing_date: string | null;
  } | null;
};

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Ensure row exists in public.profiles
  await ensureProfile(user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: profile || {
      id: user.id,
      email: user.email || "",
      full_name:
        (user.user_metadata?.full_name as string) ||
        user.email?.split("@")[0] ||
        "Applicant",
      phone: null as string | null,
      role: "applicant",
      created_at: user.created_at,
    },
  };
}

export async function getMyApplications(): Promise<ApplicationRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("applications")
    .select(
      `
      id,
      status,
      submitted_at,
      created_at,
      updated_at,
      position:positions (
        id,
        title,
        slug,
        closing_date,
        department:departments ( name )
      )
    `
    )
    .eq("applicant_id", user.id)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => {
    const pos = row.position as Record<string, unknown> | null;
    const dept = pos?.department as { name?: string } | null;
    return {
      id: row.id as string,
      status: row.status as string,
      submitted_at: row.submitted_at as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      position: pos
        ? {
            id: pos.id as string,
            title: pos.title as string,
            slug: pos.slug as string,
            department: dept?.name ?? null,
            closing_date: (pos.closing_date as string) ?? null,
          }
        : null,
    };
  });
}

export async function getUnreadMessageCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: apps } = await supabase
    .from("applications")
    .select("id")
    .eq("applicant_id", user.id);

  if (!apps?.length) return 0;

  const ids = apps.map((a) => a.id);
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("application_id", ids)
    .is("read_at", null)
    .neq("sender_id", user.id);

  return count ?? 0;
}

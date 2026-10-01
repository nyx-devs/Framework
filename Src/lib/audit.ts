import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export type AuditAction =
  | "login"
  | "logout"
  | "staff.created"
  | "staff.updated"
  | "staff.disabled"
  | "staff.enabled"
  | "staff.role_changed"
  | "application.viewed"
  | "application.assigned"
  | "application.status_changed"
  | "application.accepted"
  | "application.rejected"
  | "interview.created"
  | "interview.updated"
  | "discord.linked"
  | "discord.unlinked"
  | "settings.updated"
  | "message.sent"
  | "position.created"
  | "position.updated";

export async function writeAuditLog(params: {
  action: AuditAction | string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  actorId?: string;
}) {
  try {
    const supabase = await createClient();
    let actorId = params.actorId;
    if (!actorId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      actorId = user?.id;
    }

    let ip: string | undefined;
    try {
      const h = await headers();
      ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        undefined;
    } catch {
      // headers() may not be available in all contexts
    }

    await supabase.from("audit_logs").insert({
      actor_id: actorId || null,
      action: params.action,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      details: params.details || {},
      ip_address: ip || null,
    });
  } catch (err) {
    // Never fail the main action because of audit
    console.error("[audit] failed to write log", err);
  }
}

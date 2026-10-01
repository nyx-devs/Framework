import { createClient } from "@/lib/supabase/server";
import {
  notifyNewApplication,
  notifyStatusChange,
  notifyInterviewScheduled,
  notifyApplicantStatusDm,
  notifyBluebirdUserDm,
} from "@/lib/discord";
import { writeAuditLog } from "@/lib/audit";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://your-school.vercel.app/0";
}

export async function createInAppNotification(params: {
  userId: string;
  title: string;
  body?: string;
  link?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("notifications").insert({
      user_id: params.userId,
      title: params.title,
      body: params.body || null,
      link: params.link || null,
      type: params.type || "general",
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.error("[notifications] in-app failed", err);
  }

  // Mirror to Discord DM when the user has linked Discord
  try {
    const site = siteUrl();
    const link = params.link
      ? params.link.startsWith("http")
        ? params.link
        : `${site}${params.link.startsWith("/") ? "" : "/"}${params.link}`
      : site;
    const dm = await notifyBluebirdUserDm({
      userId: params.userId,
      title: params.title,
      description:
        (params.body || "You have a new notification on Ro-School.") +
        (params.link ? `\n\n[Open on website](${link})` : ""),
      url: link,
      color:
        params.type === "school_mail"
          ? 0x5865f2
          : params.type === "status_changed"
            ? 0x2a5a9e
            : 0x1a3a6b,
    });
    if (!dm.ok) {
      console.warn("[notifications] Discord DM:", dm.error);
    }
  } catch (err) {
    console.warn("[notifications] Discord DM exception", err);
  }
}

export async function createTimelineEvent(params: {
  applicationId: string;
  eventType: string;
  summary: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  /** If false, applicants should not see this event */
  visibleToApplicant?: boolean;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("timeline_events").insert({
      application_id: params.applicationId,
      actor_id: params.actorId || null,
      event_type: params.eventType,
      summary: params.summary,
      metadata: {
        ...(params.metadata || {}),
        visible_to_applicant: params.visibleToApplicant !== false,
      },
    });
  } catch (err) {
    console.error("[notifications] timeline failed", err);
  }
}

/**
 * Orchestrate side-effects after an application is submitted.
 * Core DB write must already have succeeded before calling this.
 */
export async function onApplicationSubmitted(params: {
  applicationId: string;
  referenceCode: string;
  applicantId: string;
  applicantName: string;
  positionTitle: string;
  departmentName?: string | null;
  departmentId?: string | null;
}) {
  await createTimelineEvent({
    applicationId: params.applicationId,
    eventType: "submitted",
    summary: "Application submitted",
    actorId: params.applicantId,
    visibleToApplicant: true,
  });

  await createInAppNotification({
    userId: params.applicantId,
    title: "Application submitted",
    body: `Your application for ${params.positionTitle} (${params.referenceCode}) has been received.`,
    link: `/dashboard/applications/${params.applicationId}`,
    type: "application_submitted",
  });

  // Notify staff who can review (best-effort: all active staff with applications.view)
  // For simplicity, notify via Discord only here; staff in-app can be expanded later

  const discord = await notifyNewApplication({
    ...params,
    siteUrl: siteUrl(),
  });
  if (!discord.ok) {
    console.warn("[notifications] Discord new application:", discord.error);
  }

  await writeAuditLog({
    action: "application.status_changed",
    entityType: "application",
    entityId: params.applicationId,
    actorId: params.applicantId,
    details: { status: "submitted", reference: params.referenceCode },
  });
}

export async function onApplicationStatusChanged(params: {
  applicationId: string;
  referenceCode: string;
  positionTitle: string;
  fromStatus: string;
  toStatus: string;
  actorId: string;
  actorName: string;
  applicantId: string;
  departmentId?: string | null;
}) {
  await createTimelineEvent({
    applicationId: params.applicationId,
    eventType: "status_changed",
    summary: `Status changed: ${params.fromStatus} → ${params.toStatus}`,
    actorId: params.actorId,
    metadata: { from: params.fromStatus, to: params.toStatus },
    visibleToApplicant: true,
  });

  await createInAppNotification({
    userId: params.applicantId,
    title: "Application update",
    body: `Your application ${params.referenceCode} is now: ${params.toStatus.replace(/_/g, " ")}.`,
    link: `/dashboard/applications/${params.applicationId}`,
    type: "status_changed",
  });

  const discord = await notifyStatusChange({
    referenceCode: params.referenceCode,
    positionTitle: params.positionTitle,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    changedBy: params.actorName,
    applicationId: params.applicationId,
    departmentId: params.departmentId,
    siteUrl: siteUrl(),
  });
  if (!discord.ok) {
    console.warn("[notifications] Discord status:", discord.error);
  }

  const applicantDm = await notifyApplicantStatusDm({
    applicantUserId: params.applicantId,
    referenceCode: params.referenceCode,
    positionTitle: params.positionTitle,
    toStatus: params.toStatus,
    siteUrl: siteUrl(),
  });
  if (!applicantDm.ok) {
    console.warn("[notifications] Applicant Discord DM:", applicantDm.error);
  }

  await writeAuditLog({
    action:
      params.toStatus === "accepted"
        ? "application.accepted"
        : params.toStatus === "rejected"
          ? "application.rejected"
          : "application.status_changed",
    entityType: "application",
    entityId: params.applicationId,
    actorId: params.actorId,
    details: {
      from: params.fromStatus,
      to: params.toStatus,
      reference: params.referenceCode,
    },
  });
}

export async function onApplicationAssigned(params: {
  applicationId: string;
  referenceCode: string;
  assigneeId: string;
  assigneeName: string;
  actorId: string;
  actorName: string;
}) {
  await createTimelineEvent({
    applicationId: params.applicationId,
    eventType: "assigned",
    summary: `Assigned to ${params.assigneeName}`,
    actorId: params.actorId,
    visibleToApplicant: false,
  });

  await createInAppNotification({
    userId: params.assigneeId,
    title: "Application assigned to you",
    body: `You have been assigned application ${params.referenceCode}.`,
    link: `/staff/applications/${params.applicationId}`,
    type: "assignment",
  });

  await writeAuditLog({
    action: "application.assigned",
    entityType: "application",
    entityId: params.applicationId,
    actorId: params.actorId,
    details: {
      assignee_id: params.assigneeId,
      assignee_name: params.assigneeName,
      reference: params.referenceCode,
    },
  });
}

export async function onInterviewCreated(params: {
  applicationId: string;
  referenceCode: string;
  positionTitle: string;
  when: string;
  location: string;
  actorId: string;
}) {
  await createTimelineEvent({
    applicationId: params.applicationId,
    eventType: "interview_scheduled",
    summary: `Interview scheduled for ${params.when}`,
    actorId: params.actorId,
    visibleToApplicant: true,
  });

  const discord = await notifyInterviewScheduled({
    ...params,
    siteUrl: siteUrl(),
  });
  if (!discord.ok) {
    console.warn("[notifications] Discord interview:", discord.error);
  }

  await writeAuditLog({
    action: "interview.created",
    entityType: "application",
    entityId: params.applicationId,
    actorId: params.actorId,
    details: { when: params.when, location: params.location },
  });
}

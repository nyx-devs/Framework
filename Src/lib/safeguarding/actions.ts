"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { hasPermission } from "@/lib/permissions";
import { notifySafeguardingWebhook } from "@/lib/safeguarding/webhook";
import { revalidatePath } from "next/cache";

function refCode(): string {
  const year = new Date().getFullYear();
  const number = Math.floor(Math.random() * 9000) + 1000;

  return `SB-${year}-${number}`;
}

const VALID_CONCERN_TYPES = [
  "myself",
  "another_student",
  "staff",
  "other",
] as const;

const VALID_DANGER_VALUES = ["yes", "no", "unsure"] as const;

const VALID_STATUSES = [
  "open",
  "under_review",
  "action_required",
  "resolved",
  "closed",
] as const;

export async function submitSafeguardingConcern(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "You must be signed in.",
    };
  }

  const concern_about = String(
    formData.get("concern_about") ?? ""
  ).trim();

  const what_happened = String(
    formData.get("what_happened") ?? ""
  ).trim();

  const when_happened = String(
    formData.get("when_happened") ?? ""
  ).trim();

  const where_happened = String(
    formData.get("where_happened") ?? ""
  ).trim();

  const others_involved = String(
    formData.get("others_involved") ?? ""
  ).trim();

  const immediate_danger = String(
    formData.get("immediate_danger") ?? ""
  ).trim();

  const additional_info = String(
    formData.get("additional_info") ?? ""
  ).trim();

  if (
    !VALID_CONCERN_TYPES.includes(
      concern_about as (typeof VALID_CONCERN_TYPES)[number]
    )
  ) {
    return {
      error: "Please say who the concern is about.",
    };
  }

  if (what_happened.length < 10) {
    return {
      error:
        "Please describe what happened (at least 10 characters).",
    };
  }

  if (
    !VALID_DANGER_VALUES.includes(
      immediate_danger as (typeof VALID_DANGER_VALUES)[number]
    )
  ) {
    return {
      error:
        "Please answer whether anyone is in immediate danger.",
    };
  }

  const reference = refCode();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: row, error: insertError } = await supabase
    .from("safeguarding_reports")
    .insert({
      reference,
      submitted_by: user.id,
      concern_about,
      what_happened,
      when_happened: when_happened || null,
      where_happened: where_happened || null,
      others_involved: others_involved || null,
      immediate_danger,
      additional_info: additional_info || null,
      status: "open",
    })
    .select("id, reference, created_at")
    .single();

  if (insertError || !row) {
    console.error(
      "[safeguarding] Failed to create report:",
      insertError?.message
    );

    return {
      error:
        "Could not save the report. Please try again or contact staff.",
    };
  }

  /*
   * Create an audit record.
   *
   * Audit failure must not prevent the safeguarding report
   * from being successfully submitted.
   */
  try {
    const admin = createServiceClient();

    const { error: auditError } = await admin
      .from("safeguarding_audit")
      .insert({
        report_id: row.id,
        actor_id: user.id,
        action: "report_created",
        new_value: row.reference,
      });

    if (auditError) {
      console.warn(
        "[safeguarding] Audit insert failed:",
        auditError.message
      );
    }
  } catch (error) {
    console.warn(
      "[safeguarding] Audit operation failed:",
      error
    );
  }

  /*
   * Notify the safeguarding Discord webhook.
   *
   * Webhook failure must never prevent the report from
   * being saved successfully.
   */
  try {
    const webhookResult = await notifySafeguardingWebhook({
      reference: row.reference,
      submittedLabel:
        profile?.full_name ||
        profile?.email ||
        user.email ||
        "Ro-School member",
      concernAbout: concern_about,
      platform: where_happened || "Not specified",
      immediateDanger: immediate_danger,
      summary: what_happened,
      additional: additional_info,
      submittedAt: new Date(row.created_at).toLocaleString("en-GB"),
    });

    if (!webhookResult.ok) {
      console.warn(
        "[safeguarding] Webhook failed:",
        webhookResult.error
      );
    }
  } catch (error) {
    console.warn(
      "[safeguarding] Webhook operation failed:",
      error
    );
  }

  revalidatePath("/dashboard/safeguarding");
  revalidatePath("/staff/safeguarding");

  return {
    ok: true,
    reference: row.reference,
  };
}

export async function listMySafeguardingReports() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("safeguarding_reports")
    .select(
      "id, reference, status, created_at, concern_about"
    )
    .eq("submitted_by", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "[safeguarding] Failed to load own reports:",
      error.message
    );

    return [];
  }

  return data ?? [];
}

export async function staffListSafeguardingReports() {
  const can = await hasPermission("safeguarding.view");

  if (!can) {
    return {
      error: "Forbidden",
      rows: [] as const,
    };
  }

  try {
    const admin = createServiceClient();

    const { data, error } = await admin
      .from("safeguarding_reports")
      .select(
        [
          "id",
          "reference",
          "status",
          "concern_about",
          "immediate_danger",
          "created_at",
          "submitted_by",
          "assigned_to",
        ].join(", ")
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) {
      console.error(
        "[safeguarding] Failed to load staff reports:",
        error.message
      );

      return {
        error: "Unavailable",
        rows: [] as const,
      };
    }

    return {
      rows: data ?? [],
    };
  } catch (error) {
    console.error(
      "[safeguarding] Staff report query failed:",
      error
    );

    return {
      error: "Unavailable",
      rows: [] as const,
    };
  }
}

export async function staffUpdateSafeguardingStatus(
  reportId: string,
  status: string
) {
  const can = await hasPermission("safeguarding.manage");

  if (!can) {
    return {
      error: "Forbidden",
    };
  }

  if (
    !VALID_STATUSES.includes(
      status as (typeof VALID_STATUSES)[number]
    )
  ) {
    return {
      error: "Invalid status",
    };
  }

  if (!reportId || reportId.trim().length === 0) {
    return {
      error: "Invalid report ID",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "You must be signed in.",
    };
  }

  try {
    const admin = createServiceClient();

    /*
     * Get the current report first so we can:
     * - make sure it exists
     * - record the previous status in the audit log
     */
    const { data: previousReport, error: previousError } =
      await admin
        .from("safeguarding_reports")
        .select("id, status")
        .eq("id", reportId)
        .maybeSingle();

    if (previousError) {
      console.error(
        "[safeguarding] Failed to load report:",
        previousError.message
      );

      return {
        error: "Could not load the report.",
      };
    }

    if (!previousReport) {
      return {
        error: "Safeguarding report not found.",
      };
    }

    if (previousReport.status === status) {
      return {
        ok: true,
      };
    }

    /*
     * Update the report.
     */
    const { error: updateError } = await admin
      .from("safeguarding_reports")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (updateError) {
      console.error(
        "[safeguarding] Failed to update status:",
        updateError.message
      );

      return {
        error: "Could not update the safeguarding report.",
      };
    }

    /*
     * Record the status change.
     */
    const { error: auditError } = await admin
      .from("safeguarding_audit")
      .insert({
        report_id: reportId,
        actor_id: user.id,
        action: "status_changed",
        previous_value: previousReport.status,
        new_value: status,
      });

    if (auditError) {
      console.warn(
        "[safeguarding] Failed to create status audit:",
        auditError.message
      );
    }

    revalidatePath("/staff/safeguarding");
    revalidatePath("/dashboard/safeguarding");

    return {
      ok: true,
    };
  } catch (error) {
    console.error(
      "[safeguarding] Status update failed:",
      error
    );

    return {
      error: "Update failed",
    };
  }
}
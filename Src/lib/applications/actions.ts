"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { onApplicationSubmitted } from "@/lib/notifications";

export type ApplyResult = {
  error?: string;
  applicationId?: string;
};

/*
 * Ro-School Staff Application
 *
 * These keys are stored in:
 * public.application_answers
 *
 * Keep this list in sync with the application form.
 */

const APPLICATION_QUESTIONS = [
  // INTRODUCTION
  "roblox_username",
  "discord_username",
  "age",
  "teaching_name",
  "position",
  "bluebird_group",
  "staff_database",

  // ROLE & MOTIVATION
  "why_bluebird",
  "role_knowledge",
  "good_staff_member",
  "role_goals",
  "motivation",
  "strengths",
  "weaknesses",

  // EXPERIENCE & SKILLS
  "previous_experience",
  "experience_organisation",
  "leadership_experience",
  "teaching_experience",
  "communication_skills",
  "skills_contribution",

  // STUDENT MANAGEMENT
  "disruptive_student",
  "refusing_instructions",
  "student_disagreement",
  "student_insulting_staff",
  "student_breaking_rules",
  "serious_concern",

  // SAFEGUARDING & PROFESSIONAL CONDUCT
  "staff_member_breaking_rules",
  "safeguarding_concern",
  "confidential_information",
  "professional_boundaries",
  "staff_friendship_boundary",
  "inappropriate_message",

  // SCENARIOS
  "scenario_staff_argument",
  "scenario_parent_complaint",
  "scenario_false_accusation",
  "scenario_emergency",
  "scenario_mistake",

  // TEAMWORK & COMMUNICATION
  "teamwork",
  "disagreement_staff",
  "feedback",
  "communication_problem",

  // AVAILABILITY & COMMITMENT
  "availability",
  "activity",
  "absence",
  "commitment",

  // SUITABILITY
  "suitability",
  "why_choose_you",
  "contribution",
  "future_goals",

  // ACCOUNT INFORMATION & DECLARATION
  "roblox_age_category",
  "confirmation",
] as const;

/*
 * Exact question wording stored with each answer.
 */
const QUESTIONS = [
  // ------------------------------------------------------------
  // INTRODUCTION
  // ------------------------------------------------------------

  {
    key: "roblox_username",
    question: "What is your Roblox Username?",
  },
  {
    key: "discord_username",
    question: "What is your Discord Username?",
  },
  {
    key: "age",
    question: "How old are you?",
  },
  {
    key: "teaching_name",
    question:
      "What would you like your teaching name to be?",
  },
  {
    key: "position",
    question:
      "Which position are you applying for?",
  },
  {
    key: "bluebird_group",
    question:
      "Are you currently in the Ro-School Roblox group?",
  },
  {
    key: "staff_database",
    question:
      "Are you able to complete the Staff Database when required?",
  },

  // ------------------------------------------------------------
  // ROLE & MOTIVATION
  // ------------------------------------------------------------

  {
    key: "why_bluebird",
    question:
      "Why do you want to join Ro-School?",
  },
  {
    key: "role_knowledge",
    question:
      "What do you understand about the role you are applying for?",
  },
  {
    key: "good_staff_member",
    question:
      "What do you think makes a good member of staff?",
  },
  {
    key: "role_goals",
    question:
      "What would you like to achieve in this role?",
  },
  {
    key: "motivation",
    question:
      "What motivates you to remain active in a staff role?",
  },
  {
    key: "strengths",
    question:
      "What are your main strengths?",
  },
  {
    key: "weaknesses",
    question:
      "What is one area you could improve?",
  },

  // ------------------------------------------------------------
  // EXPERIENCE & SKILLS
  // ------------------------------------------------------------

  {
    key: "previous_experience",
    question:
      "What previous Roblox, learning community or staff experience do you have?",
  },
  {
    key: "experience_organisation",
    question:
      "Where did you gain your previous experience?",
  },
  {
    key: "leadership_experience",
    question:
      "Have you held a leadership or management position before?",
  },
  {
    key: "teaching_experience",
    question:
      "What experience do you have with teaching or helping other players?",
  },
  {
    key: "communication_skills",
    question:
      "How would you describe your communication skills?",
  },
  {
    key: "skills_contribution",
    question:
      "What skills could you bring to the Ro-School staff team?",
  },

  // ------------------------------------------------------------
  // STUDENT MANAGEMENT
  // ------------------------------------------------------------

  {
    key: "disruptive_student",
    question:
      "How would you handle a disruptive student during a session?",
  },
  {
    key: "refusing_instructions",
    question:
      "What would you do if a student refused to follow your instructions?",
  },
  {
    key: "student_disagreement",
    question:
      "How would you handle a disagreement between two students?",
  },
  {
    key: "student_insulting_staff",
    question:
      "What would you do if a student began insulting or disrespecting you?",
  },
  {
    key: "student_breaking_rules",
    question:
      "What would you do if you saw a student repeatedly breaking Ro-School rules?",
  },
  {
    key: "serious_concern",
    question:
      "What would you do if a student raised a serious concern with you?",
  },

  // ------------------------------------------------------------
  // SAFEGUARDING & PROFESSIONAL CONDUCT
  // ------------------------------------------------------------

  {
    key: "staff_member_breaking_rules",
    question:
      "What would you do if you saw another member of staff breaking Ro-School rules?",
  },
  {
    key: "safeguarding_concern",
    question:
      "What would you do if a student disclosed a safeguarding concern to you?",
  },
  {
    key: "confidential_information",
    question:
      "How would you handle confidential information about students or staff?",
  },
  {
    key: "professional_boundaries",
    question:
      "Why are professional boundaries important when working with students?",
  },
  {
    key: "staff_friendship_boundary",
    question:
      "What would you do if a student you were friends with asked you to ignore a rule?",
  },
  {
    key: "inappropriate_message",
    question:
      "What would you do if you received an inappropriate or concerning message from a student?",
  },

  // ------------------------------------------------------------
  // SCENARIO QUESTIONS
  // ------------------------------------------------------------

  {
    key: "scenario_staff_argument",
    question:
      "Two staff members begin arguing publicly during a session. What would you do?",
  },
  {
    key: "scenario_parent_complaint",
    question:
      "A member of the community complains that a staff member treated them unfairly. How would you respond?",
  },
  {
    key: "scenario_false_accusation",
    question:
      "A student makes an accusation against another student, but you are not sure whether it is true. What would you do?",
  },
  {
    key: "scenario_emergency",
    question:
      "Something unexpected happens during a session and you are unsure what to do. What would you do first?",
  },
  {
    key: "scenario_mistake",
    question:
      "You realise that you have made a mistake as a staff member. How would you handle it?",
  },

  // ------------------------------------------------------------
  // TEAMWORK & COMMUNICATION
  // ------------------------------------------------------------

  {
    key: "teamwork",
    question:
      "How would you work effectively with other members of staff?",
  },
  {
    key: "disagreement_staff",
    question:
      "How would you handle a disagreement with another member of staff?",
  },
  {
    key: "feedback",
    question:
      "How would you respond if a senior staff member gave you constructive criticism?",
  },
  {
    key: "communication_problem",
    question:
      "What would you do if you believed another staff member had misunderstood something you said?",
  },

  // ------------------------------------------------------------
  // AVAILABILITY & COMMITMENT
  // ------------------------------------------------------------

  {
    key: "availability",
    question:
      "What is your general availability for Ro-School sessions and staff duties?",
  },
  {
    key: "activity",
    question:
      "How active do you expect to be within Ro-School?",
  },
  {
    key: "absence",
    question:
      "What would you do if you knew you were going to be unavailable for an extended period?",
  },
  {
    key: "commitment",
    question:
      "How would you demonstrate that you are committed to the role?",
  },

  // ------------------------------------------------------------
  // SUITABILITY
  // ------------------------------------------------------------

  {
    key: "suitability",
    question:
      "What makes you suitable for the position you are applying for?",
  },
  {
    key: "why_choose_you",
    question:
      "Why should we choose you for this position?",
  },
  {
    key: "contribution",
    question:
      "What would you like to contribute to Ro-School if accepted?",
  },
  {
    key: "future_goals",
    question:
      "Where would you like to progress within Ro-School in the future?",
  },

  // ------------------------------------------------------------
  // ACCOUNT INFORMATION & DECLARATION
  // ------------------------------------------------------------

  {
    key: "roblox_age_category",
    question:
      "What age category has your Roblox account been verified under?",
  },
  {
    key: "confirmation",
    question:
      "Application Declaration",
  },
] as const;

/**
 * Save all answers associated with an application.
 */
async function saveAnswers(
  applicationId: string,
  formData: FormData,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const answers = QUESTIONS.map(({ key, question }) => ({
    application_id: applicationId,
    question_key: key,
    question,
    answer: String(
      formData.get(key) || ""
    ).trim(),
  }));

  const { error } = await supabase
    .from("application_answers")
    .upsert(answers, {
      onConflict: "application_id,question_key",
    });

  return error;
}

/**
 * Start or continue an application.
 */
export async function startApplication(
  positionSlug: string
): Promise<ApplyResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "You must be signed in to apply.",
    };
  }

  const { data: position, error: posError } =
    await supabase
      .from("positions")
      .select(
        "id, slug, title, published, closing_date"
      )
      .eq("slug", positionSlug)
      .maybeSingle();

  if (posError || !position) {
    return {
      error:
        "This vacancy is not yet available for online applications. An administrator needs to publish it in the staff/admin panel first.",
    };
  }

  if (!position.published) {
    return {
      error:
        "This vacancy is not currently open for applications.",
    };
  }

  if (position.closing_date) {
    const today = new Date()
      .toISOString()
      .slice(0, 10);

    if (position.closing_date < today) {
      return {
        error:
          "The closing date for this vacancy has passed.",
      };
    }
  }

  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("position_id", position.id)
    .eq("applicant_id", user.id)
    .maybeSingle();

  if (existing) {
    return {
      applicationId: existing.id,
    };
  }

  const { data: created, error: createError } =
    await supabase
      .from("applications")
      .insert({
        position_id: position.id,
        applicant_id: user.id,
        status: "draft",
      })
      .select("id")
      .single();

  if (createError || !created) {
    return {
      error:
        createError?.message ||
        "Could not create application. Please try again.",
    };
  }

  return {
    applicationId: created.id,
  };
}

/**
 * Submit an application.
 */
export async function submitApplication(
  _prev: ApplyResult,
  formData: FormData
): Promise<ApplyResult> {
  const applicationId = String(
    formData.get("applicationId") || ""
  ).trim();

  if (!applicationId) {
    return {
      error: "Missing application.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "You must be signed in to submit.",
    };
  }

  const { data: app, error: fetchError } =
    await supabase
      .from("applications")
      .select(
        `
        id,
        status,
        applicant_id,
        position_id,
        position:positions (
          id,
          title,
          slug,
          department:departments (
            id,
            name
          )
        )
      `
      )
      .eq("id", applicationId)
      .maybeSingle();

  if (fetchError || !app) {
    return {
      error: "Application not found.",
    };
  }

  if (app.applicant_id !== user.id) {
    return {
      error:
        "You can only submit your own applications.",
    };
  }

  if (app.status !== "draft") {
    return {
      error:
        "This application has already been submitted.",
    };
  }

  /*
   * Make sure every required question has an answer.
   */
  for (const key of APPLICATION_QUESTIONS) {
    const value = String(
      formData.get(key) || ""
    ).trim();

    if (!value) {
      return {
        error:
          "Please complete all required questions before submitting.",
      };
    }
  }

  /*
   * Validate age.
   */
  const age = Number(
    String(formData.get("age") || "").trim()
  );

  if (
    !Number.isInteger(age) ||
    age < 1 ||
    age > 120
  ) {
    return {
      error: "Please enter a valid age.",
    };
  }

  /*
   * Validate Roblox age category.
   */
  const validAgeCategories = [
    "Below 9",
    "9–12",
    "13–15",
    "16–17",
    "18–20",
    "21+",
  ];

  const ageCategory = String(
    formData.get("roblox_age_category") || ""
  ).trim();

  if (!validAgeCategories.includes(ageCategory)) {
    return {
      error:
        "Please select a valid Roblox age category.",
    };
  }

  /*
   * Validate yes/no fields.
   */
  const yesNoFields = [
    "bluebird_group",
    "staff_database",
  ];

  for (const key of yesNoFields) {
    const value = String(
      formData.get(key) || ""
    ).trim();

    if (!["Yes", "No"].includes(value)) {
      return {
        error:
          "Please provide a valid answer to all required selection questions.",
      };
    }
  }

  /*
   * Validate declaration.
   */
  const confirmation = String(
    formData.get("confirmation") || ""
  ).trim();

  if (confirmation !== "I understand.") {
    return {
      error:
        "You must confirm the application declaration.",
    };
  }

  /*
   * Save answers.
   */
  const answerError = await saveAnswers(
    applicationId,
    formData,
    supabase
  );

  if (answerError) {
    return {
      error:
        answerError.message ||
        "Could not save your application answers.",
    };
  }

  /*
   * Move application from draft to submitted.
   */
  const { error: updateError } =
    await supabase
      .from("applications")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .eq("applicant_id", user.id);

  if (updateError) {
    return {
      error:
        updateError.message ||
        "Could not submit application.",
    };
  }

  /*
   * Get position information for notifications.
   */
  const pos = app.position as {
    title?: string;
    department?: {
      id?: string;
      name?: string;
    } | null;
  } | null;

  /*
   * Get applicant profile.
   */
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  /*
   * Notify staff/admin systems.
   *
   * Notification failures do not prevent
   * the application itself from being submitted.
   */
  try {
    await onApplicationSubmitted({
      applicationId,
      referenceCode: applicationId
        .slice(0, 8)
        .toUpperCase(),
      applicantId: user.id,
      applicantName:
        profile?.full_name ||
        (user.user_metadata?.full_name as string) ||
        user.email ||
        "Applicant",
      positionTitle:
        pos?.title || "Vacancy",
      departmentName:
        pos?.department?.name || null,
      departmentId:
        pos?.department?.id || null,
    });
  } catch {
    // Notifications are best-effort.
  }

  /*
   * Refresh relevant pages.
   */
  revalidatePath("/dashboard/applications");

  revalidatePath(
    `/dashboard/applications/${applicationId}`
  );

  revalidatePath("/staff/applications");

  revalidatePath("/admin/applications");

  redirect(
    `/dashboard/applications/${applicationId}?submitted=1`
  );
}

/**
 * Save an application as a draft.
 */
export async function saveApplicationDraft(
  _prev: ApplyResult,
  formData: FormData
): Promise<ApplyResult> {
  const applicationId = String(
    formData.get("applicationId") || ""
  ).trim();

  if (!applicationId) {
    return {
      error: "Missing application.",
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

  const { data: app, error: appError } =
    await supabase
      .from("applications")
      .select(
        "id, applicant_id, status"
      )
      .eq("id", applicationId)
      .maybeSingle();

  if (appError || !app) {
    return {
      error: "Application not found.",
    };
  }

  if (app.applicant_id !== user.id) {
    return {
      error:
        "You can only edit your own application.",
    };
  }

  if (app.status !== "draft") {
    return {
      error:
        "Only draft applications can be edited.",
    };
  }

  /*
   * Save whatever has currently been filled in.
   *
   * Unlike submission, drafts do not require
   * every question to be completed.
   */
  const answerError = await saveAnswers(
    applicationId,
    formData,
    supabase
  );

  if (answerError) {
    return {
      error:
        answerError.message ||
        "Could not save your application.",
    };
  }

  revalidatePath("/dashboard/applications");

  revalidatePath(
    `/dashboard/applications/${applicationId}`
  );

  return {
    applicationId,
  };
}
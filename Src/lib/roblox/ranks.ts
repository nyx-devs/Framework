/**
 * Central Ro-School Roblox group rank → band → permissions.
 * Use continuous ranges so ranks are never silently dropped to "student".
 * Edit RANK_BANDS only when group roles change.
 */

export const BLUEBIRD_GROUP_ID = Number(
  process.env.BLUEBIRD_ROBLOX_GROUP_ID || process.env.ROBLOX_GROUP_ID || "0"
);

export type BluebirdRankBand =
  | "none"
  | "student"
  | "teacher_in_training"
  | "support_staff"
  | "teacher"
  | "head_of_department"
  | "slt"
  | "assistant_head"
  | "deputy_head"
  | "headteacher"
  | "owner"
  | "administration";

/**
 * Inclusive rank ranges (Roblox group role rank number, 0–255).
 * Order: highest priority first when overlapping (should not overlap).
 */
export const RANK_BANDS: Array<{ band: Exclude<BluebirdRankBand, "none">; min: number; max: number }> = [
  { band: "owner", min: 200, max: 255 },
  { band: "administration", min: 190, max: 199 },
  { band: "headteacher", min: 150, max: 189 },
  { band: "deputy_head", min: 120, max: 149 },
  { band: "assistant_head", min: 110, max: 119 },
  { band: "slt", min: 100, max: 109 },
  { band: "head_of_department", min: 60, max: 99 },
  { band: "teacher", min: 40, max: 59 },
  { band: "support_staff", min: 30, max: 39 },
  { band: "teacher_in_training", min: 21, max: 29 },
  { band: "student", min: 1, max: 20 },
];

/** @deprecated discrete lists — prefer RANK_BANDS ranges */
export const BLUEBIRD_RANKS: Record<Exclude<BluebirdRankBand, "none">, number[]> = {
  student: [1, 2, 3, 4, 5, 10, 15, 20],
  teacher_in_training: [21, 22, 23, 24, 25, 26, 27, 28, 29],
  support_staff: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
  teacher: [40, 45, 50, 55],
  head_of_department: [60, 70, 80, 90],
  slt: [100, 105],
  assistant_head: [110],
  deputy_head: [120],
  headteacher: [150],
  owner: [200, 255],
  administration: [190, 195],
};

export const BAND_LABELS: Record<BluebirdRankBand, string> = {
  none: "Member",
  student: "Student",
  teacher_in_training: "Teacher in training",
  support_staff: "Support staff",
  teacher: "Teacher",
  head_of_department: "Head of department",
  slt: "SLT",
  assistant_head: "Assistant headteacher",
  deputy_head: "Deputy headteacher",
  headteacher: "Headteacher",
  owner: "Owner",
  administration: "Administration",
};

const STAFF_BASE = [
  "merits.view_own",
  "merits.view",
  "merits.award",
  "merits.award_bad",
  "sessions.view",
  "sessions.create",
  "sessions.edit",
  "sessions.attendance",
  "applications.view",
  "applications.review",
  "applications.message",
  "notifications.view",
  "positions.view",
  "departments.view",
  "staff.view",
  "safeguarding.create",
];

export const BAND_PERMISSIONS: Record<BluebirdRankBand, string[]> = {
  none: ["notifications.view", "safeguarding.create", "sessions.view"],
  student: ["merits.view_own", "notifications.view", "safeguarding.create", "sessions.view"],
  teacher_in_training: [
    "merits.view_own",
    "merits.view",
    "sessions.view",
    "notifications.view",
    "safeguarding.create",
  ],
  support_staff: [...STAFF_BASE],
  teacher: [...STAFF_BASE, "sessions.cancel"],
  head_of_department: [
    ...STAFF_BASE,
    "sessions.cancel",
    "applications.interview",
    "staff.edit",
  ],
  slt: [
    ...STAFF_BASE,
    "sessions.cancel",
    "applications.interview",
    "applications.accept",
    "applications.reject",
    "applications.assign",
    "staff.edit",
    "audit.view",
    "safeguarding.view",
    "safeguarding.manage",
    "safeguarding.assign",
    "safeguarding.resolve",
  ],
  assistant_head: [
    ...STAFF_BASE,
    "sessions.cancel",
    "applications.interview",
    "applications.accept",
    "applications.reject",
    "applications.assign",
    "staff.edit",
    "audit.view",
    "safeguarding.view",
    "safeguarding.manage",
    "safeguarding.assign",
    "safeguarding.resolve",
    "safeguarding.audit",
  ],
  deputy_head: [
    ...STAFF_BASE,
    "sessions.cancel",
    "merits.remove",
    "applications.interview",
    "applications.accept",
    "applications.reject",
    "applications.assign",
    "staff.create",
    "staff.edit",
    "audit.view",
    "safeguarding.view",
    "safeguarding.manage",
    "safeguarding.assign",
    "safeguarding.resolve",
    "safeguarding.audit",
    "settings.manage",
    "staff_database.view",
    "staff_database.edit",
    "staff_database.create",
  ],
  headteacher: ["*"],
  owner: ["*"],
  administration: ["*"],
};

export function bandFromRankId(rankId: number | null | undefined): BluebirdRankBand {
  if (rankId == null || rankId <= 0) return "none";
  for (const row of RANK_BANDS) {
    if (rankId >= row.min && rankId <= row.max) return row.band;
  }
  // Unknown positive rank: do not default to student — treat as none until mapped
  console.warn("[ranks] unmapped Roblox rank id", rankId);
  return "none";
}

export function profileRoleFromBand(
  band: BluebirdRankBand
): "applicant" | "staff" | "admin" {
  if (
    band === "administration" ||
    band === "owner" ||
    band === "headteacher" ||
    band === "deputy_head"
  )
    return "admin";
  if (
    band === "support_staff" ||
    band === "teacher" ||
    band === "teacher_in_training" ||
    band === "head_of_department" ||
    band === "slt" ||
    band === "assistant_head"
  )
    return "staff";
  return "applicant";
}

const HT_PLUS_BANDS: BluebirdRankBand[] = [
  "headteacher",
  "deputy_head",
  "owner",
  "administration",
];

export function isHtPlusBand(band: BluebirdRankBand): boolean {
  return HT_PLUS_BANDS.includes(band);
}

export function bandHasPermission(band: BluebirdRankBand, key: string): boolean {
  const list = BAND_PERMISSIONS[band] || [];
  if (list.includes("*")) return true;
  return list.includes(key);
}

export function isStaffBand(band: BluebirdRankBand): boolean {
  return (
    band !== "none" &&
    band !== "student"
  );
}

export function labelForBand(band: BluebirdRankBand): string {
  return BAND_LABELS[band] || "Member";
}

export type PositionStatus = "Open" | "Closed";

export type Position = {
  id: string;
  slug: string;
  title: string;
  category: "Leadership" | "Teaching" | "Support";
  department: string | null;
  description: string;
  requirements: string[];
  applicationRoute: "Direct Entry" | "Internal";
  published: boolean;
  status: PositionStatus;
  closingDate: string | null;
};

export const positions: Position[] = [
  {
    id: "headteacher",
    slug: "headteacher",
    title: "Headteacher",
    category: "Leadership",
    department: null,
    description:
      "The Headteacher provides overall leadership and direction for Ro-School.",
    requirements: [
      "Previous leadership experience.",
      "Strong communication and organisational skills.",
      "A strong understanding of Ro-School and its community.",
    ],
    applicationRoute: "Internal",
    published: true,
    status: "Closed",
    closingDate: null,
  },

  {
    id: "deputy-headteacher",
    slug: "deputy-headteacher",
    title: "Deputy Headteacher",
    category: "Leadership",
    department: null,
    description:
      "The Deputy Headteacher supports the Headteacher with the leadership and day-to-day running of Ro-School.",
    requirements: [
      "Previous leadership experience.",
      "Strong communication and organisational skills.",
      "Ability to support the Senior Leadership Team.",
    ],
    applicationRoute: "Internal",
    published: true,
    status: "Closed",
    closingDate: null,
  },

  {
    id: "assistant-headteacher",
    slug: "assistant-headteacher",
    title: "Assistant Headteacher",
    category: "Leadership",
    department: null,
    description:
      "Assistant Headteachers support the Senior Leadership Team with the organisation and development of Ro-School.",
    requirements: [
      "Previous leadership or senior staff experience.",
      "Strong communication skills.",
      "Ability to support staff and students.",
    ],
    applicationRoute: "Internal",
    published: true,
    status: "Closed",
    closingDate: null,
  },

  {
    id: "group-developer",
    slug: "group-developer",
    title: "Group Developer",
    category: "Leadership",
    department: null,
    description:
      "Group Developers support the development and organisation of Ro-School and its wider Roblox group.",
    requirements: [
      "Previous development or relevant group experience.",
      "Good communication skills.",
      "Ability to work with other members of staff.",
    ],
    applicationRoute: "Direct Entry",
    published: true,
    status: "Open",
    closingDate: null,
  },

  {
    id: "head-of-department",
    slug: "head-of-department",
    title: "Head of Department",
    category: "Leadership",
    department: null,
    description:
      "Heads of Department oversee their assigned department and support the teaching team.",
    requirements: [
      "Previous teaching or leadership experience.",
      "Strong organisation and communication skills.",
      "Ability to support and manage departmental staff.",
    ],
    applicationRoute: "Direct Entry",
    published: true,
    status: "Open",
    closingDate: null,
  },

  {
    id: "deputy-head-of-department",
    slug: "deputy-head-of-department",
    title: "Deputy Head of Department",
    category: "Leadership",
    department: null,
    description:
      "Deputy Heads of Department support the Head of Department with the organisation and running of their department.",
    requirements: [
      "Previous teaching or staff experience.",
      "Good organisation and communication.",
      "Ability to support departmental staff.",
    ],
    applicationRoute: "Direct Entry",
    published: true,
    status: "Open",
    closingDate: null,
  },

  {
    id: "head-of-year",
    slug: "head-of-year",
    title: "Head of Year",
    category: "Teaching",
    department: null,
    description:
      "Heads of Year support students and staff within their assigned year group.",
    requirements: [
      "Previous teaching or pastoral experience.",
      "Strong communication skills.",
      "Ability to support students and staff.",
    ],
    applicationRoute: "Direct Entry",
    published: true,
    status: "Open",
    closingDate: null,
  },

  {
    id: "inclusion-manager",
    slug: "inclusion-manager",
    title: "Inclusion Manager",
    category: "Support",
    department: null,
    description:
      "The Inclusion Manager supports an inclusive environment across Ro-School and works with staff to support students.",
    requirements: [
      "Previous staff or support experience.",
      "Strong communication skills.",
      "Ability to work with students and staff.",
    ],
    applicationRoute: "Direct Entry",
    published: true,
    status: "Open",
    closingDate: null,
  },

  {
    id: "classroom-teacher",
    slug: "classroom-teacher",
    title: "Classroom Teacher",
    category: "Teaching",
    department: null,
    description:
      "Classroom Teachers deliver lessons and support students during Ro-School sessions.",
    requirements: [
      "Previous teaching or relevant staff experience is preferred.",
      "Good communication and professionalism.",
      "Ability to work positively with students and staff.",
    ],
    applicationRoute: "Direct Entry",
    published: true,
    status: "Open",
    closingDate: null,
  },

  {
    id: "teaching-assistant",
    slug: "teaching-assistant",
    title: "Teaching Assistant",
    category: "Teaching",
    department: null,
    description:
      "Teaching Assistants support teachers and students during Ro-School sessions.",
    requirements: [
      "Good communication skills.",
      "Patient and supportive approach.",
      "Ability to work alongside teaching staff.",
    ],
    applicationRoute: "Direct Entry",
    published: true,
    status: "Open",
    closingDate: null,
  },

  {
    id: "safeguarding-officer",
    slug: "safeguarding-officer",
    title: "Safeguarding Officer",
    category: "Support",
    department: null,
    description:
      "Safeguarding Officers support safeguarding procedures and help maintain a safe environment within Ro-School.",
    requirements: [
      "Previous staff or safeguarding experience.",
      "Strong communication skills.",
      "Ability to handle sensitive matters appropriately.",
    ],
    applicationRoute: "Direct Entry",
    published: true,
    status: "Open",
    closingDate: null,
  },

  {
    id: "sen-support-assistant",
    slug: "sen-support-assistant",
    title: "SEN Support Assistant",
    category: "Support",
    department: null,
    description:
      "SEN Support Assistants provide additional support to students who require it during Ro-School sessions.",
    requirements: [
      "Good communication skills.",
      "Patient and supportive approach.",
      "Previous support experience is beneficial.",
    ],
    applicationRoute: "Direct Entry",
    published: true,
    status: "Open",
    closingDate: null,
  },

  {
    id: "behaviour-support-officer",
    slug: "behaviour-support-officer",
    title: "Behaviour Support Officer",
    category: "Support",
    department: null,
    description:
      "Behaviour Support Officers help staff manage behaviour and support students across Ro-School.",
    requirements: [
      "Good communication skills.",
      "Calm and professional approach.",
      "Ability to work with students and staff.",
    ],
    applicationRoute: "Direct Entry",
    published: true,
    status: "Open",
    closingDate: null,
  },

  {
    id: "pastoral-support-assistant",
    slug: "pastoral-support-assistant",
    title: "Pastoral Support Assistant",
    category: "Support",
    department: null,
    description:
      "Pastoral Support Assistants provide support to students and help with wider pastoral matters.",
    requirements: [
      "Good communication skills.",
      "Supportive and professional approach.",
      "Ability to work with students and staff.",
    ],
    applicationRoute: "Direct Entry",
    published: true,
    status: "Open",
    closingDate: null,
  },

  {
    id: "initial-teacher-training",
    slug: "initial-teacher-training",
    title: "Initial Teacher Training",
    category: "Teaching",
    department: null,
    description:
      "Initial Teacher Training provides an opportunity for applicants to develop their teaching skills alongside experienced Ro-School staff.",
    requirements: [
      "Good communication skills.",
      "Willingness to learn.",
      "Reliable attendance.",
      "Ability to follow Ro-School staff procedures.",
    ],
    applicationRoute: "Direct Entry",
    published: true,
    status: "Open",
    closingDate: null,
  },
];

/**
 * Get all published positions.
 *
 * Closed positions are still returned so users
 * can view the vacancy, but applications can
 * be blocked using the status.
 */
export function getPublishedPositions(
  type: string = "all"
): Position[] {
  return positions.filter((position) => {
    if (!position.published) {
      return false;
    }

    if (type === "all") {
      return true;
    }

    return (
      position.category.toLowerCase() ===
      type.toLowerCase()
    );
  });
}

/**
 * Find a position by ID or slug.
 */
export function getPositionById(
  id: string
): Position | undefined {
  return positions.find(
    (position) =>
      position.id === id ||
      position.slug === id
  );
}

/**
 * Find a position by slug.
 */
export function getPositionBySlug(
  slug: string
): Position | undefined {
  return positions.find(
    (position) =>
      position.slug === slug
  );
}

/**
 * Check whether applications are currently open.
 */
export function isPositionOpen(
  position: Position
): boolean {
  return (
    position.published &&
    position.status === "Open"
  );
}

/**
 * Get the current vacancy status.
 */
export function getPositionStatus(
  position: Position
): PositionStatus {
  return position.status;
}

/**
 * Safely format the closing date.
 *
 * If there is no closing date, this returns
 * "No closing date" instead of "Invalid Date".
 */
export function getPositionClosingDate(
  position: Position
): string {
  if (!position.closingDate) {
    return "No closing date";
  }

  const date = new Date(
    position.closingDate
  );

  if (Number.isNaN(date.getTime())) {
    return "No closing date";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
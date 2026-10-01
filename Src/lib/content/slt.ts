/**
 * Senior Leadership Team (SLT).
 *
 * Ro-School learning community Senior Leadership Team.
 *
 * Roblox usernames and User IDs can be added once Roblox account
 * linking is available.
 */

export type SltMember = {
  id: string;
  name: string;
  robloxUsername: string;
  /** Set when Roblox account linking is available. */
  robloxUserId?: string | null;
  role: string;
  /** Path under /public or full URL. Leave empty for initials avatar. */
  profileImage?: string | null;
  shortDescription: string;
  department?: string | null;
  /** Display order (lower = higher on the page). */
  sortOrder: number;
};

export const sltMembers: SltMember[] = [
  {
    id: "vacant-headteacher",
    name: "Vacant",
    robloxUsername: "—",
    robloxUserId: null,
    role: "Headteacher",
    profileImage: null,
    shortDescription:
      "The Headteacher position is currently vacant. Further information will be published when the position is filled.",
    department: null,
    sortOrder: 10,
  },
  {
    id: "ms-s-farrington",
    name: "Ms S Farrington",
    robloxUsername: "strr_idk",
    robloxUserId: null,
    role: "Senior Leadership / Executive Leadership Link",
    profileImage: "/slt/Farrington.png",
    shortDescription:
      "Acts as the overall link between the Senior Leadership Team and Executive Leadership Team, supporting communication and coordination across both leadership teams.",
    department: null,
    sortOrder: 20,
  },
  {
    id: "mr-t-bradford",
    name: "Mr T Bradford",
    robloxUsername: "EKpixelation",
    robloxUserId: null,
    role: "Deputy Headteacher",
    profileImage: "/slt/bradford.png",
    shortDescription:
      "Deputy Headteacher and Line Manager for Line Alpha, supporting staff, middle leaders and the wider Senior Leadership Team.",
    department: "Line Alpha — Blue",
    sortOrder: 30,
  },
  {
    id: "miss-h-summer",
    name: "Miss H Summer",
    robloxUsername: "—",
    robloxUserId: null,
    role: "Deputy Headteacher",
    profileImage: "/slt/summer.png",
    shortDescription:
      "Deputy Headteacher and Line Manager for Line Bravo, supporting staff, middle leaders and the wider Senior Leadership Team.",
    department: "Line Bravo — Green",
    sortOrder: 40,
  },
  {
    id: "miss-l-grace",
    name: "Miss L Grace",
    robloxUsername: "L1LY_obvs",
    robloxUserId: null,
    role: "Assistant Headteacher",
    profileImage: "/slt/grace.png",
    shortDescription:
      "Assistant Headteacher supporting school leadership, staff development and the day-to-day organisation of Ro-School.",
    department: "Line Alpha — Blue",
    sortOrder: 50,
  },
  {
    id: "mr-l-probett",
    name: "Mr L Probett",
    robloxUsername: "Skigs999",
    robloxUserId: null,
    role: "Assistant Headteacher",
    profileImage: "/slt/probett.png",
    shortDescription:
      "Assistant Headteacher supporting school leadership, staff development and the day-to-day running and development of Ro-School.",
    department: "Line Bravo — Green",
    sortOrder: 60,
  },
];

export function getSltMembers(): SltMember[] {
  return [...sltMembers].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSltMemberById(id: string): SltMember | undefined {
  return sltMembers.find((m) => m.id === id);
}

export function isVacant(member: SltMember): boolean {
  const name = (member.name || "").trim().toLowerCase();
  return (
    name === "vacant" ||
    name.startsWith("vacant ") ||
    member.id.startsWith("vacant-")
  );
}


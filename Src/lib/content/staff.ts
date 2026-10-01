/**
 * Staff structure, based on the ranks already used in the staff portal
 * (Senior Leadership / Leadership / Teaching / Support).
 *
 * This lists ROLES, not people. To show who holds a role, add names to the
 * `people` array, e.g.  people: [{ name: "Ms Example", department: "English" }]
 * Leave `people` empty and only the role and its description are shown.
 */

export interface StaffPerson {
  name: string;
  department?: string;
}

export interface StaffRole {
  title: string;
  description: string;
  people?: StaffPerson[];
}

export interface StaffGroup {
  id: string;
  title: string;
  intro: string;
  roles: StaffRole[];
}

export const staffGroups: StaffGroup[] = [
  {
    id: "senior-leadership",
    title: "Senior leadership",
    intro: "The senior team runs the school and makes the bigger decisions.",
    roles: [
      {
        title: "Headteacher",
        description:
          "Leads the school and the senior leadership team, and has the final say on how Ro-School is run.",
      },
      {
        title: "Deputy Headteacher",
        description:
          "Supports the Headteacher and takes charge when they are away. Looks after day-to-day running of the school.",
      },
      {
        title: "Assistant Headteacher",
        description:
          "Leads a specific area, such as events, behaviour or staff development.",
      },
    ],
  },
  {
    id: "leadership",
    title: "Department and year leaders",
    intro: "These staff lead a department or look after a year group.",
    roles: [
      {
        title: "Head of Department",
        description:
          "Leads a subject department and makes sure lessons in that subject are planned and run well.",
      },
      {
        title: "Deputy Head of Department",
        description:
          "Works with the Head of Department and covers when they are away.",
      },
      {
        title: "Head of Year",
        description:
          "Looks after a year group, including student wellbeing and behaviour.",
      },
    ],
  },
  {
    id: "teaching-staff",
    title: "Teaching staff",
    intro: "Teachers plan and run the lessons on the timetable.",
    roles: [
      {
        title: "Lead Teacher",
        description:
          "An experienced teacher who helps other teachers and takes on extra responsibilities in a department.",
      },
      {
        title: "Teacher",
        description: "Plans and teaches lessons, and looks after a class.",
      },
      {
        title: "Early Career Teacher",
        description:
          "A newer teacher who is being supported and mentored by a colleague.",
      },
    ],
  },
  {
    id: "support-staff",
    title: "Support staff",
    intro: "Support staff keep the school running and look after students.",
    roles: [
      {
        title: "Pastoral Lead",
        description:
          "Leads the pastoral team and is the first contact for student concerns.",
      },
      {
        title: "Teaching Assistant",
        description:
          "Helps in lessons and works with students in small groups.",
      },
      {
        title: "Student Support",
        description:
          "Helps students with questions, problems and settling in.",
      },
      {
        title: "Administrative Staff",
        description:
          "Looks after records, messages and the day-to-day paperwork.",
      },
      {
        title: "Recruitment Officer",
        description:
          "Handles staff applications, from the first message to the final decision.",
      },
    ],
  },
];

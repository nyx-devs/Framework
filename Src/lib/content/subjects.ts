/**
 * Departments and the sessions they run.
 * Ro-School is a Roblox learning community — these are in-experience subjects/departments,
 * not real curriculum subjects with qualifications.
 */

export type Subject = {
  slug: string;
  name: string;
  description: string;
  led_by: string;
};

export type SubjectGroup = {
  title: string;
  intro: string;
  subjects: Subject[];
};

export const subjectGroups: SubjectGroup[] = [
  {
    title: "Core departments",
    intro: "The main subjects that form the backbone of the timetable.",
    subjects: [
      {
        slug: "english",
        name: "English",
        description:
          "Reading, writing and speaking sessions. Story writing, discussion and the occasional debate in-character.",
        led_by: "Head of English",
      },
      {
        slug: "mathematics",
        name: "Mathematics",
        description:
          "Number work, problem solving and puzzles in short, focused sessions.",
        led_by: "Head of Mathematics",
      },
      {
        slug: "science",
        name: "Science",
        description:
          "In-experience experiments and demonstrations covering biology, chemistry and physics topics.",
        led_by: "Head of Science",
      },
    ],
  },
  {
    title: "Wider curriculum",
    intro: "Departments that give the timetable variety.",
    subjects: [
      {
        slug: "humanities",
        name: "Humanities",
        description:
          "History and geography topics run in sessions, from local history to maps and travel.",
        led_by: "Head of Humanities",
      },
      {
        slug: "computing",
        name: "Computing",
        description:
          "How computers work, staying safe online and simple programming ideas — taught in Roblox sessions.",
        led_by: "Head of Computing",
      },
      {
        slug: "art-and-design",
        name: "Art & Design",
        description:
          "Drawing, design and creative projects. Work is often shared in the Discord server.",
        led_by: "Head of Art & Design",
      },
      {
        slug: "music",
        name: "Music",
        description:
          "Listening, rhythm and performing together during sessions.",
        led_by: "Head of Music",
      },
    ],
  },
  {
    title: "Support",
    intro: "Teams that look after students and staff outside the main timetable.",
    subjects: [
      {
        slug: "pastoral",
        name: "Pastoral",
        description:
          "Looks after behaviour, attendance and wellbeing in the community, and is the first stop when a student has a concern.",
        led_by: "Pastoral Lead",
      },
      {
        slug: "inclusion",
        name: "Inclusion",
        description:
          "Extra support for students who need it during sessions and in smaller groups.",
        led_by: "Head of Inclusion",
      },
    ],
  },
];

export const allSubjects: Subject[] = subjectGroups.flatMap((g) => g.subjects);

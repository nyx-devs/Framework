import {
  ApplicationCommandOptionType,
  type ApplicationCommandDataResolvable,
} from "discord.js";

export const commandDefinitions: ApplicationCommandDataResolvable[] = [
  { name: "help", description: "List Ro-School bot commands" },
  { name: "ping", description: "Check if the bot is online" },
  { name: "site", description: "Quick links to the Ro-School website" },
  {
    name: "link",
    description: "Get a code to link this Discord account to Ro-School",
  },
  {
    name: "whoami",
    description: "Your Ro-School profile, school email, and member code",
  },
  {
    name: "code",
    description: "Show your unique 6-digit Ro-School member code",
  },
  {
    name: "unlink",
    description: "Unlink Discord from your Ro-School account",
  },
  {
    name: "status",
    description: "Status of your applications on the website",
  },
  {
    name: "positions",
    description: "List open vacancies on the website",
  },
  {
    name: "mail",
    description: "School mail (@bbprimary.uk)",
    options: [
      {
        name: "inbox",
        description: "Show your latest school mail",
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: "send",
        description: "Send school mail to name@bbprimary.uk",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "to",
            description: "Recipient (e.g. eqeno@bbprimary.uk)",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: "subject",
            description: "Subject",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: "message",
            description: "Message body",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ],
      },
    ],
  },
  {
    name: "notifs",
    description: "Your latest website notifications",
  },
  {
    name: "testdm",
    description: "Send yourself a test Discord DM from Ro-School",
  },
  {
    name: "lookup",
    description: "Staff: look up a member by 6-digit code or school email",
    options: [
      {
        name: "query",
        description: "Member code (482917) or name@bbprimary.uk",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "member",
    description: "Staff: check if a Discord user is linked",
    options: [
      {
        name: "user",
        description: "Discord member",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
    ],
  },
  {
    name: "apps",
    description: "Staff: list recent applications",
    options: [
      {
        name: "status",
        description: "Filter by status",
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: [
          { name: "Submitted", value: "submitted" },
          { name: "Under review", value: "under_review" },
          { name: "Interview", value: "interview" },
          { name: "Accepted", value: "accepted" },
          { name: "Rejected", value: "rejected" },
        ],
      },
      {
        name: "limit",
        description: "How many (max 15)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
  },
  {
    name: "app",
    description: "Staff: view or update an application",
    options: [
      {
        name: "view",
        description: "View by reference code",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "reference",
            description: "Application reference",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ],
      },
      {
        name: "set-status",
        description: "Change status (notifies applicant on site + Discord)",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "reference",
            description: "Application reference",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: "status",
            description: "New status",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              { name: "Under review", value: "under_review" },
              { name: "Interview", value: "interview" },
              { name: "Accepted", value: "accepted" },
              { name: "Rejected", value: "rejected" },
              { name: "Withdrawn", value: "withdrawn" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "dm",
    description: "Staff: Discord-DM a linked member via the bot",
    options: [
      {
        name: "user",
        description: "Discord user (must be linked)",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "message",
        description: "Message to send",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "announce",
    description: "Staff: post an announcement embed",
    options: [
      {
        name: "title",
        description: "Title",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "message",
        description: "Body",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: "stats",
    description: "Staff: live recruitment stats from the website",
  },
  {
    name: "staffdb",
    description: "HT+ staff database search",
    options: [
      {
        type: 1,
        name: "search",
        description: "Search staff database entries",
        options: [
          {
            type: 3,
            name: "query",
            description: "Discord, Roblox, rank or notes",
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: "add",
        description: "Open form to add a staff database entry",
      },
    ],
  },

];

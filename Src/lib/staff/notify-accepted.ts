/**
 * When a staff application is accepted, post an embed + button to Discord.
 * Button custom_id: staff_db_fill:{applicationId}
 * Bot opens a modal; HT+ only.
 */
const DISCORD_API = "https://discord.com/api/v10";

export async function notifyStaffAccepted(opts: {
  applicationId: string;
  referenceCode?: string | null;
  applicantName?: string | null;
  positionTitle?: string | null;
}) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId =
    process.env.DISCORD_STAFF_ACCEPT_CHANNEL_ID ||
    process.env.DISCORD_STAFF_CHANNEL_ID ||
    process.env.DISCORD_APPLICATIONS_CHANNEL_ID;
  if (!token || !channelId) {
    console.warn(
      "[staff_accept] DISCORD_BOT_TOKEN or channel id not set — skip notify"
    );
    return { skipped: true };
  }

  const site = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://your-school.vercel.app"
  ).replace(/\/$/, "");

  const embeds = [
    {
      title: "Staff application accepted",
      color: 0x1e4d8c,
      description:
        "A new member of staff has been accepted.\n**HT+ only:** click the button below to complete their Staff Database entry.",
      fields: [
        {
          name: "Reference",
          value: opts.referenceCode || opts.applicationId.slice(0, 8),
          inline: true,
        },
        {
          name: "Applicant",
          value: opts.applicantName || "—",
          inline: true,
        },
        {
          name: "Position",
          value: opts.positionTitle || "—",
          inline: true,
        },
        {
          name: "Website",
          value: `[Staff database](${site}/staff/database)`,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    },
  ];

  // Primary button (type 2, style 1) — bot handles interaction
  const components = [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          label: "Complete staff database",
          custom_id: `staff_db_fill:${opts.applicationId}`,
        },
        {
          type: 2,
          style: 5,
          label: "Open on website",
          url: `${site}/staff/database/new?applicationId=${encodeURIComponent(opts.applicationId)}`,
        },
      ],
    },
  ];

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds, components }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn("[staff_accept] discord", res.status, text);
      return { error: text };
    }
    return { ok: true };
  } catch (e) {
    console.warn("[staff_accept]", e);
    return { error: String(e) };
  }
}

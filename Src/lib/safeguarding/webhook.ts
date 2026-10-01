/**
 * Server-only Discord webhook for safeguarding.
 * Never import into client components.
 */

export async function notifySafeguardingWebhook(payload: {
  reference: string;
  submittedLabel: string;
  concernAbout: string;
  platform: string;
  immediateDanger: string;
  summary: string;
  additional?: string;
  submittedAt: string;
}): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.DISCORD_SAFEGUARDING_WEBHOOK_URL;
  if (!url) {
    return { ok: false, error: "Webhook not configured" };
  }

  const aboutMap: Record<string, string> = {
    myself: "Myself",
    another_student: "Another student",
    staff: "Staff member",
    other: "Other",
  };
  const dangerMap: Record<string, string> = {
    yes: "Yes",
    no: "No",
    unsure: "Unsure",
  };

  const body = {
    username: "Ro-School Safeguarding",
    embeds: [
      {
        title: "🛡️ SAFEGUARDING CONCERN",
        color: 0xb91c1c,
        description:
          "**CONFIDENTIAL** — for authorised safeguarding staff only. Do not share outside the private channel.",
        fields: [
          { name: "Reference", value: payload.reference, inline: true },
          {
            name: "Submitted by",
            value: payload.submittedLabel.slice(0, 200),
            inline: true,
          },
          {
            name: "Concern regarding",
            value: aboutMap[payload.concernAbout] || payload.concernAbout,
            inline: true,
          },
          {
            name: "Platform",
            value: payload.platform || "—",
            inline: true,
          },
          {
            name: "Immediate danger",
            value: dangerMap[payload.immediateDanger] || payload.immediateDanger,
            inline: true,
          },
          {
            name: "Summary",
            value: (payload.summary || "—").slice(0, 1000),
          },
          {
            name: "Additional information",
            value: (payload.additional || "—").slice(0, 800),
          },
          { name: "Submitted", value: payload.submittedAt, inline: true },
        ],
        footer: { text: "Ro-School Safeguarding Centre" },
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { ok: false, error: `Webhook HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Webhook failed" };
  }
}

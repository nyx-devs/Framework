/**
 * Application email helpers.
 * Uses console logging in development when no SMTP/provider is configured.
 * Integrate with Resend/SendGrid/Supabase Edge Functions in production.
 */

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(
  payload: EmailPayload
): Promise<{ ok: boolean; error?: string }> {
  // Never block core flows on email failure
  try {
    if (process.env.EMAIL_PROVIDER === "log" || !process.env.RESEND_API_KEY) {
      console.info("[email]", payload.to, payload.subject);
      return { ok: true };
    }

    // Optional Resend integration
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.EMAIL_FROM ||
          "Ro-School <noreply@yourschool.example>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[email] provider error", res.status, t);
      return { ok: false, error: "Email provider error" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] failed", err);
    return { ok: false, error: "Email send failed" };
  }
}

export function schoolEmailShell(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; color: #0f1c2e; line-height: 1.5;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
    <p style="font-weight: 700; font-size: 18px; margin: 0 0 8px;">Ro-School</p>
    <p style="color: #6b7c93; font-size: 13px; margin: 0 0 24px;">Recruitment</p>
    ${bodyHtml}
    <hr style="border: none; border-top: 1px solid #dce3ed; margin: 32px 0 16px;" />
    <p style="font-size: 12px; color: #6b7c93;">
      This message was sent by Ro-School regarding your application.
      Please do not reply to this email with sensitive documents unless instructed.
    </p>
  </div>
</body>
</html>`;
}

export async function sendApplicationSubmittedEmail(params: {
  to: string;
  name: string;
  positionTitle: string;
  referenceCode: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `Application received – ${params.referenceCode}`,
    html: schoolEmailShell(`
      <p>Dear ${params.name},</p>
      <p>Thank you for applying for <strong>${params.positionTitle}</strong>.</p>
      <p>Your reference is <strong>${params.referenceCode}</strong>. We will contact you if we need further information or to invite you to interview.</p>
      <p>You can track your application by signing in to your Ro-School account.</p>
      <p>Yours sincerely,<br/>Ro-School Recruitment</p>
    `),
  });
}

export async function sendStatusChangeEmail(params: {
  to: string;
  name: string;
  positionTitle: string;
  referenceCode: string;
  statusLabel: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `Application update – ${params.referenceCode}`,
    html: schoolEmailShell(`
      <p>Dear ${params.name},</p>
      <p>There has been an update to your application for <strong>${params.positionTitle}</strong> (${params.referenceCode}).</p>
      <p>Current status: <strong>${params.statusLabel}</strong>.</p>
      <p>Please sign in to your Ro-School account for further details.</p>
      <p>Yours sincerely,<br/>Ro-School Recruitment</p>
    `),
  });
}

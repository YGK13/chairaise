// ============================================================
// ChaiRaise — Owner notifications
//
// Fire-and-forget alerts to the product owner. Never awaited on a user's
// critical path and never allowed to throw into it: a failed notification must
// never break a signup or a request.
// ============================================================
import { Resend } from "resend";

const OWNER = process.env.CONTACT_EMAIL || "yuri.kruman@gmail.com";
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const APP_URL = process.env.NEXTAUTH_URL || "https://chairaise.com";

/**
 * Alert the owner that a new user signed up. Call WITHOUT await (fire-and-forget)
 * from account-creation paths. Resolves silently on any failure.
 */
export async function notifyNewSignup({ email, provider = "credentials", name = "" } = {}) {
  try {
    if (!process.env.RESEND_API_KEY || !email) return;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const when = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
    const safe = (s) => String(s || "").replace(/[<>]/g, "");

    await resend.emails.send({
      from: `ChaiRaise <${FROM}>`,
      to: [OWNER],
      subject: `🎉 New ChaiRaise signup: ${safe(name) || safe(email)}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px">
          <h2 style="margin:0 0 12px">New signup on ChaiRaise</h2>
          <table style="font-size:14px;line-height:1.9">
            <tr><td style="color:#71717a;padding-right:14px">Email</td><td><strong>${safe(email)}</strong></td></tr>
            <tr><td style="color:#71717a;padding-right:14px">Name</td><td>${safe(name) || "—"}</td></tr>
            <tr><td style="color:#71717a;padding-right:14px">Method</td><td>${safe(provider)}</td></tr>
            <tr><td style="color:#71717a;padding-right:14px">Time</td><td>${when}</td></tr>
          </table>
          <p style="margin-top:18px">
            <a href="${APP_URL}/admin" style="background:#f59e0b;color:#09090b;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:8px;display:inline-block">Open ops dashboard →</a>
          </p>
        </div>`,
      text: `New ChaiRaise signup\nEmail: ${email}\nName: ${name || "—"}\nMethod: ${provider}\nTime: ${when}\n\nDashboard: ${APP_URL}/admin`,
    });
  } catch (e) {
    console.warn("[notify] signup alert failed:", e.message);
  }
}

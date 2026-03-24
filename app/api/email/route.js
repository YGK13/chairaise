// ============================================================
// ChaiRaise — Email Sending API via Resend
// POST /api/email — Send a real email to a donor
// ============================================================
import { Resend } from "resend";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!process.env.RESEND_API_KEY) {
      return Response.json({
        error: "Email sending not configured. Add RESEND_API_KEY to environment variables.",
        hint: "Sign up at resend.com, verify your domain, then add the API key in Vercel."
      }, { status: 503 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await req.json();
    const {
      to, subject, html, text, from_name, org_id, donor_id,
      reply_to, template_id, campaign_id
    } = body;

    if (!to || !subject || (!html && !text)) {
      return Response.json({ error: "to, subject, and html or text are required" }, { status: 400 });
    }

    // Determine "from" address
    // In production, use the org's verified domain
    // For testing, Resend provides a sandbox: onboarding@resend.dev
    const fromAddress = process.env.EMAIL_FROM || "onboarding@resend.dev";
    const fromDisplay = from_name || "ChaiRaise";

    // Send the email via Resend
    const { data, error } = await resend.emails.send({
      from: `${fromDisplay} <${fromAddress}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || undefined,
      text: text || undefined,
      reply_to: reply_to || session.user.email,
    });

    if (error) {
      console.error("Resend error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Log the outreach in the database if we have org context
    if (org_id && donor_id) {
      try {
        const sql = getDb();
        await sql`
          INSERT INTO outreach_log (org_id, donor_id, channel, template_id, message, outcome, date)
          VALUES (${org_id}, ${parseInt(donor_id)}, 'email', ${template_id || ''}, ${subject}, 'sent', NOW())
        `;
        await sql`
          INSERT INTO activities (org_id, donor_id, type, summary, date)
          VALUES (${org_id}, ${parseInt(donor_id)}, 'email', ${'Email sent: ' + subject}, NOW())
        `;
        await sql`
          INSERT INTO audit_log (org_id, user_name, type, action, detail)
          VALUES (${org_id}, ${session.user.name || session.user.email}, 'email', 'Email sent', ${to + ': ' + subject})
        `;
      } catch (dbErr) {
        // Don't fail the email send if logging fails
        console.warn("Failed to log email to DB:", dbErr.message);
      }
    }

    return Response.json({
      success: true,
      email_id: data.id,
      to,
      subject,
      sent_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("POST /api/email error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

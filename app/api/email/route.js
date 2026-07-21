// ============================================================
// ChaiRaise — Email Sending API via Resend
// POST /api/email — Send a real email to a donor
// ============================================================
import { Resend } from "resend";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimit, keyFromRequest } from "@/lib/rateLimit";
import { denyIfNoOrgAccess } from "@/lib/authz";
import { sendViaOrgSmtp } from "@/lib/mailer";

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    // Rate limit: 20 sent emails per authenticated user per hour. Higher than
    // /api/ai because a real user drafting outreach might legitimately send a
    // handful in a short burst, but low enough that a compromised session
    // cannot spam-blast from the ChaiRaise sender domain.
    const rl = await rateLimit({
      key: keyFromRequest(req, "email", session.user.email),
      max: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) {
      return Response.json(
        { error: "Too many emails sent recently. Please slow down." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const body = await req.json();
    const {
      to, subject, html, text, from_name, org_id, donor_id,
      reply_to, template_id, campaign_id
    } = body;

    if (!to || !subject || (!html && !text)) {
      return Response.json({ error: "to, subject, and html or text are required" }, { status: 400 });
    }

    // Tenant guard: you may only send in the context of an org you belong to.
    if (org_id) {
      const denied = await denyIfNoOrgAccess(session, org_id);
      if (denied) return denied;
    }

    // ---- 1) Prefer the org's OWN mailbox (bring-your-own SMTP) ----
    // Donor outreach then comes from the fundraiser's real address, and the
    // message is relayed through THEIR mail server, not a shared ChaiRaise one.
    let sent = null;
    if (org_id) {
      try {
        sent = await sendViaOrgSmtp(org_id, {
          to,
          subject,
          html,
          text,
          replyTo: reply_to || session.user.email,
          fromName: from_name,
        });
      } catch (smtpErr) {
        return Response.json(
          { error: `Your mail server rejected the message: ${smtpErr.message}`, via: "smtp" },
          { status: 502 }
        );
      }
    }

    // ---- 2) Fall back to the platform sender only if no mailbox is connected ----
    if (!sent) {
      if (!process.env.RESEND_API_KEY) {
        return Response.json({
          error: "No mailbox connected and platform email isn't configured.",
          hint: "Connect your own email under Settings → Email, or add RESEND_API_KEY."
        }, { status: 503 });
      }
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromAddress = process.env.EMAIL_FROM || "onboarding@resend.dev";
      const fromDisplay = from_name || "ChaiRaise";

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
      sent = { id: data.id, via: "platform", from: `${fromDisplay} <${fromAddress}>` };
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
      email_id: sent.id,
      via: sent.via,        // "smtp" = sent from the org's own mailbox
      from: sent.from,
      to,
      subject,
      sent_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("POST /api/email error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

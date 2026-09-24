// ============================================================
// ChaiRaise — Email Sending API via Resend
// POST /api/email — Send a real email to a donor
//
// Abuse guards (this route sends from the ChaiRaise domain when an org has no
// mailbox connected, so it must not be an open relay):
//   - org_id is REQUIRED and the caller must be a member of that org.
//   - Every recipient must be an existing donor contact of that org.
//   - At most MAX_RECIPIENTS per request; per-user hourly and per-org daily caps.
//   - The sender display name is the org's own name (not client-chosen) and
//     Reply-To is the signed-in user's address.
// ============================================================
import { Resend } from "resend";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimit, keyFromRequest } from "@/lib/rateLimit";
import { denyIfNoOrgAccess } from "@/lib/authz";
import { sendViaOrgSmtp } from "@/lib/mailer";
import { logEvent, EVENTS } from "@/lib/track";

const MAX_RECIPIENTS = 10;
const ORG_DAILY_MAX = 200;
const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

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
      to, subject, html, text, org_id, donor_id,
      template_id, campaign_id
    } = body;

    if (!to || !subject || (!html && !text)) {
      return Response.json({ error: "to, subject, and html or text are required" }, { status: 400 });
    }
    if (!org_id) {
      return Response.json({ error: "org_id is required" }, { status: 400 });
    }

    const recipients = [...new Set((Array.isArray(to) ? to : [to]).map((r) => String(r).trim().toLowerCase()))];
    if (recipients.length === 0 || recipients.length > MAX_RECIPIENTS || !recipients.every((r) => EMAIL_RE.test(r))) {
      return Response.json(
        { error: `Provide 1-${MAX_RECIPIENTS} valid recipient email addresses.` },
        { status: 400 }
      );
    }

    // Tenant guard: you may only send in the context of an org you belong to.
    const denied = await denyIfNoOrgAccess(session, org_id);
    if (denied) return denied;

    // Recipients must be this org's own donor contacts (no arbitrary targets).
    const sqlCheck = getDb();
    const known = await sqlCheck`
      SELECT DISTINCT LOWER(email) AS email FROM donors
      WHERE org_id = ${org_id} AND LOWER(email) = ANY(${recipients})
    `;
    const knownSet = new Set(known.map((r) => r.email));
    const unknown = recipients.filter((r) => !knownSet.has(r));
    if (unknown.length > 0) {
      return Response.json(
        { error: "Recipients must be donors in this organization. Add them as donors first.", code: "recipient_not_donor" },
        { status: 403 }
      );
    }

    // Per-org daily cap, on top of the per-user hourly limit above.
    const orgRl = await rateLimit({
      key: `email-org:${org_id}`,
      max: ORG_DAILY_MAX,
      windowMs: 24 * 60 * 60 * 1000,
    });
    if (!orgRl.ok) {
      return Response.json(
        { error: "This organization has reached its daily email limit." },
        { status: 429, headers: { "Retry-After": String(orgRl.retryAfter) } },
      );
    }

    // Sender display name is the org's own name, never client-supplied.
    const orgRows = await sqlCheck`SELECT name FROM orgs WHERE id = ${org_id} LIMIT 1`;
    const from_name = String(orgRows[0]?.name || "ChaiRaise").replace(/[<>"\r\n]/g, "").slice(0, 80);

    // ---- 1) Prefer the org's OWN mailbox (bring-your-own SMTP) ----
    // Donor outreach then comes from the fundraiser's real address, and the
    // message is relayed through THEIR mail server, not a shared ChaiRaise one.
    let sent = null;
    if (org_id) {
      try {
        sent = await sendViaOrgSmtp(org_id, {
          to: recipients,
          subject,
          html,
          text,
          replyTo: session.user.email,
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
        to: recipients,
        subject,
        html: html || undefined,
        text: text || undefined,
        // Resend SDK option is camelCase `replyTo`; `reply_to` was silently
        // dropped, so donor replies went to the platform sender.
        replyTo: session.user.email,
      });

      if (error) {
        console.error("Resend error:", error);
        return Response.json({ error: error.message }, { status: 500 });
      }
      sent = { id: data.id, via: "platform", from: `${fromDisplay} <${fromAddress}>` };
    }

    // Log the outreach in the database if we have org context
    if (donor_id) {
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
          VALUES (${org_id}, ${session.user.name || session.user.email}, 'email', 'Email sent', ${recipients.join(', ') + ': ' + subject})
        `;
      } catch (dbErr) {
        // Don't fail the email send if logging fails
        console.warn("Failed to log email to DB:", dbErr.message);
      }
    }

    // Usage signal — real donor outreach sent (deepest activation step).
    logEvent({ email: session.user.email, orgId: org_id, event: EVENTS.EMAIL_SENT, meta: { via: sent.via } });

    return Response.json({
      success: true,
      email_id: sent.id,
      via: sent.via,        // "smtp" = sent from the org's own mailbox
      from: sent.from,
      to: recipients,
      subject,
      sent_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("POST /api/email error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================
// ChaiRaise — Per-org email identity (bring-your-own mailbox)
// GET    /api/org/email?org_id=X  — read settings (NEVER returns the password)
// PUT    /api/org/email           — save settings (password encrypted at rest)
// POST   /api/org/email           — { action: "test" } verify + send a test to yourself
// DELETE /api/org/email?org_id=X  — disconnect (destroys stored credentials)
//
// Every method is gated by org membership (lib/authz) so one org can never read
// or alter another org's mail credentials.
// ============================================================
import { auth } from "@/lib/auth";
import { denyIfNoOrgAccess } from "@/lib/authz";
import {
  getOrgEmailSettings,
  saveOrgEmailSettings,
  deleteOrgEmailSettings,
  markOrgEmailVerified,
} from "@/lib/db";
import { verifyOrgSmtp, sendViaOrgSmtp } from "@/lib/mailer";

// Shape settings for the client — deliberately omits the secret.
function publicView(s) {
  if (!s) return { connected: false };
  return {
    connected: !!(s.smtp_host && s.smtp_user && s.from_email),
    from_name: s.from_name || "",
    from_email: s.from_email || "",
    smtp_host: s.smtp_host || "",
    smtp_port: s.smtp_port || 587,
    smtp_secure: !!s.smtp_secure,
    smtp_user: s.smtp_user || "",
    has_password: !!s.smtp_pass_encrypted,
    verified_at: s.verified_at || null,
  };
}

export async function GET(req) {
  try {
    const session = await auth();
    const orgId = new URL(req.url).searchParams.get("org_id");
    if (!orgId) return Response.json({ error: "org_id is required" }, { status: 400 });
    const denied = await denyIfNoOrgAccess(session, orgId);
    if (denied) return denied;

    return Response.json({ settings: publicView(await getOrgEmailSettings(orgId)) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await auth();
    const body = await req.json().catch(() => ({}));
    const { org_id } = body;
    if (!org_id) return Response.json({ error: "org_id is required" }, { status: 400 });
    const denied = await denyIfNoOrgAccess(session, org_id);
    if (denied) return denied;

    if (!body.from_email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.from_email)) {
      return Response.json({ error: "A valid From address is required." }, { status: 400 });
    }
    if (!body.smtp_host || !body.smtp_user) {
      return Response.json({ error: "SMTP host and username are required." }, { status: 400 });
    }

    await saveOrgEmailSettings(org_id, {
      from_name: body.from_name,
      from_email: body.from_email,
      smtp_host: body.smtp_host,
      smtp_port: body.smtp_port,
      smtp_secure: body.smtp_secure,
      smtp_user: body.smtp_user,
      smtp_pass: body.smtp_pass, // blank keeps the existing stored secret
    });
    return Response.json({ settings: publicView(await getOrgEmailSettings(org_id)) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    const body = await req.json().catch(() => ({}));
    const { org_id, action } = body;
    if (!org_id) return Response.json({ error: "org_id is required" }, { status: 400 });
    const denied = await denyIfNoOrgAccess(session, org_id);
    if (denied) return denied;

    if (action !== "test") {
      return Response.json({ error: "Unknown action" }, { status: 400 });
    }

    // 1) Prove the credentials actually work.
    const check = await verifyOrgSmtp(org_id);
    if (!check.ok) return Response.json({ ok: false, error: check.error }, { status: 400 });

    // 2) Send the test to the signed-in user only — never an arbitrary address.
    const to = session?.user?.email;
    if (!to) return Response.json({ ok: false, error: "No signed-in address to test with." }, { status: 400 });

    const sent = await sendViaOrgSmtp(org_id, {
      to,
      subject: "ChaiRaise — your mailbox is connected",
      html: `<p>Success. ChaiRaise can now send donor outreach from your own address.</p>
             <p style="color:#71717a;font-size:12px">Sent via your mail server. ChaiRaise relays the message and does not retain a copy of your credentials in plaintext.</p>`,
      text: "Success. ChaiRaise can now send donor outreach from your own address.",
    });

    await markOrgEmailVerified(org_id);
    return Response.json({ ok: true, sent_to: to, from: sent?.from });
  } catch (e) {
    // Surface the real SMTP error — it's what the user needs to fix the setup.
    return Response.json({ ok: false, error: e.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  try {
    const session = await auth();
    const orgId = new URL(req.url).searchParams.get("org_id");
    if (!orgId) return Response.json({ error: "org_id is required" }, { status: 400 });
    const denied = await denyIfNoOrgAccess(session, orgId);
    if (denied) return denied;

    await deleteOrgEmailSettings(orgId);
    return Response.json({ disconnected: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

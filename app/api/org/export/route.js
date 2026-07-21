// ============================================================
// ChaiRaise — Full organization data export (portability / GDPR Art. 20)
// GET /api/org/export?org_id=X
//
// Returns EVERY row we hold for an organization as one JSON document the org
// owns and can take elsewhere. Deliberately excludes secrets (SMTP password) —
// an export is a data-portability artifact, not a credential dump.
// Gated by org membership.
// ============================================================
import { auth } from "@/lib/auth";
import { denyIfNoOrgAccess } from "@/lib/authz";
import { getDb } from "@/lib/db";

export async function GET(req) {
  try {
    const session = await auth();
    const orgId = new URL(req.url).searchParams.get("org_id");
    if (!orgId) return Response.json({ error: "org_id is required" }, { status: 400 });

    const denied = await denyIfNoOrgAccess(session, orgId);
    if (denied) return denied;

    const sql = getDb();

    // Pull every org-scoped table. Kept explicit (not SELECT * over a table
    // list) so a future table with secrets can't leak into an export by default.
    const [
      org, profile, users, donors, donations, activities,
      deals, reminders, outreach, campaigns, auditLog, emailIdentity,
    ] = await Promise.all([
      sql`SELECT * FROM orgs WHERE id = ${orgId}`,
      sql`SELECT * FROM org_profiles WHERE org_id = ${orgId}`,
      sql`SELECT id, org_id, name, email, role, auth_provider, created_at, last_login FROM users WHERE org_id = ${orgId}`,
      sql`SELECT * FROM donors WHERE org_id = ${orgId} ORDER BY id`,
      sql`SELECT * FROM donations WHERE org_id = ${orgId} ORDER BY date DESC`,
      sql`SELECT * FROM activities WHERE org_id = ${orgId} ORDER BY date DESC`,
      sql`SELECT * FROM deals WHERE org_id = ${orgId} ORDER BY id`,
      sql`SELECT * FROM reminders WHERE org_id = ${orgId} ORDER BY date`,
      sql`SELECT * FROM outreach_log WHERE org_id = ${orgId} ORDER BY date DESC`,
      sql`SELECT * FROM campaigns WHERE org_id = ${orgId}`,
      sql`SELECT * FROM audit_log WHERE org_id = ${orgId} ORDER BY created_at DESC`,
      // NOTE: smtp_pass_encrypted is intentionally NOT selected.
      sql`SELECT org_id, from_name, from_email, smtp_host, smtp_port, smtp_secure, smtp_user, verified_at FROM org_email_settings WHERE org_id = ${orgId}`,
    ]);

    const payload = {
      export_format: "chairaise.org-export.v1",
      exported_at: new Date().toISOString(),
      exported_by: session?.user?.email || null,
      org_id: orgId,
      note: "Complete data export for this organization. Credentials are never included.",
      counts: {
        donors: donors.length,
        donations: donations.length,
        activities: activities.length,
        deals: deals.length,
        reminders: reminders.length,
        outreach_log: outreach.length,
        campaigns: campaigns.length,
        audit_log: auditLog.length,
        users: users.length,
      },
      data: {
        org: org[0] || null,
        org_profile: profile[0] || null,
        email_identity: emailIdentity[0] || null,
        users,
        donors,
        donations,
        activities,
        deals,
        reminders,
        outreach_log: outreach,
        campaigns,
        audit_log: auditLog,
      },
    };

    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="chairaise-export-${orgId}-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("GET /api/org/export error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// ============================================================
// ChaiRaise — Permanent organization erasure (GDPR Art. 17 / CCPA deletion)
// POST /api/org/delete  { org_id, confirm }
//
// Destroys every row we hold for an organization. Irreversible by design — no
// soft-delete flag, no tombstone, nothing recoverable. `confirm` must exactly
// equal the org_id so this can never fire from a stray click or CSRF.
// Gated by org membership.
//
// Per-donor erasure is handled separately by DELETE /api/donors/[id].
// ============================================================
import { auth } from "@/lib/auth";
import { denyIfNoOrgAccess } from "@/lib/authz";
import { getDb } from "@/lib/db";

export async function POST(req) {
  try {
    const session = await auth();
    const { org_id, confirm } = await req.json().catch(() => ({}));

    if (!org_id) return Response.json({ error: "org_id is required" }, { status: 400 });

    const denied = await denyIfNoOrgAccess(session, org_id);
    if (denied) return denied;

    // Typed confirmation — the caller must echo the exact org id.
    if (confirm !== org_id) {
      return Response.json(
        { error: "Confirmation failed. Type the organization id exactly to confirm permanent deletion." },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Delete children before parents. Several tables cascade from orgs, but we
    // remove each explicitly so nothing survives on a table that lacks the FK
    // (e.g. org_email_settings) and so the counts below are truthful.
    const deleted = {};
    const wipe = async (label, run) => {
      const rows = await run();
      deleted[label] = rows.length;
    };

    await wipe("donations", () => sql`DELETE FROM donations WHERE org_id = ${org_id} RETURNING id`);
    await wipe("activities", () => sql`DELETE FROM activities WHERE org_id = ${org_id} RETURNING id`);
    await wipe("reminders", () => sql`DELETE FROM reminders WHERE org_id = ${org_id} RETURNING id`);
    await wipe("outreach_log", () => sql`DELETE FROM outreach_log WHERE org_id = ${org_id} RETURNING id`);
    await wipe("deals", () => sql`DELETE FROM deals WHERE org_id = ${org_id} RETURNING id`);
    await wipe("campaigns", () => sql`DELETE FROM campaigns WHERE org_id = ${org_id} RETURNING id`);
    await wipe("audit_log", () => sql`DELETE FROM audit_log WHERE org_id = ${org_id} RETURNING id`);
    await wipe("donors", () => sql`DELETE FROM donors WHERE org_id = ${org_id} RETURNING id`);
    await wipe("org_profiles", () => sql`DELETE FROM org_profiles WHERE org_id = ${org_id} RETURNING org_id`);
    await wipe("email_settings", () => sql`DELETE FROM org_email_settings WHERE org_id = ${org_id} RETURNING org_id`);
    await wipe("users", () => sql`DELETE FROM users WHERE org_id = ${org_id} RETURNING id`);
    await wipe("org", () => sql`DELETE FROM orgs WHERE id = ${org_id} RETURNING id`);

    // Deliberately logged to stdout only — the audit table for this org is gone.
    console.log(`[Erasure] org ${org_id} permanently deleted by ${session?.user?.email}:`, deleted);

    return Response.json({
      deleted: true,
      org_id,
      rows_removed: deleted,
      erased_at: new Date().toISOString(),
      note: "This organization's data has been permanently erased and cannot be recovered.",
    });
  } catch (e) {
    console.error("POST /api/org/delete error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

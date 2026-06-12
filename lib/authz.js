// ============================================================
// ChaiRaise — Authorization helpers (multi-tenant access control)
//
// The data APIs are org-scoped by an `org_id` the client supplies. Without a
// check, any caller could read/write another org's donors by guessing its id.
// canAccessOrg() closes that hole while staying backward-compatible:
//
//   - Owner emails always pass.
//   - If the org has registered members (a `users` row exists), the caller
//     MUST be one of them.
//   - If the org has NO members (the pre-onboarding default/demo org, or a
//     legacy localStorage org never registered via /api/orgs), access is
//     allowed — there is no tenant to protect yet.
// ============================================================
import { getDb } from "@/lib/db";
import { isOwnerEmail } from "@/lib/plan";

/**
 * Is the authenticated user (by email) allowed to access this org's data?
 * @param {string|undefined} email  Authenticated user email (or undefined).
 * @param {string} orgId            Target org id from the request.
 * @returns {Promise<boolean>}
 */
export async function canAccessOrg(email, orgId) {
  if (!orgId) return false;
  if (email && isOwnerEmail(email)) return true;

  const sql = getDb();
  const members = await sql`SELECT email FROM users WHERE org_id = ${orgId}`;
  if (members.length === 0) return true; // unclaimed/default org — nothing to protect

  if (!email) return false;
  const lower = String(email).toLowerCase();
  return members.some((m) => String(m.email).toLowerCase() === lower);
}

/**
 * Guard helper for route handlers. Returns null when access is allowed, or a
 * ready-to-return 403 Response when it is not. DB errors are surfaced to the
 * caller (treated as deny) rather than silently allowing access.
 */
export async function denyIfNoOrgAccess(session, orgId) {
  const allowed = await canAccessOrg(session?.user?.email, orgId);
  if (allowed) return null;
  return Response.json(
    { error: "You don't have access to this organization's data.", code: "org_forbidden" },
    { status: 403 }
  );
}

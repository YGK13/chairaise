// ============================================================
// ChaiRaise — Authorization helpers (multi-tenant access control)
//
// The data APIs are org-scoped by an `org_id` the client supplies. Without a
// check, any caller could read/write another org's donors by guessing its id.
// canAccessOrg() closes that hole:
//
//   - Owner emails always pass.
//   - Every org MUST have at least one registered member (a `users` row) to
//     be accessible at all. A zero-user org_id is a HARD DENY — it is either
//     a typo/guess or an org that was never properly registered via
//     /api/orgs, and letting it through would mean anyone who guesses an
//     org_id (or an org that hasn't onboarded yet) gets a free pass to that
//     tenant's data. There is no such thing as a "safe to leave open" org.
//   - If the org HAS members, the caller must be one of them (by email).
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

  // Zero-user org: hard-fail. Do NOT allow through — a guessable org_id with
  // no registered members must never be treated as "nothing to protect".
  if (members.length === 0) return false;

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

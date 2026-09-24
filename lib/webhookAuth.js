// ============================================================
// ChaiRaise — per-org webhook tokens (Zapier / Make / direct)
//
// A single global WEBHOOK_SECRET used to authenticate every org while the
// target org_id came from the request body, so any customer holding the
// secret could write donors into ANY org. Each org now gets its own token:
//
//   token(org) = HMAC-SHA256(WEBHOOK_SECRET, "chairaise-webhook:v1:" + org_id)
//
// The token binds the org id, so it is only valid for that org. No schema
// change is needed; rotating WEBHOOK_SECRET rotates every org's token.
// ============================================================
import { createHmac, timingSafeEqual } from "crypto";

export function orgWebhookToken(orgId, secret = process.env.WEBHOOK_SECRET) {
  if (!secret || !orgId) return null;
  return createHmac("sha256", secret).update(`chairaise-webhook:v1:${orgId}`).digest("hex");
}

/** Constant-time check that `presented` is the webhook token for `orgId`. */
export function verifyOrgWebhookToken(orgId, presented, secret = process.env.WEBHOOK_SECRET) {
  const expected = orgWebhookToken(orgId, secret);
  if (!expected || !presented) return false;
  const a = Buffer.from(String(presented));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Token from `x-webhook-secret` or `Authorization: Bearer <token>`. */
export function tokenFromHeaders(headers) {
  const raw = headers.get("x-webhook-secret") || headers.get("authorization") || "";
  return raw.replace(/^Bearer\s+/i, "").trim();
}

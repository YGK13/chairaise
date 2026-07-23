// ============================================================
// ChaiRaise — Product event tracking (the usage telemetry spine)
//
// One append-only `events` table + one logEvent() helper. Every meaningful
// thing a user does can be recorded in a single fire-and-forget line from any
// route, and the owner /admin console reads it back as active-user counts, an
// activation funnel and a live activity stream.
//
// Design rules:
//   - NEVER throw into a request path. All failures are swallowed + logged.
//   - NEVER await in the hot path — call logEvent(...) without await so a slow
//     insert can't add latency to a signup, login or save.
//   - Self-contained: connects to Neon directly rather than importing from
//     lib/db.js, so there is no import cycle (db.js logs signup/login events).
//   - Store only what the owner needs to run the business: the actor's email,
//     their org, the event name, the auth provider and small structured meta.
//     No donor PII, no message bodies — those live in org-scoped tables behind
//     the tenant access wall, not in this cross-tenant stream.
// ============================================================
import { neon } from "@neondatabase/serverless";

// Canonical event names. Import EVENTS.X rather than hand-typing strings so the
// dashboard groupings and the emit sites can never drift apart.
export const EVENTS = {
  SIGNUP: "signup",
  LOGIN: "login",
  ORG_CREATED: "org_created",
  DONOR_ADDED: "donor_added",
  DONATION_ADDED: "donation_added",
  EMAIL_SENT: "email_sent",
  WHATSAPP_CLICK: "whatsapp_click",
  AI_USED: "ai_used",
  DATA_EXPORT: "data_export",
  ACCOUNT_DELETED: "account_deleted",
  CHECKOUT_STARTED: "checkout_started",
  SUBSCRIBED: "subscribed",
};

/**
 * Record a single product event. Fire-and-forget: returns a promise you should
 * NOT await in a request handler.
 *
 * @param {object}  e
 * @param {string=} e.email     Actor email (lower-cased on write). Null for anon.
 * @param {string=} e.orgId     Org the event belongs to, if any.
 * @param {string}  e.event     One of EVENTS.* (required).
 * @param {string=} e.provider  Auth provider ('credentials' | 'google' | …).
 * @param {object=} e.meta      Small JSON blob of extra context (no PII).
 */
export async function logEvent({ email = null, orgId = null, event, provider = null, meta = null }) {
  try {
    if (!event || !process.env.DATABASE_URL) return;
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      INSERT INTO events (email, org_id, event, provider, meta)
      VALUES (
        ${email ? String(email).toLowerCase() : null},
        ${orgId || null},
        ${event},
        ${provider || null},
        ${meta ? JSON.stringify(meta) : null}
      )
    `;
  } catch (err) {
    // A telemetry write must never break the user's action. Log and move on.
    console.warn("[track] logEvent failed:", err?.message || err);
  }
}

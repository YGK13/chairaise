// ============================================================
// ChaiRaise — Plans & Entitlements (single source of truth)
//
// Isomorphic by design:
//   - Server (API routes) calls resolvePlan(email, stripeStatus) to decide a
//     plan AUTHORITATIVELY, then enforces limits/features.
//   - Client (UI) receives the resolved plan id from /api/billing and calls
//     can()/limitFor()/planMeta() to decide what to show. The client NEVER
//     decides the plan itself — it only renders what the server already granted.
//
// The plan ladder mirrors exactly what the landing page advertises, so what we
// sell is what we enforce. Owner accounts (Yuri + Ohr Vishua) always get an
// unlimited, free "owner" plan via an allowlist that is checked server-side only.
// ============================================================

// ---- Feature keys (stable identifiers shared across API + UI) ----
export const FEATURES = {
  AI_EMAIL: "ai_email", // AI email generation — FREE
  PIPELINE: "pipeline", // Pipeline & Kanban board — FREE
  CSV: "csv", // CSV import / export — FREE
  AI_ORG_INTEL: "ai_org_intel", // AI Org Intelligence (deep research) — PRO
  CAUSE_MATCH: "cause_match", // Cause-match scoring — PRO
  SOCIAL_GRAPH: "social_graph", // Social / network graph mapping — PRO
  INTEGRATIONS: "integrations", // Platform integrations — PRO
  BATCH_CAMPAIGNS: "batch_campaigns", // Batch / bulk campaigns — PRO
};

// Features available on the free Starter tier. Everything else is Pro+.
const FREE_FEATURES = [FEATURES.AI_EMAIL, FEATURES.PIPELINE, FEATURES.CSV];

// The full Pro feature set (Starter features plus the Pro unlocks).
const PRO_FEATURES = [
  ...FREE_FEATURES,
  FEATURES.AI_ORG_INTEL,
  FEATURES.CAUSE_MATCH,
  FEATURES.SOCIAL_GRAPH,
  FEATURES.INTEGRATIONS,
  FEATURES.BATCH_CAMPAIGNS,
];

// ---- Plan ladder. `null` limit = unlimited (JSON-safe; we avoid Infinity). ----
export const PLANS = {
  starter: {
    id: "starter",
    label: "Starter",
    price: 0,
    blurb: "For small organizations getting started",
    limits: { donors: 100, seats: 1 },
    features: FREE_FEATURES,
  },
  pro: {
    id: "pro",
    label: "Professional",
    price: 149, // USD / month, billed annually
    blurb: "For growing organizations",
    limits: { donors: null, seats: 5 },
    features: PRO_FEATURES,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    price: null, // custom
    blurb: "For federations & large institutions",
    limits: { donors: null, seats: null },
    features: PRO_FEATURES,
  },
  // Internal owner plan — full product, no charge. Granted only via the
  // server-side allowlist below; never selectable by users.
  owner: {
    id: "owner",
    label: "Owner",
    price: 0,
    blurb: "ChaiRaise owner account — full access",
    limits: { donors: null, seats: null },
    features: PRO_FEATURES,
  },
};

// ============================================================
// OWNER ALLOWLIST — resolved server-side only
// Seeded with Yuri's Gmail; extendable without a code change via the
// OWNER_EMAILS env var (comma-separated) and any @ohrvishua.* address.
// ============================================================
const DEFAULT_OWNER_EMAILS = ["yuri.kruman@gmail.com"];
const OWNER_DOMAIN_PATTERNS = [/@ohrvishua\./i, /@orvishua\./i];

function ownerEmailSet() {
  const fromEnv = (typeof process !== "undefined" && process.env && process.env.OWNER_EMAILS) || "";
  const extra = fromEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_OWNER_EMAILS, ...extra]);
}

/**
 * True if the given email is an owner account (exact allowlist match or an
 * Ohr Vishua domain). Case-insensitive. Server-authoritative.
 */
export function isOwnerEmail(email) {
  if (!email) return false;
  const e = String(email).trim().toLowerCase();
  if (!e) return false;
  if (ownerEmailSet().has(e)) return true;
  return OWNER_DOMAIN_PATTERNS.some((re) => re.test(e));
}

// ============================================================
// PLAN RESOLUTION (authoritative — call this on the server)
// ============================================================
/**
 * Resolve the effective plan id for a user.
 * @param {string} email        Authenticated user email.
 * @param {string} stripeStatus Stripe subscription status ("active" | "trialing" | ...).
 * @param {string} [stripePlan] Plan recorded on the subscription metadata.
 * @returns {"owner"|"enterprise"|"pro"|"starter"}
 */
export function resolvePlan(email, stripeStatus, stripePlan) {
  if (isOwnerEmail(email)) return "owner";
  const paid = stripeStatus === "active" || stripeStatus === "trialing";
  if (paid) {
    if (stripePlan === "enterprise") return "enterprise";
    return "pro";
  }
  return "starter";
}

// ============================================================
// ENTITLEMENT HELPERS (safe on client + server)
// ============================================================
export function planMeta(planId) {
  return PLANS[planId] || PLANS.starter;
}

/** Does this plan include the given feature key? */
export function can(planId, feature) {
  return planMeta(planId).features.includes(feature);
}

/** Limit for a key ("donors" | "seats"). null === unlimited. */
export function limitFor(planId, key) {
  const lim = planMeta(planId).limits[key];
  return lim === undefined ? null : lim;
}

/**
 * Is `count` within (or equal to) the plan's limit for `key`?
 * Unlimited (null) always passes. Use `count` = the count AFTER the action
 * (e.g. donors + 1) when guarding a create.
 */
export function withinLimit(planId, key, count) {
  const lim = limitFor(planId, key);
  if (lim === null) return true;
  return count <= lim;
}

/** True when the plan grants the full product (owner/enterprise). */
export function isUnlimited(planId) {
  return limitFor(planId, "donors") === null;
}

// ============================================================
// SHARED-STRIPE-ACCOUNT GUARD
// The Stripe account is shared across every product (DueDrill, Career Beast
// Mode, etc.), so the webhook endpoint receives ALL of their events. A
// subscription belongs to ChaiRaise ONLY if it carries our price id or the
// metadata we stamp at checkout — anything else must be ignored so another
// product's customer can never be recorded as a ChaiRaise subscriber.
// ============================================================
export function isChaiRaiseSubscription(subscription, priceId) {
  if (!subscription || typeof subscription !== "object") return false;
  const items = subscription.items?.data || [];
  if (priceId && items.some((i) => i?.price?.id === priceId)) return true;
  const meta = subscription.metadata || {};
  return !!(meta.chairaise_org_id || meta.chairaise_plan);
}

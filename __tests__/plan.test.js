// ============================================================
// ChaiRaise — Plans & Entitlements Tests
// Locks the security-critical gating + owner-override logic.
// ============================================================
import { describe, it, expect } from "vitest";
import {
  FEATURES,
  PLANS,
  isOwnerEmail,
  resolvePlan,
  can,
  limitFor,
  withinLimit,
  isUnlimited,
  isChaiRaiseSubscription,
} from "@/lib/plan";

const CHAI_PRICE = "price_1Tko3oK4OdZVtHRP3rG87EU7";
const sub = (over = {}) => ({ id: "sub_x", items: { data: [] }, metadata: {}, ...over });

describe("isOwnerEmail", () => {
  it("matches the seeded owner email, case-insensitively", () => {
    expect(isOwnerEmail("yuri.kruman@gmail.com")).toBe(true);
    expect(isOwnerEmail("Yuri.Kruman@Gmail.com")).toBe(true);
    expect(isOwnerEmail("  yuri.kruman@gmail.com  ")).toBe(true);
  });

  it("matches Ohr Vishua domains", () => {
    expect(isOwnerEmail("anyone@ohrvishua.org")).toBe(true);
    expect(isOwnerEmail("dev@ohrvishua.com")).toBe(true);
    expect(isOwnerEmail("x@orvishua.org")).toBe(true);
  });

  it("rejects everyone else and bad input", () => {
    expect(isOwnerEmail("stranger@example.com")).toBe(false);
    expect(isOwnerEmail("")).toBe(false);
    expect(isOwnerEmail(null)).toBe(false);
    expect(isOwnerEmail(undefined)).toBe(false);
    // not fooled by substring tricks
    expect(isOwnerEmail("yuri.kruman@gmail.com.evil.com")).toBe(false);
  });
});

describe("resolvePlan", () => {
  it("grants owner plan to allowlisted emails regardless of Stripe", () => {
    expect(resolvePlan("yuri.kruman@gmail.com", undefined)).toBe("owner");
    expect(resolvePlan("dev@ohrvishua.org", "canceled")).toBe("owner");
  });

  it("grants pro for active/trialing subscriptions", () => {
    expect(resolvePlan("a@b.com", "active")).toBe("pro");
    expect(resolvePlan("a@b.com", "trialing")).toBe("pro");
  });

  it("honors enterprise plan metadata", () => {
    expect(resolvePlan("a@b.com", "active", "enterprise")).toBe("enterprise");
  });

  it("defaults to starter for everyone else", () => {
    expect(resolvePlan("a@b.com", undefined)).toBe("starter");
    expect(resolvePlan("a@b.com", "canceled")).toBe("starter");
    expect(resolvePlan("a@b.com", "past_due")).toBe("starter");
  });
});

describe("feature gating", () => {
  it("free tier gets free features only", () => {
    expect(can("starter", FEATURES.AI_EMAIL)).toBe(true);
    expect(can("starter", FEATURES.PIPELINE)).toBe(true);
    expect(can("starter", FEATURES.CSV)).toBe(true);
    expect(can("starter", FEATURES.AI_ORG_INTEL)).toBe(false);
    expect(can("starter", FEATURES.CAUSE_MATCH)).toBe(false);
    expect(can("starter", FEATURES.SOCIAL_GRAPH)).toBe(false);
    expect(can("starter", FEATURES.INTEGRATIONS)).toBe(false);
    expect(can("starter", FEATURES.BATCH_CAMPAIGNS)).toBe(false);
  });

  it("pro + owner unlock every feature", () => {
    for (const f of Object.values(FEATURES)) {
      expect(can("pro", f)).toBe(true);
      expect(can("owner", f)).toBe(true);
      expect(can("enterprise", f)).toBe(true);
    }
  });
});

describe("limits", () => {
  it("starter is capped at 100 donors / 1 seat", () => {
    expect(limitFor("starter", "donors")).toBe(100);
    expect(limitFor("starter", "seats")).toBe(1);
    expect(withinLimit("starter", "donors", 100)).toBe(true);
    expect(withinLimit("starter", "donors", 101)).toBe(false);
    expect(withinLimit("starter", "seats", 2)).toBe(false);
  });

  it("pro is unlimited donors, 5 seats", () => {
    expect(limitFor("pro", "donors")).toBe(null);
    expect(withinLimit("pro", "donors", 1_000_000)).toBe(true);
    expect(withinLimit("pro", "seats", 5)).toBe(true);
    expect(withinLimit("pro", "seats", 6)).toBe(false);
  });

  it("owner + enterprise are fully unlimited", () => {
    expect(isUnlimited("owner")).toBe(true);
    expect(isUnlimited("enterprise")).toBe(true);
    expect(withinLimit("owner", "donors", 9_999_999)).toBe(true);
    expect(withinLimit("owner", "seats", 9_999_999)).toBe(true);
  });

  it("limits never serialize Infinity (JSON-safe)", () => {
    for (const p of Object.values(PLANS)) {
      for (const v of Object.values(p.limits)) {
        expect(v === null || Number.isFinite(v)).toBe(true);
      }
    }
  });
});

describe("isChaiRaiseSubscription (shared Stripe account guard)", () => {
  it("accepts a subscription on the ChaiRaise price", () => {
    const s = sub({ items: { data: [{ price: { id: CHAI_PRICE } }] } });
    expect(isChaiRaiseSubscription(s, CHAI_PRICE)).toBe(true);
  });

  it("accepts a subscription carrying ChaiRaise metadata (even without price match)", () => {
    expect(isChaiRaiseSubscription(sub({ metadata: { chairaise_org_id: "ohr" } }), CHAI_PRICE)).toBe(true);
    expect(isChaiRaiseSubscription(sub({ metadata: { chairaise_plan: "pro" } }), CHAI_PRICE)).toBe(true);
  });

  it("REJECTS another product's subscription (DueDrill / CBM / etc.)", () => {
    const dueDrill = sub({ id: "sub_dd", items: { data: [{ price: { id: "price_SomeDueDrillPrice" } }] }, metadata: { duedrill: "annual" } });
    expect(isChaiRaiseSubscription(dueDrill, CHAI_PRICE)).toBe(false);
  });

  it("rejects empty / malformed input", () => {
    expect(isChaiRaiseSubscription(null, CHAI_PRICE)).toBe(false);
    expect(isChaiRaiseSubscription(undefined, CHAI_PRICE)).toBe(false);
    expect(isChaiRaiseSubscription(sub(), CHAI_PRICE)).toBe(false);
    expect(isChaiRaiseSubscription("nope", CHAI_PRICE)).toBe(false);
  });

  it("falls back to metadata when no priceId is provided at runtime", () => {
    expect(isChaiRaiseSubscription(sub({ metadata: { chairaise_plan: "pro" } }), undefined)).toBe(true);
    expect(isChaiRaiseSubscription(sub({ items: { data: [{ price: { id: CHAI_PRICE } }] } }), undefined)).toBe(false);
  });
});

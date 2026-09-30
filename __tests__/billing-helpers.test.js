// ============================================================
// ChaiRaise — server-side plan mapping + current Stripe API shape helpers,
// AI guards and per-org webhook tokens.
// ============================================================
import { describe, it, expect } from "vitest";
import { planForPriceId, planForSubscription, subscriptionPeriodEnd, invoiceSubscriptionId } from "@/lib/plan";
import { resolveAnthropicModel, clampMaxTokens, MAX_OUTPUT_TOKENS } from "@/lib/aiGuards";
import { orgWebhookToken, verifyOrgWebhookToken } from "@/lib/webhookAuth";

const env = { STRIPE_PRO_PRICE_ID: "price_pro", STRIPE_ENTERPRISE_PRICE_ID: "price_ent" };

describe("planForPriceId / planForSubscription", () => {
  it("maps configured price ids to plans", () => {
    expect(planForPriceId("price_pro", env)).toBe("pro");
    expect(planForPriceId("price_ent", env)).toBe("enterprise");
    expect(planForPriceId("price_other", env)).toBeNull();
    expect(planForPriceId(undefined, env)).toBeNull();
  });

  it("ignores subscription metadata claiming a higher plan", () => {
    const sub = { metadata: { chairaise_plan: "enterprise" }, items: { data: [{ price: { id: "price_pro" } }] } };
    expect(planForSubscription(sub, env)).toBe("pro");
  });

  it("returns enterprise only when the enterprise price is billed", () => {
    expect(planForSubscription({ items: { data: [{ price: { id: "price_ent" } }] } }, env)).toBe("enterprise");
    expect(planForSubscription({ metadata: { chairaise_plan: "enterprise" } }, {})).toBe("pro");
  });
});

describe("Stripe API shape (dahlia)", () => {
  it("reads current_period_end from subscription items", () => {
    expect(subscriptionPeriodEnd({ items: { data: [{ current_period_end: 1700000000 }, { current_period_end: 1800000000 }] } })).toBe(1800000000);
  });
  it("falls back to the legacy top-level field", () => {
    expect(subscriptionPeriodEnd({ current_period_end: 1600000000, items: { data: [] } })).toBe(1600000000);
    expect(subscriptionPeriodEnd({ items: { data: [] } })).toBeNull();
  });
  it("reads the invoice's subscription from invoice.parent.subscription_details", () => {
    expect(invoiceSubscriptionId({ parent: { type: "subscription_details", subscription_details: { subscription: "sub_1" } } })).toBe("sub_1");
    expect(invoiceSubscriptionId({ parent: { subscription_details: { subscription: { id: "sub_2" } } } })).toBe("sub_2");
    expect(invoiceSubscriptionId({ subscription: "sub_legacy" })).toBe("sub_legacy");
    expect(invoiceSubscriptionId({ parent: null })).toBeNull();
  });
});

describe("AI guards", () => {
  it("only allows allowlisted models, defaulting to claude-sonnet-5", () => {
    expect(resolveAnthropicModel(undefined)).toBe("claude-sonnet-5");
    expect(resolveAnthropicModel("claude-sonnet-4-6")).toBe("claude-sonnet-5");
    expect(resolveAnthropicModel("claude-opus-5-5")).toBe("claude-opus-5-5");
    expect(resolveAnthropicModel("claude-haiku-4-5-20251001")).toBe("claude-haiku-4-5-20251001");
  });
  it("clamps max_tokens", () => {
    expect(clampMaxTokens(100000)).toBe(MAX_OUTPUT_TOKENS);
    expect(clampMaxTokens(undefined)).toBe(1024);
    expect(clampMaxTokens(-5)).toBe(1024);
    expect(clampMaxTokens("512")).toBe(512);
  });
});

describe("per-org webhook tokens", () => {
  it("binds the token to the org id", () => {
    const t = orgWebhookToken("org_a", "s3cret");
    expect(verifyOrgWebhookToken("org_a", t, "s3cret")).toBe(true);
    expect(verifyOrgWebhookToken("org_b", t, "s3cret")).toBe(false);
  });
  it("rejects the raw global secret and missing values", () => {
    expect(verifyOrgWebhookToken("org_a", "s3cret", "s3cret")).toBe(false);
    expect(verifyOrgWebhookToken("org_a", "", "s3cret")).toBe(false);
    expect(verifyOrgWebhookToken("org_a", "x", undefined)).toBe(false);
  });
});

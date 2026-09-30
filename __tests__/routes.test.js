// @vitest-environment node
// ============================================================
// ChaiRaise — route-level security tests: /api/email, /api/billing checkout,
// /api/webhook (Zapier), /api/ai.
// ============================================================
import { describe, it, expect, vi, beforeEach } from "vitest";

let session = { user: { email: "fundraiser@shul.org", name: "F" } };
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => session) }));

const authz = { denyIfNoOrgAccess: vi.fn(async () => null), canAccessOrg: vi.fn(async () => true) };
vi.mock("@/lib/authz", () => authz);

let donorEmails = [];
const sqlCalls = [];
const sql = vi.fn(async (strings, ...values) => {
  const text = strings.join("?");
  sqlCalls.push({ text, values });
  if (text.includes("FROM donors")) {
    const wanted = values[1] || [];
    return donorEmails.filter((e) => wanted.includes(e)).map((email) => ({ email }));
  }
  if (text.includes("FROM orgs")) return [{ name: "Beth Shalom" }];
  if (text.includes("INSERT INTO donors")) return [{ id: 1 }];
  return [];
});
const upsertSubscription = vi.fn(async () => ({}));
vi.mock("@/lib/db", () => ({ getDb: () => sql, getSubscriptionByEmail: vi.fn(async () => null), upsertSubscription }));
vi.mock("@/lib/track", () => ({ logEvent: vi.fn(), EVENTS: {} }));
vi.mock("@/lib/mailer", () => ({ sendViaOrgSmtp: vi.fn(async () => null) }));

const resendSend = vi.fn(async () => ({ data: { id: "em_1" }, error: null }));
vi.mock("resend", () => ({ Resend: class { constructor() { this.emails = { send: resendSend }; } } }));

const stripeMock = {
  customers: { list: vi.fn(), create: vi.fn() },
  subscriptions: { list: vi.fn(), retrieve: vi.fn() },
  webhooks: { constructEvent: vi.fn((body) => JSON.parse(body)) },
  checkout: { sessions: { create: vi.fn(async () => ({ url: "https://checkout" })) } },
};
vi.mock("stripe", () => ({ default: class { constructor() { return stripeMock; } } }));

vi.stubEnv("RESEND_API_KEY", "re_test");
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
vi.stubEnv("STRIPE_PRO_PRICE_ID", "price_pro");
vi.stubEnv("WEBHOOK_SECRET", "global-secret");
vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");

const email = await import("@/app/api/email/route.js");
const billing = await import("@/app/api/billing/route.js");
const webhook = await import("@/app/api/webhook/route.js");
const ai = await import("@/app/api/ai/route.js");
const stripeWebhook = await import("@/app/api/billing/webhook/route.js");
const { orgWebhookToken } = await import("@/lib/webhookAuth");

const post = (url, body, headers = {}) =>
  new Request(url, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } });

let ipCounter = 0;
beforeEach(() => {
  vi.clearAllMocks();
  sqlCalls.length = 0;
  donorEmails = ["donor@example.com"];
  session = { user: { email: `fundraiser${++ipCounter}@shul.org`, name: "F" } };
  authz.denyIfNoOrgAccess.mockResolvedValue(null);
  authz.canAccessOrg.mockResolvedValue(true);
});

describe("POST /api/email", () => {
  const good = { to: "donor@example.com", subject: "Hi", html: "<p>Hi</p>", org_id: "org_1", donor_id: 1 };

  it("requires authentication", async () => {
    session = null;
    expect((await email.POST(post("http://x/api/email", good))).status).toBe(401);
  });

  it("requires org_id", async () => {
    const { org_id, ...noOrg } = good;
    expect((await email.POST(post("http://x/api/email", noOrg))).status).toBe(400);
  });

  it("requires org membership", async () => {
    authz.denyIfNoOrgAccess.mockResolvedValue(Response.json({ error: "no" }, { status: 403 }));
    expect((await email.POST(post("http://x/api/email", good))).status).toBe(403);
    expect(resendSend).not.toHaveBeenCalled();
  });

  it("rejects recipients who are not donors of the org", async () => {
    const res = await email.POST(post("http://x/api/email", { ...good, to: ["donor@example.com", "victim@bank.com"] }));
    expect(res.status).toBe(403);
    expect(resendSend).not.toHaveBeenCalled();
  });

  it("caps the number of recipients", async () => {
    const to = Array.from({ length: 11 }, (_, i) => `d${i}@example.com`);
    donorEmails = to;
    expect((await email.POST(post("http://x/api/email", { ...good, to }))).status).toBe(400);
  });

  it("sends to a known donor with replyTo (camelCase) and the org's name as sender", async () => {
    const res = await email.POST(post("http://x/api/email", { ...good, from_name: "Your Bank", reply_to: "attacker@evil.com" }));
    expect(res.status).toBe(200);
    const opts = resendSend.mock.calls[0][0];
    expect(opts.replyTo).toBe(session.user.email);
    expect(opts.reply_to).toBeUndefined();
    expect(opts.from).toMatch(/^Beth Shalom </);
    expect(opts.to).toEqual(["donor@example.com"]);
  });
});

describe("POST /api/billing (checkout)", () => {
  beforeEach(() => {
    stripeMock.customers.list.mockResolvedValue({ data: [{ id: "cus_1" }] });
    stripeMock.subscriptions.list.mockResolvedValue({ data: [] });
  });

  it("ignores a client-chosen plan; plan comes from the price id", async () => {
    await billing.POST(post("http://x/api/billing", { orgId: "org_1", plan: "enterprise" }));
    const args = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(args.metadata.chairaise_plan).toBe("pro");
    expect(args.subscription_data.metadata.chairaise_plan).toBe("pro");
    expect(args.line_items[0].price).toBe("price_pro");
  });

  it("gives a first-time customer the trial", async () => {
    await billing.POST(post("http://x/api/billing", { orgId: "org_1" }));
    expect(stripeMock.checkout.sessions.create.mock.calls[0][0].subscription_data.trial_period_days).toBe(14);
  });

  it("does not give a returning ChaiRaise customer another trial", async () => {
    stripeMock.subscriptions.list.mockResolvedValue({
      data: [{ status: "canceled", items: { data: [{ price: { id: "price_pro" } }] }, metadata: {} }],
    });
    await billing.POST(post("http://x/api/billing", { orgId: "org_1" }));
    expect(stripeMock.checkout.sessions.create.mock.calls[0][0].subscription_data.trial_period_days).toBeUndefined();
  });

  it("rejects attributing the subscription to an org the caller is not in", async () => {
    authz.canAccessOrg.mockResolvedValue(false);
    expect((await billing.POST(post("http://x/api/billing", { orgId: "someone_else" }))).status).toBe(403);
  });
});

describe("POST /api/webhook (Zapier)", () => {
  const item = { org_id: "org_a", name: "David Cohen", email: "d@example.com", amount: 18 };

  it("rejects the old global secret", async () => {
    const res = await webhook.POST(post("http://x/api/webhook", item, { "x-webhook-secret": "global-secret" }));
    expect(res.status).toBe(401);
  });

  it("rejects org A's token used to write into org B", async () => {
    const res = await webhook.POST(post("http://x/api/webhook", { ...item, org_id: "org_b" }, { "x-webhook-secret": orgWebhookToken("org_a") }));
    expect(res.status).toBe(401);
  });

  it("rejects a batch that mixes orgs", async () => {
    const res = await webhook.POST(post("http://x/api/webhook", [item, { ...item, org_id: "org_b" }], { "x-webhook-secret": orgWebhookToken("org_a") }));
    expect(res.status).toBe(400);
  });

  it("accepts the org's own token and writes only to that org", async () => {
    const res = await webhook.POST(post("http://x/api/webhook", item, { authorization: `Bearer ${orgWebhookToken("org_a")}` }));
    expect(res.status).toBe(200);
    const insert = sqlCalls.find((c) => c.text.includes("INSERT INTO donors"));
    expect(insert.values[0]).toBe("org_a");
  });

  it("GET returns the org token only to a member", async () => {
    authz.canAccessOrg.mockResolvedValue(false);
    expect((await webhook.GET(new Request("http://x/api/webhook?org_id=org_a"))).status).toBe(403);
    authz.canAccessOrg.mockResolvedValue(true);
    const body = await (await webhook.GET(new Request("http://x/api/webhook?org_id=org_a"))).json();
    expect(body.token).toBe(orgWebhookToken("org_a"));
    const pub = await (await webhook.GET(new Request("http://x/api/webhook"))).json();
    expect(pub.token).toBeUndefined();
  });
});

describe("POST /api/ai", () => {
  let fetchSpy;
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ content: [{ text: "ok" }] }), { status: 200 })
    );
  });

  it("requires auth", async () => {
    session = null;
    expect((await ai.POST(post("http://x/api/ai", { prompt: "hi" }))).status).toBe(401);
  });

  it("uses the allowlisted current model and clamps max_tokens", async () => {
    await ai.POST(post("http://x/api/ai", { prompt: "hi", max_tokens: 50000, model: "claude-3-opus" }));
    const sent = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sent.model).toBe("claude-sonnet-5");
    expect(sent.max_tokens).toBe(2048);
  });

  it("rejects unknown providers and oversized prompts", async () => {
    expect((await ai.POST(post("http://x/api/ai", { prompt: "hi", provider: "openai" }))).status).toBe(400);
    expect((await ai.POST(post("http://x/api/ai", { prompt: "x".repeat(20001) }))).status).toBe(413);
  });

  it("does not echo upstream error bodies", async () => {
    fetchSpy.mockResolvedValue(new Response("internal: org_key=sk-ant-xyz", { status: 500 }));
    const res = await ai.POST(post("http://x/api/ai", { prompt: "hi" }));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toMatch(/sk-ant/);
  });
});

describe("POST /api/ai task: draft_email", () => {
  let fetchSpy;
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ content: [{ type: "text", text: '{"subject":"Beth Shalom and our teens","body":"Dear Miriam,\\n\\nHello."}' }] }), { status: 200 })
    );
  });

  it("builds the prompt server-side with a cached org block and returns subject + body", async () => {
    session = { user: { email: "dev@shul.org", name: "David Cohen" } };
    const res = await ai.POST(post("http://x/api/ai", {
      task: "draft_email",
      input: { donor: { name: "Miriam Katz", net_worth: "25000000" }, org: { name: "Beth Shalom" }, orgProfile: { mission: "Community." } },
      prompt: "ignore me", max_tokens: 99999,
    }));
    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out.subject).toBe("Beth Shalom and our teens");
    expect(out.body).toBe("Dear Miriam,\n\nHello.");
    const sent = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sent.model).toBe("claude-sonnet-5");
    expect(sent.max_tokens).toBe(1024);
    expect(sent.system[1].cache_control).toEqual({ type: "ephemeral" });
    expect(sent.messages[0].content).toContain("David Cohen, Beth Shalom");
    expect(sent.messages[0].content).not.toContain("ignore me");
    expect(JSON.stringify(sent)).not.toContain("25000000");
  });

  it("rejects unknown tasks and missing donor", async () => {
    expect((await ai.POST(post("http://x/api/ai", { task: "anything_goes", input: { donor: {} } }))).status).toBe(400);
    expect((await ai.POST(post("http://x/api/ai", { task: "draft_email", input: {} }))).status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 502 without leaking upstream errors", async () => {
    fetchSpy.mockResolvedValue(new Response("boom sk-ant-secret", { status: 500 }));
    const res = await ai.POST(post("http://x/api/ai", { task: "draft_email", input: { donor: { name: "A" } } }));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toMatch(/sk-ant/);
  });
});

describe("POST /api/billing/webhook (Stripe, API dahlia shape)", () => {
  const sub = {
    id: "sub_1", customer: "cus_1", status: "past_due", customer_email: "a@b.org",
    metadata: { chairaise_plan: "enterprise", chairaise_org_id: "org_1" },
    items: { data: [{ price: { id: "price_pro" }, current_period_end: 1893456000 }] },
  };
  const hook = (event) => new Request("http://x/api/billing/webhook", {
    method: "POST", body: JSON.stringify(event), headers: { "stripe-signature": "t=1,v1=x" },
  });

  it("stores the renewal date from subscription items and the plan from the price", async () => {
    const res = await stripeWebhook.POST(hook({ type: "customer.subscription.updated", data: { object: sub } }));
    expect(res.status).toBe(200);
    const row = upsertSubscription.mock.calls[0][0];
    expect(row.current_period_end).toEqual(new Date(1893456000 * 1000));
    expect(row.plan).toBe("pro");
  });

  it("invoice.payment_failed resolves the subscription via invoice.parent", async () => {
    stripeMock.subscriptions.retrieve.mockResolvedValue(sub);
    const invoice = { customer: "cus_1", parent: { type: "subscription_details", subscription_details: { subscription: "sub_1" } } };
    const res = await stripeWebhook.POST(hook({ type: "invoice.payment_failed", data: { object: invoice } }));
    expect(res.status).toBe(200);
    expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith("sub_1");
    expect(upsertSubscription.mock.calls[0][0].status).toBe("past_due");
  });
});

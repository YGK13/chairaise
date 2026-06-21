// ============================================================
// TEMPORARY one-shot Stripe provisioning endpoint.
// Works with an Organization key (sk_org_...): discovers the org's account,
// then creates the Pro product, $149/mo price, and billing webhook IN THAT
// ACCOUNT's context. Returns the ids + webhook secret + account id so they can
// be saved to env. Token-gated and REMOVED right after use.
// ============================================================
import Stripe from "stripe";
import { NextResponse } from "next/server";

const SETUP_TOKEN = "b4c97fd365c6cebaabee65c264912a040640bd9ea269abd3";
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_API_KEY;
const WEBHOOK_URL = "https://chairaise.com/api/billing/webhook";
const EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
];

export async function POST(req) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== SETUP_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!STRIPE_KEY) {
    return NextResponse.json({ error: "Stripe key not present at runtime" }, { status: 503 });
  }

  const isOrgKey = STRIPE_KEY.startsWith("sk_org_") || STRIPE_KEY.startsWith("rk_org_");
  const orgClient = new Stripe(STRIPE_KEY);

  try {
    // ---- Resolve the target account (org keys must scope to one account) ----
    // If an account id was supplied, use it directly and skip discovery (org
    // keys often lack permission to LIST accounts even when they can act on one).
    let accounts = [];
    let target = url.searchParams.get("account") || null;
    if (isOrgKey && !target) {
      try {
        const list = await orgClient.v2.core.accounts.list({ limit: 100 });
        accounts = (list.data || []).map((a) => ({
          id: a.id,
          name: a.display_name || a.contact_email || "",
        }));
      } catch (e) {
        return NextResponse.json({ error: "account_list_failed: " + e.message }, { status: 500 });
      }
      if (accounts.length === 1) target = accounts[0].id;
      else return NextResponse.json({ needs_account_choice: true, accounts }, { status: 200 });
    }

    // Client scoped to the chosen account (no-op context for standard keys).
    const stripe = target ? new Stripe(STRIPE_KEY, { stripeContext: target }) : orgClient;

    // ---- Product (reuse by name) ----
    const products = await stripe.products.list({ active: true, limit: 100 });
    let product = products.data.find((p) => p.name === "ChaiRaise Professional");
    if (!product) {
      product = await stripe.products.create({
        name: "ChaiRaise Professional",
        description:
          "Unlimited donors, AI Org Intelligence, cause-match scoring, social graph, integrations and batch campaigns.",
      });
    }

    // ---- Price ($149/mo recurring; reuse if present) ----
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
    let price = prices.data.find(
      (p) => p.unit_amount === 14900 && p.currency === "usd" && p.recurring?.interval === "month"
    );
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 14900,
        currency: "usd",
        recurring: { interval: "month" },
      });
    }

    // ---- Webhook (reuse by URL; secret only returned on create) ----
    const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
    let hook = hooks.data.find((h) => h.url === WEBHOOK_URL);
    let webhookSecret = null;
    let webhookReused = false;
    if (hook) {
      webhookReused = true;
      hook = await stripe.webhookEndpoints.update(hook.id, { enabled_events: EVENTS });
    } else {
      hook = await stripe.webhookEndpoints.create({ url: WEBHOOK_URL, enabled_events: EVENTS });
      webhookSecret = hook.secret;
    }

    return NextResponse.json({
      account_id: target,
      accounts,
      livemode: price.livemode,
      product_id: product.id,
      price_id: price.id,
      webhook_id: hook.id,
      webhook_secret: webhookSecret,
      webhook_reused: webhookReused,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

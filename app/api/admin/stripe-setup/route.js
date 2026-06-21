// ============================================================
// TEMPORARY one-shot Stripe provisioning endpoint.
// Uses the server-side Stripe key (already in the runtime env) to create the
// Pro product, its $149/mo price, and the billing webhook — then returns the
// ids/secret so they can be saved to env. Token-gated and REMOVED right after
// use. Idempotent: reuses an existing product/webhook if present.
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
  const token = new URL(req.url).searchParams.get("token");
  if (token !== SETUP_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!STRIPE_KEY) {
    return NextResponse.json({ error: "Stripe key not present at runtime" }, { status: 503 });
  }

  const stripe = new Stripe(STRIPE_KEY);
  try {
    // ---- Product (reuse by name if it exists) ----
    const existingProducts = await stripe.products.list({ active: true, limit: 100 });
    let product = existingProducts.data.find((p) => p.name === "ChaiRaise Professional");
    if (!product) {
      product = await stripe.products.create({
        name: "ChaiRaise Professional",
        description: "Unlimited donors, AI Org Intelligence, cause-match scoring, social graph, integrations and batch campaigns.",
      });
    }

    // ---- Price ($149/mo recurring; reuse a matching one if present) ----
    const existingPrices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
    let price = existingPrices.data.find(
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

    // ---- Webhook endpoint (reuse by URL; secret only returned on create) ----
    const existingHooks = await stripe.webhookEndpoints.list({ limit: 100 });
    let hook = existingHooks.data.find((h) => h.url === WEBHOOK_URL);
    let webhookSecret = null;
    let webhookReused = false;
    if (hook) {
      webhookReused = true; // secret not retrievable for an existing endpoint
      // Ensure it listens for the events we need.
      hook = await stripe.webhookEndpoints.update(hook.id, { enabled_events: EVENTS });
    } else {
      hook = await stripe.webhookEndpoints.create({ url: WEBHOOK_URL, enabled_events: EVENTS });
      webhookSecret = hook.secret; // whsec_... returned only at creation
    }

    return NextResponse.json({
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

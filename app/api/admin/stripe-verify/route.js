// TEMPORARY read-only Stripe verification endpoint. Confirms which account the
// app is wired to and what's provisioned there. Token-gated, removed after use.
import Stripe from "stripe";
import { NextResponse } from "next/server";

const TOKEN = "3711bc56b2c6166b7543719ecb1e3d0c4f1ff736";
const KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_API_KEY;
const ACCT = process.env.STRIPE_ACCOUNT_ID;

export async function GET(req) {
  if (new URL(req.url).searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!KEY) return NextResponse.json({ error: "no stripe key" }, { status: 503 });

  const out = { env: { hasKey: !!KEY, keyPrefix: KEY.slice(0, 8), account_id: ACCT || null, price_id: process.env.STRIPE_PRO_PRICE_ID || null, has_webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET } };
  const ctx = ACCT ? { stripeContext: ACCT } : undefined;
  const stripe = new Stripe(KEY, ctx);

  // 1) Account identity (try a few ways — org keys vary in what they allow).
  try {
    const a = await stripe.v2.core.accounts.retrieve(ACCT, { include: ["identity", "configuration.merchant"] });
    out.account = { id: a.id, display_name: a.display_name || null, contact_email: a.contact_email || null, dashboard: a.dashboard || null };
  } catch (e1) {
    out.account_v2_error = e1.message;
    try {
      const a = await stripe.accounts.retrieve();
      out.account = { id: a.id, business_name: a.business_profile?.name || null, email: a.email || null, country: a.country || null, name: a.settings?.dashboard?.display_name || null, url: a.business_profile?.url || null };
    } catch (e2) {
      out.account_v1_error = e2.message;
    }
  }

  // 2) What's provisioned in this account.
  try {
    const products = await stripe.products.list({ active: true, limit: 20 });
    out.products = products.data.map((p) => ({ id: p.id, name: p.name }));
  } catch (e) { out.products_error = e.message; }
  try {
    const prices = await stripe.prices.list({ active: true, limit: 20 });
    out.prices = prices.data.map((p) => ({ id: p.id, amount: p.unit_amount, currency: p.currency, interval: p.recurring?.interval, livemode: p.livemode }));
  } catch (e) { out.prices_error = e.message; }
  try {
    const hooks = await stripe.webhookEndpoints.list({ limit: 10 });
    out.webhooks = hooks.data.map((h) => ({ id: h.id, url: h.url, status: h.status }));
  } catch (e) { out.webhooks_error = e.message; }

  return NextResponse.json(out);
}

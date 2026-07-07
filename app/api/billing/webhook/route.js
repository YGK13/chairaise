// ============================================================
// ChaiRaise — Stripe Webhook Handler
// POST /api/billing/webhook — receives Stripe events
// Handles: checkout.session.completed, subscription updates, cancellations
// ============================================================
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { upsertSubscription } from "@/lib/db";

// Accept either the canonical STRIPE_SECRET_KEY or the STRIPE_SECRET_API_KEY alias.
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_API_KEY;
// Org keys need account context (Stripe-Context) — set STRIPE_ACCOUNT_ID.
const STRIPE_CFG = process.env.STRIPE_ACCOUNT_ID
  ? { stripeContext: process.env.STRIPE_ACCOUNT_ID }
  : undefined;
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, STRIPE_CFG) : null;

// Convert a Stripe unix timestamp (seconds) to a JS Date, or null.
const toDate = (unix) => (unix ? new Date(unix * 1000) : null);

// Resolve the customer email for a subscription event. Subscription objects
// carry only the customer id, so we retrieve the customer to get the email.
async function emailForSubscription(subscription) {
  if (subscription.customer_email) return subscription.customer_email;
  try {
    const customer = await stripe.customers.retrieve(subscription.customer);
    return customer?.email || null;
  } catch (e) {
    console.error("[Billing] Could not retrieve customer email:", e.message);
    return null;
  }
}

// Persist a Stripe subscription object to our subscriptions table.
// This Stripe account is shared across all of Yuri's products, so this endpoint
// receives events for DueDrill, Career Beast Mode, etc. too. Only persist
// subscriptions that are actually ChaiRaise — matched by our price id or the
// metadata we stamp at checkout — so other products never pollute our DB.
function isChaiRaiseSubscription(subscription) {
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  const items = subscription?.items?.data || [];
  if (priceId && items.some((i) => i?.price?.id === priceId)) return true;
  if (subscription?.metadata?.chairaise_org_id || subscription?.metadata?.chairaise_plan) return true;
  return false;
}

async function persistSubscription(subscription, emailOverride) {
  if (!isChaiRaiseSubscription(subscription)) {
    console.log(`[Billing] Ignoring non-ChaiRaise subscription ${subscription?.id}`);
    return;
  }
  const email = emailOverride || (await emailForSubscription(subscription));
  if (!email) {
    console.error("[Billing] No email for subscription", subscription.id);
    return;
  }
  await upsertSubscription({
    email,
    org_id: subscription.metadata?.chairaise_org_id || "",
    stripe_customer_id: subscription.customer || "",
    stripe_subscription_id: subscription.id || "",
    plan: subscription.metadata?.chairaise_plan || "pro",
    status: subscription.status || "active",
    current_period_end: toDate(subscription.current_period_end),
    trial_end: toDate(subscription.trial_end),
    cancel_at_period_end: !!subscription.cancel_at_period_end,
  });
}

export async function POST(req) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  // Hard-fail if the webhook secret isn't configured. Without it we cannot
  // verify the request actually came from Stripe, and this endpoint writes
  // subscription/billing state straight into the DB — accepting unsigned
  // traffic here would let anyone forge a "paid" subscription for any email.
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[Billing] STRIPE_WEBHOOK_SECRET is not set — refusing to process webhook.");
    return NextResponse.json(
      { error: "Webhook secret not configured on server" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  // Verify webhook signature (required — no more unverified dev-mode fallback).
  let event;
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event. Persistence is wrapped so a DB hiccup returns 500 and
  // Stripe retries, rather than silently dropping a billing state change.
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const email = session.customer_email || session.customer_details?.email;
        console.log(`[Billing] Checkout completed for ${email}, org: ${session.metadata?.chairaise_org_id}`);
        // Retrieve the full subscription so we capture status + period dates.
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          // Carry the checkout org id onto the subscription metadata if missing.
          if (!subscription.metadata?.chairaise_org_id && session.metadata?.chairaise_org_id) {
            subscription.metadata = { ...subscription.metadata, chairaise_org_id: session.metadata.chairaise_org_id };
          }
          await persistSubscription(subscription, email);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        console.log(`[Billing] Subscription ${subscription.id} ${event.type.split(".").pop()}: status=${subscription.status}`);
        await persistSubscription(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        console.log(`[Billing] Subscription ${subscription.id} cancelled`);
        // Mark canceled so resolvePlan() drops the user back to Starter.
        await persistSubscription({ ...subscription, status: "canceled" });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log(`[Billing] Payment failed for customer ${invoice.customer}`);
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          await persistSubscription(subscription);
        }
        break;
      }

      default:
        // Unhandled event type — log but don't error
        console.log(`[Billing] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Billing] Failed to process ${event.type}:`, err.message);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

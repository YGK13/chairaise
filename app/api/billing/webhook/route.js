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
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY) : null;

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
async function persistSubscription(subscription, emailOverride) {
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

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  // Verify webhook signature if secret is configured
  let event;
  if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    // Dev mode: parse without verification
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
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

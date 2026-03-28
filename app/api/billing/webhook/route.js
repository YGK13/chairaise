// ============================================================
// ChaiRaise — Stripe Webhook Handler
// POST /api/billing/webhook — receives Stripe events
// Handles: checkout.session.completed, subscription updates, cancellations
// ============================================================
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

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

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log(`[Billing] Checkout completed for ${session.customer_email}, org: ${session.metadata?.chairaise_org_id}`);
      // In production: update org's plan in database
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      console.log(`[Billing] Subscription ${subscription.id} updated: status=${subscription.status}`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      console.log(`[Billing] Subscription ${subscription.id} cancelled`);
      // In production: downgrade org to Starter plan in database
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      console.log(`[Billing] Payment failed for customer ${invoice.customer}`);
      // In production: send notification to org admin
      break;
    }

    default:
      // Unhandled event type — log but don't error
      console.log(`[Billing] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

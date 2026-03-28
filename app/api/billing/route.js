// ============================================================
// ChaiRaise — Stripe Billing API
// POST /api/billing — create checkout session for Pro plan
// GET /api/billing — get subscription status for current user
// ============================================================
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Only initialize Stripe if the key exists (graceful degradation)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// ============================================================
// POST — Create a Stripe Checkout Session for Pro plan upgrade
// ============================================================
export async function POST(req) {
  // Verify Stripe is configured
  if (!stripe) {
    return NextResponse.json(
      { error: "Billing not configured", hint: "Add STRIPE_SECRET_KEY to environment variables" },
      { status: 503 }
    );
  }

  // Get authenticated user
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { orgId, orgName, plan } = body;

    // Determine price based on plan
    // In production, use Stripe Price IDs from environment variables
    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured", hint: "Create a product in Stripe Dashboard and add STRIPE_PRO_PRICE_ID" },
        { status: 503 }
      );
    }

    // Create or retrieve Stripe Customer
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: {
          chairaise_org_id: orgId || "default",
          chairaise_org_name: orgName || "ChaiRaise",
        },
      });
    }

    // Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL || "https://chairaise.com"}/?billing=success`,
      cancel_url: `${process.env.NEXTAUTH_URL || "https://chairaise.com"}/?billing=cancelled`,
      metadata: {
        chairaise_org_id: orgId || "default",
        chairaise_plan: plan || "pro",
      },
      subscription_data: {
        metadata: {
          chairaise_org_id: orgId || "default",
          chairaise_plan: plan || "pro",
        },
      },
      // Trial period: 14 days free
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          chairaise_org_id: orgId || "default",
          chairaise_plan: plan || "pro",
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error.message);
    return NextResponse.json(
      { error: "Failed to create checkout session", detail: error.message },
      { status: 500 }
    );
  }
}

// ============================================================
// GET — Get current subscription status
// ============================================================
export async function GET() {
  if (!stripe) {
    return NextResponse.json({ plan: "starter", status: "active", billing: "not_configured" });
  }

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ plan: "starter", status: "unauthenticated" });
  }

  try {
    // Find customer by email
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({ plan: "starter", status: "active", message: "Free tier" });
    }

    const customer = customers.data[0];

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 5,
    });

    const activeSub = subscriptions.data.find(
      (s) => s.status === "active" || s.status === "trialing"
    );

    if (activeSub) {
      return NextResponse.json({
        plan: activeSub.metadata?.chairaise_plan || "pro",
        status: activeSub.status,
        trial_end: activeSub.trial_end ? new Date(activeSub.trial_end * 1000).toISOString() : null,
        current_period_end: new Date(activeSub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: activeSub.cancel_at_period_end,
        customer_id: customer.id,
        subscription_id: activeSub.id,
      });
    }

    // Check for past subscriptions
    const pastSub = subscriptions.data[0];
    if (pastSub) {
      return NextResponse.json({
        plan: "starter",
        status: pastSub.status,
        message: `Previous subscription ${pastSub.status}`,
      });
    }

    return NextResponse.json({ plan: "starter", status: "active" });
  } catch (error) {
    console.error("Stripe status error:", error.message);
    return NextResponse.json({ plan: "starter", status: "error", error: error.message });
  }
}

// ============================================================
// ChaiRaise — Stripe Billing API
// POST /api/billing — create checkout session for Pro plan
// GET /api/billing — get subscription status for current user
// ============================================================
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isOwnerEmail, resolvePlan, planMeta } from "@/lib/plan";
import { getSubscriptionByEmail } from "@/lib/db";

// Only initialize Stripe if the key exists (graceful degradation)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Shape a billing status payload the client can trust to render entitlements.
function statusPayload(planId, extra = {}) {
  const meta = planMeta(planId);
  return {
    plan: planId,
    label: meta.label,
    limits: meta.limits,
    features: meta.features,
    status: "active",
    ...extra,
  };
}

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

  // Owner accounts already have full, free access — no checkout needed.
  if (isOwnerEmail(session.user.email)) {
    return NextResponse.json(
      { owner: true, message: "Owner account — full access, no billing required." },
      { status: 200 }
    );
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
    const baseUrl = process.env.NEXTAUTH_URL || "https://chairaise.com";
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
      success_url: `${baseUrl}/?billing=success`,
      cancel_url: `${baseUrl}/?billing=cancelled`,
      metadata: {
        chairaise_org_id: orgId || "default",
        chairaise_plan: plan || "pro",
      },
      // Single subscription_data block: 14-day trial + metadata carried onto the
      // subscription so the webhook can attribute it to the right org/plan.
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
// GET — Resolve the current user's plan + entitlements (authoritative)
// Order of truth: owner allowlist → persisted subscription (webhook) → Stripe
// live lookup (self-heal) → Starter. The client renders whatever this returns.
// ============================================================
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;

  // 1) Owner override — full access, free, regardless of Stripe state.
  if (email && isOwnerEmail(email)) {
    return NextResponse.json(statusPayload("owner", { owner: true }));
  }

  // 2) Persisted subscription from webhooks (no Stripe round-trip needed).
  if (email) {
    try {
      const sub = await getSubscriptionByEmail(email);
      if (sub) {
        const planId = resolvePlan(email, sub.status, sub.plan);
        return NextResponse.json(
          statusPayload(planId, {
            status: sub.status,
            trial_end: sub.trial_end,
            current_period_end: sub.current_period_end,
            cancel_at_period_end: sub.cancel_at_period_end,
            subscription_id: sub.stripe_subscription_id || undefined,
          })
        );
      }
    } catch (e) {
      // DB unavailable — fall through to Stripe / starter rather than 500.
      console.warn("[Billing] subscription lookup failed:", e.message);
    }
  }

  // 3) No persisted row. If Stripe is configured, do a live self-heal lookup.
  if (stripe && email) {
    try {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customers.data[0].id,
          status: "all",
          limit: 5,
        });
        const activeSub = subscriptions.data.find(
          (s) => s.status === "active" || s.status === "trialing"
        );
        if (activeSub) {
          const planId = resolvePlan(email, activeSub.status, activeSub.metadata?.chairaise_plan);
          return NextResponse.json(
            statusPayload(planId, {
              status: activeSub.status,
              trial_end: activeSub.trial_end ? new Date(activeSub.trial_end * 1000).toISOString() : null,
              current_period_end: activeSub.current_period_end
                ? new Date(activeSub.current_period_end * 1000).toISOString()
                : null,
              cancel_at_period_end: activeSub.cancel_at_period_end,
              subscription_id: activeSub.id,
            })
          );
        }
      }
    } catch (error) {
      console.error("Stripe status error:", error.message);
    }
  }

  // 4) Default — free Starter tier (also the keyless/not-configured path).
  return NextResponse.json(
    statusPayload("starter", { billing: stripe ? "active" : "not_configured" })
  );
}

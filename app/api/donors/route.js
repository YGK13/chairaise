// ============================================================
// ChaiRaise — Donors API (CRUD)
// GET /api/donors?org_id=xxx — List all donors for an org
// POST /api/donors — Create a new donor
// ============================================================
import { getDb, getSubscriptionByEmail } from "@/lib/db";
import { auth } from "@/lib/auth";
import { resolvePlan, limitFor } from "@/lib/plan";
import { denyIfNoOrgAccess } from "@/lib/authz";

// Resolve the caller's plan authoritatively (owner allowlist → subscription → starter).
async function planForSession(session) {
  const email = session?.user?.email;
  if (!email) return "starter";
  try {
    const sub = await getSubscriptionByEmail(email);
    return resolvePlan(email, sub?.status, sub?.plan);
  } catch {
    // resolvePlan handles the owner allowlist without the DB; fall back to that.
    return resolvePlan(email, undefined);
  }
}

// ---- GET: List donors for an org ----
export async function GET(req) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id");

    if (!orgId) {
      return Response.json({ error: "org_id is required" }, { status: 400 });
    }

    const denied = await denyIfNoOrgAccess(session, orgId);
    if (denied) return denied;

    const sql = getDb();
    const donors = await sql`
      SELECT * FROM donors
      WHERE org_id = ${orgId}
      ORDER BY
        CASE tier WHEN 'Tier 1' THEN 1 WHEN 'Tier 2' THEN 2 ELSE 3 END,
        name ASC
    `;

    return Response.json({ donors, count: donors.length });
  } catch (error) {
    console.error("GET /api/donors error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ---- POST: Create a new donor ----
export async function POST(req) {
  try {
    const session = await auth();
    const body = await req.json();
    const {
      org_id, name, email = "", phone = "", city = "",
      tier = "Tier 3", community = "", school = "", industry = "",
      foundation = "", net_worth = 0, annual_giving = 0, giving_capacity = 0,
      warmth_score = 0, pipeline_stage = "not_started",
      focus_areas = [], tags = [], custom_hook = "",
      prior_gift_detail = "", notes = ""
    } = body;

    if (!org_id || !name) {
      return Response.json({ error: "org_id and name are required" }, { status: 400 });
    }

    const denied = await denyIfNoOrgAccess(session, org_id);
    if (denied) return denied;

    const sql = getDb();

    // ---- Entitlement: enforce the Starter donor cap server-side ----
    const plan = await planForSession(session);
    const cap = limitFor(plan, "donors"); // null === unlimited (pro/owner/enterprise)
    if (cap !== null) {
      const [{ count }] = await sql`
        SELECT COUNT(*)::int AS count FROM donors WHERE org_id = ${org_id}
      `;
      if (count >= cap) {
        return Response.json(
          {
            error: `Your Starter plan is limited to ${cap} donors.`,
            code: "donor_limit_reached",
            plan,
            limit: cap,
            current: count,
            upgrade: true,
          },
          { status: 402 }
        );
      }
    }

    const [donor] = await sql`
      INSERT INTO donors (
        org_id, name, email, phone, city, tier, community, school,
        industry, foundation, net_worth, annual_giving, giving_capacity,
        warmth_score, pipeline_stage, focus_areas, tags,
        custom_hook, prior_gift_detail, notes
      ) VALUES (
        ${org_id}, ${name}, ${email}, ${phone}, ${city}, ${tier},
        ${community}, ${school}, ${industry}, ${foundation},
        ${net_worth}, ${annual_giving}, ${giving_capacity},
        ${warmth_score}, ${pipeline_stage},
        ${JSON.stringify(focus_areas)}, ${JSON.stringify(tags)},
        ${custom_hook}, ${prior_gift_detail}, ${notes}
      )
      RETURNING *
    `;

    return Response.json({ donor }, { status: 201 });
  } catch (error) {
    console.error("POST /api/donors error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================
// ChaiRaise — Zapier/Webhook Endpoint for Real-Time Donor Sync
// POST /api/webhook — Receives donor/donation data from Zapier, Make, etc.
//
// Flow: IsraelGives → Zapier → POST /api/webhook → ChaiRaise DB
//
// Auth: a PER-ORG token (lib/webhookAuth.js) in `x-webhook-secret` or
// `Authorization: Bearer`. The token is bound to one org_id; every item in the
// request must target that org. Org members fetch their token from
// GET /api/webhook?org_id=<id> while signed in.
// ============================================================
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessOrg } from "@/lib/authz";
import { orgWebhookToken, verifyOrgWebhookToken, tokenFromHeaders } from "@/lib/webhookAuth";

export async function POST(req) {
  try {
    // Hard-fail if no secret is configured. This endpoint writes donor/donation
    // data straight into the DB by an org_id the caller supplies — without a
    // secret requirement, anyone who finds the URL could inject or overwrite
    // records for any org. No secret configured = no unsigned traffic accepted.
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Webhook] WEBHOOK_SECRET is not set — refusing to process request.");
      return Response.json({ error: "Webhook secret not configured on server" }, { status: 500 });
    }

    const body = await req.json();

    // Support both single donor and batch (array)
    const items = Array.isArray(body) ? body : [body];

    if (!items.length) {
      return Response.json({ error: "No data received" }, { status: 400 });
    }

    // Resolve the ONE target org: ?org_id= or the items' org_id, which must
    // all agree. Then authenticate with that org's own token.
    const queryOrg = new URL(req.url).searchParams.get("org_id") || "";
    const itemOrgs = new Set(items.map((i) => i?.org_id || i?.organization_id || "").filter(Boolean));
    const targetOrg = queryOrg || (itemOrgs.size === 1 ? [...itemOrgs][0] : "");
    if (!targetOrg || [...itemOrgs].some((o) => o !== targetOrg)) {
      return Response.json({ error: "Exactly one org_id is required per request" }, { status: 400 });
    }
    if (!verifyOrgWebhookToken(targetOrg, tokenFromHeaders(req.headers), webhookSecret)) {
      return Response.json({ error: "Invalid webhook token for this org" }, { status: 401 });
    }

    const sql = getDb();
    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (const item of items) {
      try {
        // Normalize field names — support various formats from different platforms
        const name = item.name || item.donor_name || item.full_name || item["שם"] || "";
        const email = item.email || item.donor_email || item["דוא\"ל"] || item["אימייל"] || "";
        const phone = item.phone || item.tel || item["טלפון"] || "";
        const amount = parseInt(String(item.amount || item.donation || item.sum || item["סכום"] || "0").replace(/[$,₪\s]/g, "")) || 0;
        const city = item.city || item["עיר"] || item.address || "";
        const orgId = targetOrg; // authenticated org, never per-item input
        const source = item.source || item.platform || "webhook";
        const campaign = item.campaign || item["קמפיין"] || "";

        if (!name) {
          results.skipped++;
          continue;
        }

        if (!orgId) {
          results.errors.push({ name, error: "org_id is required" });
          continue;
        }

        // Check for existing donor by email (if provided)
        if (email) {
          const [existing] = await sql`
            SELECT id FROM donors WHERE org_id = ${orgId} AND LOWER(email) = ${email.toLowerCase()}
          `;
          if (existing) {
            // Update existing donor with new donation amount
            await sql`
              UPDATE donors SET
                annual_giving = GREATEST(annual_giving, ${amount}),
                updated_at = NOW()
              WHERE id = ${existing.id}
            `;
            // Log as activity
            if (amount > 0) {
              await sql`
                INSERT INTO activities (org_id, donor_id, type, summary, date)
                VALUES (${orgId}, ${existing.id}, 'gift', ${`Donation received: $${amount.toLocaleString()}${campaign ? " (" + campaign + ")" : ""} via ${source}`}, NOW())
              `;
            }
            results.updated++;
            continue;
          }
        }

        // Create new donor
        const [donor] = await sql`
          INSERT INTO donors (org_id, name, email, phone, city, annual_giving, pipeline_stage, tags)
          VALUES (${orgId}, ${name}, ${email}, ${phone}, ${city}, ${amount}, 'not_started',
            ${JSON.stringify([`imported:${source}`, campaign ? `campaign:${campaign}` : null].filter(Boolean))})
          RETURNING id
        `;

        // Log initial activity
        if (amount > 0) {
          await sql`
            INSERT INTO activities (org_id, donor_id, type, summary, date)
            VALUES (${orgId}, ${donor.id}, 'gift', ${`First donation: $${amount.toLocaleString()}${campaign ? " (" + campaign + ")" : ""} via ${source}`}, NOW())
          `;
        }

        results.created++;
      } catch (itemErr) {
        results.errors.push({ name: item.name || "unknown", error: itemErr.message });
      }
    }

    // Log to audit
    try {
      const orgId = targetOrg;
      if (orgId) {
        await sql`
          INSERT INTO audit_log (org_id, user_name, type, action, detail)
          VALUES (${orgId}, 'Webhook', 'import', 'Webhook import',
            ${`${results.created} created, ${results.updated} updated, ${results.skipped} skipped`})
        `;
      }
    } catch (e) { /* audit logging is best-effort */ }

    return Response.json({
      success: true,
      ...results,
      total: items.length
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// GET — webhook documentation for Zapier setup. A signed-in member of
// ?org_id=<id> also receives that org's webhook token.
export async function GET(req) {
  const orgId = req ? new URL(req.url).searchParams.get("org_id") : null;
  let token;
  if (orgId) {
    const session = await auth();
    if (!session?.user?.email || !(await canAccessOrg(session.user.email, orgId))) {
      return Response.json({ error: "You don't have access to this organization." }, { status: 403 });
    }
    token = orgWebhookToken(orgId) || undefined;
    if (!token) {
      return Response.json({ error: "Webhook secret not configured on server" }, { status: 503 });
    }
  }
  return Response.json({
    ...(token ? { org_id: orgId, token } : {}),
    name: "ChaiRaise Webhook",
    description: "Receive donor/donation data from Zapier, Make, or direct integrations",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": "Your org's webhook token (GET /api/webhook?org_id=<id> while signed in)"
    },
    body_format: {
      org_id: "required — your ChaiRaise organization ID (must match the token's org)",
      name: "required — donor full name",
      email: "optional — donor email",
      phone: "optional — donor phone",
      amount: "optional — donation amount (number)",
      city: "optional — donor city",
      campaign: "optional — campaign name",
      source: "optional — platform name (default: 'webhook')"
    },
    example: {
      org_id: "temple_beth_israel",
      name: "David Cohen",
      email: "david@example.com",
      amount: 1800,
      campaign: "Annual Fund 2026",
      source: "israelgives"
    }
  });
}

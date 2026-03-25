// ============================================================
// ChaiRaise — Zapier/Webhook Endpoint for Real-Time Donor Sync
// POST /api/webhook — Receives donor/donation data from Zapier, Make, etc.
//
// Flow: IsraelGives → Zapier → POST /api/webhook → ChaiRaise DB
// ============================================================
import { getDb } from "@/lib/db";

export async function POST(req) {
  try {
    // Authenticate with webhook secret (set in Zapier headers)
    const authHeader = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return Response.json({ error: "Invalid webhook secret" }, { status: 401 });
    }

    const body = await req.json();

    // Support both single donor and batch (array)
    const items = Array.isArray(body) ? body : [body];

    if (!items.length) {
      return Response.json({ error: "No data received" }, { status: 400 });
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
        const orgId = item.org_id || item.organization_id || "";
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
      const orgId = items[0]?.org_id || "";
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
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// GET — returns webhook documentation for Zapier setup
export async function GET() {
  return Response.json({
    name: "ChaiRaise Webhook",
    description: "Receive donor/donation data from Zapier, Make, or direct integrations",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": "Your WEBHOOK_SECRET from Vercel env vars"
    },
    body_format: {
      org_id: "required — your ChaiRaise organization ID",
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

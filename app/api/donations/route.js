// ============================================================
// ChaiRaise — Donations API
// GET  /api/donations?org_id=X&donor_id=Y — List donations
// POST /api/donations — Record a new donation
// ============================================================
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id");
    const donorId = searchParams.get("donor_id");

    if (!orgId) return Response.json({ error: "org_id required" }, { status: 400 });

    const sql = getDb();

    if (donorId) {
      // Get donations for a specific donor
      const donations = await sql`
        SELECT * FROM donations
        WHERE org_id = ${orgId} AND donor_id = ${parseInt(donorId)}
        ORDER BY date DESC
      `;
      // Also get summary stats
      const [stats] = await sql`
        SELECT
          COUNT(*) as total_gifts,
          COALESCE(SUM(amount), 0) as lifetime_giving,
          COALESCE(AVG(amount), 0) as avg_gift,
          MAX(amount) as largest_gift,
          MAX(date) as last_gift_date,
          MIN(date) as first_gift_date
        FROM donations
        WHERE org_id = ${orgId} AND donor_id = ${parseInt(donorId)}
      `;
      return Response.json({ donations, stats });
    }

    // Get all donations for the org (with donor name)
    const donations = await sql`
      SELECT d.*, dn.name as donor_name, dn.tier
      FROM donations d
      LEFT JOIN donors dn ON d.donor_id = dn.id
      WHERE d.org_id = ${orgId}
      ORDER BY d.date DESC
      LIMIT 500
    `;

    // Org-level summary
    const [summary] = await sql`
      SELECT
        COUNT(*) as total_donations,
        COUNT(DISTINCT donor_id) as unique_donors,
        COALESCE(SUM(amount), 0) as total_raised,
        COALESCE(AVG(amount), 0) as avg_donation
      FROM donations WHERE org_id = ${orgId}
    `;

    return Response.json({ donations, summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ error: "Auth required" }, { status: 401 });

    const body = await req.json();
    const {
      org_id, donor_id, amount, currency = "USD", date,
      campaign = "", source = "", payment_method = "",
      receipt_number = "", is_recurring = false, notes = "", import_source = ""
    } = body;

    if (!org_id || !donor_id || !amount) {
      return Response.json({ error: "org_id, donor_id, and amount are required" }, { status: 400 });
    }

    const sql = getDb();
    const [donation] = await sql`
      INSERT INTO donations (org_id, donor_id, amount, currency, date, campaign, source,
        payment_method, receipt_number, is_recurring, notes, import_source)
      VALUES (${org_id}, ${parseInt(donor_id)}, ${parseInt(amount)}, ${currency},
        ${date || new Date().toISOString()}, ${campaign}, ${source}, ${payment_method},
        ${receipt_number}, ${is_recurring}, ${notes}, ${import_source})
      RETURNING *
    `;

    // Update donor's annual_giving and last activity
    await sql`
      UPDATE donors SET
        annual_giving = COALESCE((
          SELECT SUM(amount) FROM donations
          WHERE donor_id = ${parseInt(donor_id)}
          AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NOW())
        ), 0),
        updated_at = NOW()
      WHERE id = ${parseInt(donor_id)}
    `;

    // Log as activity
    await sql`
      INSERT INTO activities (org_id, donor_id, type, summary, date)
      VALUES (${org_id}, ${parseInt(donor_id)}, 'gift',
        ${'Donation: $' + parseInt(amount).toLocaleString() + (campaign ? ' (' + campaign + ')' : '')},
        ${date || new Date().toISOString()})
    `;

    return Response.json({ donation }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

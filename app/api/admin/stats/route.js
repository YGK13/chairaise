// ============================================================
// ChaiRaise — Owner operations stats
// GET /api/admin/stats
//
// STRICTLY owner-only: this returns cross-tenant aggregates (every org, every
// signup), so it is gated on isOwnerEmail — not org membership. A normal
// customer must never reach it.
// ============================================================
import { auth } from "@/lib/auth";
import { isOwnerEmail } from "@/lib/plan";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isOwnerEmail(email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const sql = getDb();

    const [
      totals, byProvider, signupsByDay, recentSignups, topOrgs,
      planMix, mailboxes, recentDonations, activity,
    ] = await Promise.all([
      // Headline vitals in one round-trip.
      sql`SELECT
            (SELECT COUNT(*)::int FROM accounts)                    AS accounts,
            (SELECT COUNT(*)::int FROM orgs)                        AS orgs,
            (SELECT COUNT(*)::int FROM donors)                      AS donors,
            (SELECT COUNT(*)::int FROM donations)                  AS donations,
            (SELECT COALESCE(SUM(amount),0)::bigint FROM donations) AS donation_total,
            (SELECT COUNT(*)::int FROM accounts WHERE created_at > NOW() - INTERVAL '7 days')  AS signups_7d,
            (SELECT COUNT(*)::int FROM accounts WHERE created_at > NOW() - INTERVAL '30 days') AS signups_30d,
            (SELECT COUNT(*)::int FROM accounts WHERE last_login > NOW() - INTERVAL '7 days')  AS active_7d`,

      sql`SELECT provider, COUNT(*)::int AS n FROM accounts GROUP BY provider ORDER BY n DESC`,

      // 30-day signup histogram, zero-filled so the chart never has gaps.
      sql`SELECT to_char(d::date,'YYYY-MM-DD') AS day,
                 COALESCE(c.n,0)::int AS n
          FROM generate_series(NOW()::date - 29, NOW()::date, INTERVAL '1 day') d
          LEFT JOIN (
            SELECT created_at::date AS day, COUNT(*)::int AS n
            FROM accounts GROUP BY created_at::date
          ) c ON c.day = d::date
          ORDER BY day`,

      sql`SELECT email, name, provider, created_at, last_login
          FROM accounts ORDER BY created_at DESC LIMIT 25`,

      sql`SELECT o.id, o.name, o.org_type, o.created_at,
                 (SELECT COUNT(*)::int FROM donors d WHERE d.org_id = o.id)     AS donors,
                 (SELECT COUNT(*)::int FROM users u WHERE u.org_id = o.id)       AS members,
                 (SELECT COALESCE(SUM(amount),0)::bigint FROM donations dn WHERE dn.org_id = o.id) AS raised
          FROM orgs o
          ORDER BY donors DESC, o.created_at DESC LIMIT 25`,

      sql`SELECT plan, status, COUNT(*)::int AS n FROM subscriptions GROUP BY plan, status ORDER BY n DESC`,

      sql`SELECT COUNT(*)::int AS connected,
                 COUNT(*) FILTER (WHERE verified_at IS NOT NULL)::int AS verified
          FROM org_email_settings`,

      sql`SELECT COUNT(*)::int AS n FROM donations WHERE date > NOW() - INTERVAL '30 days'`,

      sql`SELECT
            (SELECT COUNT(*)::int FROM activities)   AS activities,
            (SELECT COUNT(*)::int FROM outreach_log) AS outreach,
            (SELECT COUNT(*)::int FROM outreach_log WHERE channel='email')    AS emails,
            (SELECT COUNT(*)::int FROM outreach_log WHERE channel='whatsapp') AS whatsapp`,
    ]);

    return Response.json({
      generated_at: new Date().toISOString(),
      totals: totals[0],
      by_provider: byProvider,
      signups_by_day: signupsByDay,
      recent_signups: recentSignups,
      top_orgs: topOrgs,
      plan_mix: planMix,
      mailboxes: mailboxes[0],
      donations_30d: recentDonations[0]?.n ?? 0,
      activity: activity[0],
    });
  } catch (e) {
    console.error("GET /api/admin/stats error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

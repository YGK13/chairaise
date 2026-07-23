// ============================================================
// ChaiRaise — Owner operations stats
// GET /api/admin/stats
//
// STRICTLY owner-only: this returns cross-tenant aggregates (every org, every
// signup, every person), so it is gated on isOwnerEmail — not org membership.
// A normal customer must never reach it.
//
// Two data layers feed it:
//   - Domain tables (orgs/donors/donations/users/outreach) → the "work" done.
//   - The events stream (lib/track.js) → who is active, and the activity feed.
// Event-derived queries are wrapped so a not-yet-migrated `events` table can
// never 500 the whole console — they degrade to empty instead.
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
    const soft = (p) => p.catch(() => []); // event tables may not exist yet

    const [
      totals, byProvider, byOrgType, signupsByDay, recentSignups, topOrgs,
      planMix, mailboxes, recentDonations, activity, funnel, people,
      eventFeed, eventCounts, activeByDay,
    ] = await Promise.all([
      // Headline vitals + active-user windows in one round-trip.
      sql`SELECT
            (SELECT COUNT(*)::int FROM accounts)                    AS accounts,
            (SELECT COUNT(*)::int FROM orgs)                        AS orgs,
            (SELECT COUNT(*)::int FROM donors)                      AS donors,
            (SELECT COUNT(*)::int FROM donations)                  AS donations,
            (SELECT COALESCE(SUM(amount),0)::bigint FROM donations) AS donation_total,
            (SELECT COUNT(*)::int FROM accounts WHERE created_at > NOW() - INTERVAL '7 days')  AS signups_7d,
            (SELECT COUNT(*)::int FROM accounts WHERE created_at > NOW() - INTERVAL '30 days') AS signups_30d,
            (SELECT COUNT(*)::int FROM accounts WHERE last_login > NOW() - INTERVAL '24 hours') AS active_24h,
            (SELECT COUNT(*)::int FROM accounts WHERE last_login > NOW() - INTERVAL '7 days')  AS active_7d,
            (SELECT COUNT(*)::int FROM accounts WHERE last_login > NOW() - INTERVAL '30 days') AS active_30d`,

      sql`SELECT provider, COUNT(*)::int AS n FROM accounts GROUP BY provider ORDER BY n DESC`,

      // Org-type mix — the honest "demographic" for a fundraising CRM.
      sql`SELECT COALESCE(NULLIF(org_type,''),'unspecified') AS org_type, COUNT(*)::int AS n
          FROM orgs GROUP BY 1 ORDER BY n DESC`,

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

      // ---- Activation funnel ----
      // Every stage is derived from durable state (not events), so it is
      // accurate from day one regardless of when tracking was switched on.
      // Stage counts are DISTINCT accounts, keyed by email, that reached each
      // depth: signed up -> joined an org -> org has a donor -> a donation -> outreach.
      sql`SELECT
            (SELECT COUNT(*)::int FROM accounts) AS signed_up,
            (SELECT COUNT(DISTINCT email)::int FROM users) AS activated,
            (SELECT COUNT(DISTINCT u.email)::int FROM users u
               WHERE EXISTS (SELECT 1 FROM donors d WHERE d.org_id = u.org_id)) AS added_donor,
            (SELECT COUNT(DISTINCT u.email)::int FROM users u
               WHERE EXISTS (SELECT 1 FROM donations dn WHERE dn.org_id = u.org_id)) AS logged_donation,
            (SELECT COUNT(DISTINCT u.email)::int FROM users u
               WHERE EXISTS (SELECT 1 FROM outreach_log o WHERE o.org_id = u.org_id)) AS sent_outreach`,

      // ---- People ----
      // EVERY account, activated or not, with the state that matters: which org
      // (if any), how many donors that org has, and last-active. This is what
      // surfaces a signed-up-but-stalled user the org tables alone would hide.
      sql`SELECT a.email, a.name, a.provider, a.created_at, a.last_login,
                 u.org_id,
                 o.name AS org_name,
                 COALESCE((SELECT COUNT(*)::int FROM donors d WHERE d.org_id = u.org_id), 0) AS donors
          FROM accounts a
          LEFT JOIN LATERAL (
            SELECT org_id FROM users uu WHERE uu.email = a.email ORDER BY uu.created_at ASC LIMIT 1
          ) u ON true
          LEFT JOIN orgs o ON o.id = u.org_id
          ORDER BY a.created_at DESC
          LIMIT 100`,

      // ---- Event stream (soft — degrades to [] if not migrated yet) ----
      soft(sql`SELECT email, org_id, event, provider, created_at
               FROM events ORDER BY created_at DESC LIMIT 40`),

      soft(sql`SELECT event, COUNT(*)::int AS n FROM events
               WHERE created_at > NOW() - INTERVAL '30 days'
               GROUP BY event ORDER BY n DESC`),

      // Distinct active accounts per day (last 14d), zero-filled.
      soft(sql`SELECT to_char(d::date,'YYYY-MM-DD') AS day, COALESCE(c.n,0)::int AS n
               FROM generate_series(NOW()::date - 13, NOW()::date, INTERVAL '1 day') d
               LEFT JOIN (
                 SELECT created_at::date AS day, COUNT(DISTINCT email)::int AS n
                 FROM events WHERE email IS NOT NULL GROUP BY created_at::date
               ) c ON c.day = d::date
               ORDER BY day`),
    ]);

    // Enrich people with an owner flag server-side (client can't run the
    // domain-aware isOwnerEmail check), so owner/test accounts read clearly.
    const peopleEnriched = (people || []).map((p) => ({
      ...p,
      is_owner: isOwnerEmail(p.email),
      activated: !!p.org_id,
    }));

    return Response.json({
      generated_at: new Date().toISOString(),
      totals: totals[0],
      by_provider: byProvider,
      by_org_type: byOrgType,
      signups_by_day: signupsByDay,
      recent_signups: recentSignups,
      top_orgs: topOrgs,
      plan_mix: planMix,
      mailboxes: mailboxes[0],
      donations_30d: recentDonations[0]?.n ?? 0,
      activity: activity[0],
      funnel: funnel[0],
      people: peopleEnriched,
      event_feed: eventFeed,
      event_counts: eventCounts,
      active_by_day: activeByDay,
    });
  } catch (e) {
    console.error("GET /api/admin/stats error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

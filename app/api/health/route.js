// ============================================================
// /api/health — uptime probe + Neon keep-alive
//
// Two jobs:
//   1. Externally pingable health endpoint. Point UptimeRobot,
//      BetterUptime or Vercel Observability at it.
//   2. Wake Neon Postgres on a periodic cron so the branch does not
//      autosuspend and cause the first-user-of-the-morning to eat a
//      cold-start (Neon serverless suspends idle branches by default).
//
// Returns 200 with per-dependency status when configured deps are
// reachable, 503 when anything configured is failing. Public route (no
// auth required). If you register this on a Vercel cron (recommended
// hourly) the request also carries a CRON_SECRET header — we accept
// anonymous public probes AND cron pings the same way.
// ============================================================
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    app: "ok",
    db: "unknown",
    stripe: "unknown",
    resend: "unknown",
    ts: new Date().toISOString(),
  };

  // ----- DB (Neon Postgres): real round-trip so an idle branch wakes -----
  if (process.env.DATABASE_URL) {
    try {
      const sql = getDb();
      const rows = await sql`SELECT 1 AS ok`;
      checks.db = rows && rows[0] && rows[0].ok === 1 ? "ok" : "unexpected-response";
    } catch (e) {
      checks.db = `error:${String(e && e.message).slice(0, 80)}`;
    }
  } else {
    checks.db = "not-configured";
  }

  // ----- Stripe: env presence only (do not burn a live API call) -----
  checks.stripe = process.env.STRIPE_SECRET_KEY ? "configured" : "not-configured";

  // ----- Resend: env presence only -----
  checks.resend = process.env.RESEND_API_KEY ? "configured" : "not-configured";

  const failing = Object.values(checks).some(
    (v) => typeof v === "string" && v.startsWith("error:"),
  );

  return Response.json(checks, { status: failing ? 503 : 200 });
}

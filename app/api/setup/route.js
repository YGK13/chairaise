// ============================================================
// ChaiRaise — Database Schema Initialization Endpoint
// POST /api/setup — Creates all tables if they don't exist
// Protected: requires SETUP_SECRET or admin session
// ============================================================
import { initSchema } from "@/lib/db";

export async function POST(req) {
  try {
    // Hard-require SETUP_SECRET. The old code had a NODE_ENV=development
    // bypass so schema init could be triggered without a secret in dev.
    // Vercel preview builds don't set NODE_ENV=development so this was
    // technically limited to `next dev`, but it was still a footgun: any
    // fork or misconfigured preview that inherited NODE_ENV would expose
    // schema-init to the public. Remove the bypass; local dev sets
    // SETUP_SECRET in .env.local like everyone else.
    const setupSecret = (process.env.SETUP_SECRET || "").trim();
    if (!setupSecret) {
      console.error("[Setup] SETUP_SECRET is not set — refusing to init schema.");
      return Response.json(
        { error: "Setup secret not configured on server" },
        { status: 500 },
      );
    }

    const { secret } = await req.json().catch(() => ({}));
    if (!secret || secret !== setupSecret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await initSchema();
    return Response.json({ ...result, message: "All tables created successfully" });
  } catch (error) {
    console.error("Schema init error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

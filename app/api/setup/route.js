// ============================================================
// ChaiRaise — Database Schema Initialization Endpoint
// POST /api/setup — Creates all tables if they don't exist
// Protected: requires SETUP_SECRET or admin session
// ============================================================
import { initSchema } from "@/lib/db";

export async function POST(req) {
  try {
    // Simple protection — require a secret or be in development
    const { secret } = await req.json().catch(() => ({}));
    const isDevMode = process.env.NODE_ENV === "development";
    const isValidSecret = secret && secret === process.env.SETUP_SECRET;

    if (!isDevMode && !isValidSecret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await initSchema();
    return Response.json({ ...result, message: "All tables created successfully" });
  } catch (error) {
    console.error("Schema init error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

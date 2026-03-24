// ============================================================
// ChaiRaise — Single Donor API (Read, Update, Delete)
// GET    /api/donors/[id] — Get one donor
// PATCH  /api/donors/[id] — Update donor fields
// DELETE /api/donors/[id] — Remove donor
// ============================================================
import { getDb } from "@/lib/db";

// ---- GET: Single donor by ID ----
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const sql = getDb();
    const [donor] = await sql`SELECT * FROM donors WHERE id = ${id}`;
    if (!donor) return Response.json({ error: "Donor not found" }, { status: 404 });
    return Response.json({ donor });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ---- PATCH: Update donor fields ----
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const sql = getDb();

    // Build dynamic SET clause from provided fields
    // Only update fields that are explicitly provided
    const allowedFields = [
      "name", "email", "phone", "city", "tier", "community", "school",
      "industry", "foundation", "net_worth", "annual_giving", "giving_capacity",
      "warmth_score", "pipeline_stage", "custom_hook", "prior_gift_detail",
      "notes", "ai_brief", "cause_match_score", "engagement_score"
    ];
    const jsonFields = ["focus_areas", "tags"];

    // Build SET pairs — use individual queries for safety with template literals
    // Neon's sql`` doesn't support dynamic column names, so we use a controlled approach
    const updates = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    for (const key of jsonFields) {
      if (body[key] !== undefined) updates[key] = JSON.stringify(body[key]);
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // For Neon serverless, we build a safe UPDATE using known column names
    // Each field is checked against our allowlist above, preventing injection
    const setClauses = Object.entries(updates)
      .map(([key], i) => `${key} = $${i + 2}`)
      .join(", ");
    const values = [id, ...Object.values(updates)];

    const query = `UPDATE donors SET ${setClauses}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    const result = await sql.query(query, values);

    if (!result.length) return Response.json({ error: "Donor not found" }, { status: 404 });
    return Response.json({ donor: result[0] });
  } catch (error) {
    console.error("PATCH /api/donors/[id] error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ---- DELETE: Remove a donor ----
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const sql = getDb();
    const [donor] = await sql`DELETE FROM donors WHERE id = ${id} RETURNING id, name`;
    if (!donor) return Response.json({ error: "Donor not found" }, { status: 404 });
    return Response.json({ deleted: donor });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

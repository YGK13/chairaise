// ============================================================
// ChaiRaise — Organizations API
// GET  /api/orgs — List orgs for the current user
// POST /api/orgs — Register a new organization
// ============================================================
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

// ---- GET: List organizations ----
export async function GET(req) {
  try {
    const session = await auth();
    const sql = getDb();

    // If user is authenticated, return orgs they belong to
    if (session?.user?.email) {
      const orgs = await sql`
        SELECT o.* FROM orgs o
        JOIN users u ON u.org_id = o.id
        WHERE u.email = ${session.user.email}
        ORDER BY o.created_at DESC
      `;
      return Response.json({ orgs });
    }

    // Otherwise return public org list (limited info)
    const orgs = await sql`
      SELECT id, name, org_type, logo, verified FROM orgs
      WHERE verified = true
      ORDER BY name ASC LIMIT 50
    `;
    return Response.json({ orgs });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ---- POST: Register a new organization ----
export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name, website = "", org_type = "other", mission = "", ein = "",
      tagline = "", logo = ""
    } = body;

    if (!name) {
      return Response.json({ error: "Organization name is required" }, { status: 400 });
    }

    // Generate org ID from name
    const orgId = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

    const sql = getDb();

    // Check if org already exists
    const [existing] = await sql`SELECT id FROM orgs WHERE id = ${orgId}`;
    if (existing) {
      return Response.json({ error: "An organization with this ID already exists" }, { status: 409 });
    }

    // Determine logo initials
    const logoText = logo || name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

    // Determine verification based on email domain
    const emailDomain = session.user.email.split("@")[1];
    const genericDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com"];
    const hasOrgEmail = !genericDomains.includes(emailDomain);

    // Create the org
    const [org] = await sql`
      INSERT INTO orgs (id, name, tagline, logo, website, org_type, ein, mission, verified, verified_domain)
      VALUES (
        ${orgId}, ${name}, ${tagline}, ${logoText}, ${website}, ${org_type},
        ${ein}, ${mission}, ${hasOrgEmail}, ${hasOrgEmail ? emailDomain : ""}
      )
      RETURNING *
    `;

    // Create empty org profile for AI research
    await sql`
      INSERT INTO org_profiles (org_id)
      VALUES (${orgId})
      ON CONFLICT (org_id) DO NOTHING
    `;

    // Add the creating user as admin
    await sql`
      INSERT INTO users (org_id, name, email, role, auth_provider, last_login)
      VALUES (
        ${orgId}, ${session.user.name || session.user.email.split("@")[0]},
        ${session.user.email}, 'admin', ${session.user.provider || 'credentials'}, NOW()
      )
      ON CONFLICT (org_id, email) DO UPDATE SET role = 'admin', last_login = NOW()
    `;

    // Log the creation
    await sql`
      INSERT INTO audit_log (org_id, user_name, type, action, detail)
      VALUES (${orgId}, ${session.user.name || session.user.email}, 'system', 'Organization registered', ${name})
    `;

    return Response.json({ org }, { status: 201 });
  } catch (error) {
    console.error("POST /api/orgs error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

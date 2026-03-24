// ============================================================
// ChaiRaise — Neon Postgres Database Connection + Schema
// Single connection pool shared across all API routes
// ============================================================
import { neon } from "@neondatabase/serverless";

// Create a SQL template-tag function connected to our Neon database
// This is the recommended way to use @neondatabase/serverless in serverless environments
export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set. Add Neon Postgres via Vercel Marketplace.");
  }
  return neon(process.env.DATABASE_URL);
}

// ============================================================
// SCHEMA INITIALIZATION — Run once on first deploy
// Creates all tables if they don't exist
// ============================================================
export async function initSchema() {
  const sql = getDb();

  // ---- Organizations table ----
  await sql`
    CREATE TABLE IF NOT EXISTS orgs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tagline TEXT DEFAULT '',
      logo TEXT DEFAULT 'CR',
      accent_color TEXT DEFAULT '#f59e0b',
      currency TEXT DEFAULT 'USD',
      timezone TEXT DEFAULT 'America/New_York',
      website TEXT DEFAULT '',
      org_type TEXT DEFAULT '',
      ein TEXT DEFAULT '',
      mission TEXT DEFAULT '',
      verified BOOLEAN DEFAULT false,
      verified_at TIMESTAMPTZ,
      verified_domain TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // ---- Org AI profiles (mission research, talking points, etc.) ----
  await sql`
    CREATE TABLE IF NOT EXISTS org_profiles (
      org_id TEXT PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
      mission TEXT DEFAULT '',
      vision TEXT DEFAULT '',
      history TEXT DEFAULT '',
      key_programs JSONB DEFAULT '[]',
      target_demographics JSONB DEFAULT '[]',
      geographic_focus JSONB DEFAULT '[]',
      cause_keywords JSONB DEFAULT '[]',
      known_donors_public JSONB DEFAULT '[]',
      previous_campaigns JSONB DEFAULT '[]',
      org_strengths JSONB DEFAULT '[]',
      talking_points JSONB DEFAULT '[]',
      donor_deck_notes TEXT DEFAULT '',
      ai_research_date TIMESTAMPTZ,
      ai_research_raw TEXT DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // ---- Users table (replaces localStorage user management) ----
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT DEFAULT 'fundraiser' CHECK (role IN ('admin', 'manager', 'fundraiser', 'viewer')),
      avatar TEXT DEFAULT '',
      auth_provider TEXT DEFAULT 'credentials',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_login TIMESTAMPTZ,
      UNIQUE(org_id, email)
    )
  `;

  // ---- Donors table (core entity) ----
  await sql`
    CREATE TABLE IF NOT EXISTS donors (
      id SERIAL PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      city TEXT DEFAULT '',
      tier TEXT DEFAULT 'Tier 3' CHECK (tier IN ('Tier 1', 'Tier 2', 'Tier 3')),
      community TEXT DEFAULT '',
      school TEXT DEFAULT '',
      industry TEXT DEFAULT '',
      foundation TEXT DEFAULT '',
      net_worth BIGINT DEFAULT 0,
      annual_giving BIGINT DEFAULT 0,
      giving_capacity BIGINT DEFAULT 0,
      warmth_score INT DEFAULT 0 CHECK (warmth_score BETWEEN 0 AND 10),
      pipeline_stage TEXT DEFAULT 'not_started',
      focus_areas JSONB DEFAULT '[]',
      tags JSONB DEFAULT '[]',
      custom_hook TEXT DEFAULT '',
      prior_gift_detail TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      ai_brief TEXT DEFAULT '',
      cause_match_score INT DEFAULT 0,
      engagement_score INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // ---- Index for fast org-scoped donor lookups ----
  await sql`CREATE INDEX IF NOT EXISTS idx_donors_org ON donors(org_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_donors_tier ON donors(org_id, tier)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_donors_stage ON donors(org_id, pipeline_stage)`;

  // ---- Activities table ----
  await sql`
    CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      donor_id INT REFERENCES donors(id) ON DELETE CASCADE,
      user_id INT REFERENCES users(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      summary TEXT DEFAULT '',
      outcome TEXT DEFAULT '',
      date TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_activities_donor ON activities(donor_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_activities_org ON activities(org_id)`;

  // ---- Deals table ----
  await sql`
    CREATE TABLE IF NOT EXISTS deals (
      id SERIAL PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      donor_id INT REFERENCES donors(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      amount BIGINT DEFAULT 0,
      stage TEXT DEFAULT 'prospecting',
      probability INT DEFAULT 10,
      expected_close DATE,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // ---- Reminders table ----
  await sql`
    CREATE TABLE IF NOT EXISTS reminders (
      id SERIAL PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      donor_id INT REFERENCES donors(id) ON DELETE CASCADE,
      user_id INT REFERENCES users(id) ON DELETE SET NULL,
      summary TEXT NOT NULL,
      date DATE NOT NULL,
      done BOOLEAN DEFAULT false,
      rule_id TEXT DEFAULT '',
      type TEXT DEFAULT 'manual',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // ---- Outreach log (for AI learning loop) ----
  await sql`
    CREATE TABLE IF NOT EXISTS outreach_log (
      id SERIAL PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      donor_id INT REFERENCES donors(id) ON DELETE CASCADE,
      user_id INT REFERENCES users(id) ON DELETE SET NULL,
      channel TEXT DEFAULT '',
      template_id TEXT DEFAULT '',
      message TEXT DEFAULT '',
      outcome TEXT DEFAULT 'pending',
      response_time_days INT,
      date TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // ---- Campaigns table ----
  await sql`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT NOT NULL,
      org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      goal BIGINT DEFAULT 0,
      raised BIGINT DEFAULT 0,
      status TEXT DEFAULT 'active',
      start_date DATE,
      end_date DATE,
      description TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (id, org_id)
    )
  `;

  // ---- Audit log table ----
  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      user_name TEXT DEFAULT '',
      type TEXT DEFAULT 'action',
      action TEXT NOT NULL,
      detail TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(org_id)`;

  return { success: true };
}

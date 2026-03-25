// ============================================================
// ChaiRaise — Constants & Configuration
// Shared across all components. Single source of truth.
// ============================================================

// ============================================================
// EMAIL TEMPLATES — org-generic with merge fields
// ============================================================
export const DEFAULT_TEMPLATES = [
  { id: "T-A", name: "Alumni Connection", segment: "School/University Alumni", subject: "{First} — {School} Connection → {OrgName}", hooks: "{School}, {Prior_Gift}, {Mutual_Connection}" },
  { id: "T-B", name: "Synagogue Connection", segment: "Synagogue/Shul Members", subject: "{First} — {Synagogue} → {OrgName} Initiative", hooks: "{Synagogue}, {Rabbi_Name}, {Community_Focus}" },
  { id: "T-C", name: "Prior Giver / Federation", segment: "UJA/Federation/Prior donors", subject: "{First} — Your Impact → {OrgName}", hooks: "{Prior_Gift_Detail}, {Custom_Hook}, Federation connection" },
  { id: "T-D", name: "Family Legacy", segment: "Multi-generational families", subject: "{First} — {Family} Legacy → {OrgName}'s Future", hooks: "{Family}, {Known_Gift}, {Business_Parallel}" },
  { id: "T-E", name: "Cold HNWI (Fallback)", segment: "Unknown/minimal intel", subject: "{First} — {OrgName}: Making an Impact", hooks: "Minimal personalization, rely on mission strength" },
  { id: "T-F", name: "Community / Cultural", segment: "Community-based donors", subject: "{First} — {Community} Legacy → {OrgName}", hooks: "{Community}, {Synagogue}, cultural heritage" },
];

export const DEFAULT_COMMUNITY_MAP = {};

// ============================================================
// PIPELINE STAGES — 10-stage fundraising pipeline
// ============================================================
export const STAGES = [
  { id: "not_started", label: "Not Started", color: "#52525b", order: 0 },
  { id: "researching", label: "Researching", color: "#3b82f6", order: 1 },
  { id: "intro_requested", label: "Intro Requested", color: "#06b6d4", order: 2 },
  { id: "email_drafted", label: "Email Drafted", color: "#8b5cf6", order: 3 },
  { id: "email_sent", label: "Email Sent", color: "#f59e0b", order: 4 },
  { id: "responded", label: "Responded", color: "#10b981", order: 5 },
  { id: "meeting_scheduled", label: "Meeting Set", color: "#f97316", order: 6 },
  { id: "meeting_held", label: "Meeting Held", color: "#ec4899", order: 7 },
  { id: "proposal_sent", label: "Proposal Sent", color: "#a855f7", order: 8 },
  { id: "commitment", label: "Commitment", color: "#22c55e", order: 9 },
];

// ============================================================
// TIER CONFIGURATION
// ============================================================
export const TIERS = {
  "Tier 1": { label: "T1", cls: "t1" },
  "Tier 2": { label: "T2", cls: "t2" },
  "Tier 3": { label: "T3", cls: "t3" },
};

// ============================================================
// NAVIGATION — streamlined to 11 core items
// ============================================================
export const NAV = [
  { id: "dashboard", icon: "\u{1F4CA}", label: "Dashboard" },
  { id: "donors", icon: "\u{1F465}", label: "Donors" },
  { id: "campaigns", icon: "\u{1F3AF}", label: "Campaigns" },
  { id: "network", icon: "\u{1F578}\uFE0F", label: "Network" },
  { id: "outreach", icon: "\u{1F9E0}", label: "Outreach" },
  { id: "deals", icon: "\u{1F48E}", label: "Deals" },
  { id: "reminders", icon: "\u{1F514}", label: "Reminders" },
  { id: "analytics", icon: "\u{1F4C8}", label: "Analytics" },
  { id: "integrations", icon: "\u{1F50C}", label: "Integrations" },
  { id: "admin", icon: "\u{1F3E2}", label: "Admin" },
  { id: "settings", icon: "\u2699\uFE0F", label: "Settings" },
];

// ============================================================
// DONOR FIELD SCHEMA — drives Add/Edit forms & inline editing
// ============================================================
export const DONOR_FIELDS = [
  { key: "name", label: "Full Name", type: "text", required: true, group: "basic" },
  { key: "email", label: "Email", type: "email", group: "basic" },
  { key: "phone", label: "Phone", type: "tel", group: "basic" },
  { key: "city", label: "City", type: "text", group: "basic" },
  { key: "tier", label: "Tier", type: "select", options: ["Tier 1", "Tier 2", "Tier 3"], group: "basic" },
  { key: "community", label: "Community / Synagogue", type: "text", group: "affiliation" },
  { key: "school", label: "School / Alumni", type: "text", group: "affiliation" },
  { key: "industry", label: "Industry", type: "text", group: "affiliation" },
  { key: "foundation", label: "Foundation", type: "text", group: "affiliation" },
  { key: "net_worth", label: "Net Worth ($)", type: "number", group: "financial" },
  { key: "annual_giving", label: "Annual Giving ($)", type: "number", group: "financial" },
  { key: "giving_capacity", label: "Giving Capacity ($)", type: "number", group: "financial" },
  { key: "warmth_score", label: "Warmth (0-10)", type: "number", min: 0, max: 10, group: "engagement" },
  { key: "pipeline_stage", label: "Pipeline Stage", type: "select", options: STAGES.map(s => s.id), optionLabels: STAGES.map(s => s.label), group: "engagement" },
  { key: "focus_areas", label: "Focus Areas (comma-sep)", type: "tags", group: "engagement" },
  { key: "custom_hook", label: "Custom Hook", type: "textarea", group: "intel" },
  { key: "prior_gift_detail", label: "Prior Gift Detail", type: "textarea", group: "intel" },
  { key: "notes", label: "Additional Notes", type: "textarea", group: "intel" },
];

export const FIELD_GROUPS = [
  { id: "basic", label: "Basic Info" },
  { id: "affiliation", label: "Affiliations" },
  { id: "financial", label: "Financial" },
  { id: "engagement", label: "Engagement" },
  { id: "intel", label: "Intelligence" },
];

// ============================================================
// ACTIVITY TYPES — for the Activity Logger
// ============================================================
export const ACT_TYPES = [
  { id: "call", icon: "📞", label: "Call", color: "var(--green)" },
  { id: "meeting", icon: "🤝", label: "Meeting", color: "var(--accent)" },
  { id: "email", icon: "✉️", label: "Email", color: "var(--blue)" },
  { id: "note", icon: "📝", label: "Note", color: "var(--purple)" },
  { id: "whatsapp", icon: "💬", label: "WhatsApp", color: "var(--cyan)" },
  { id: "stage_change", icon: "📈", label: "Stage Change", color: "var(--orange)" },
  { id: "research", icon: "🔍", label: "Research", color: "var(--text3)" },
  { id: "gift", icon: "🎁", label: "Gift Received", color: "var(--green)" },
];

// ============================================================
// ORG TYPES — available during onboarding
// ============================================================
export const ORG_TYPES = [
  { id: "yeshiva", label: "Yeshiva / Seminary", icon: "📖" },
  { id: "synagogue", label: "Synagogue / Shul", icon: "🕍" },
  { id: "day_school", label: "Day School / Education", icon: "🏫" },
  { id: "chesed", label: "Chesed / Social Services", icon: "🤲" },
  { id: "federation", label: "Federation / Umbrella Org", icon: "🏛️" },
  { id: "hospital", label: "Hospital / Medical", icon: "🏥" },
  { id: "israel_org", label: "Israel Organization", icon: "🇮🇱" },
  { id: "camp", label: "Camp / Youth", icon: "⛺" },
  { id: "advocacy", label: "Advocacy / Policy", icon: "📢" },
  { id: "other", label: "Other Nonprofit", icon: "🌐" },
];

// ============================================================
// DEFAULT ORG — shown before user completes onboarding
// ============================================================
export const DEFAULT_ORG = {
  id: "chairaise_default",
  name: "ChaiRaise",
  tagline: "AI-Native Fundraising CRM",
  logo: "CR",
  accentColor: "#f59e0b",
  currency: "USD",
  timezone: "America/New_York",
  website: "",
  org_type: "",
  ein: "",
  mission: "",
  created: new Date().toISOString(),
};

// ============================================================
// ORG INTELLIGENCE PROFILE — AI-researched context
// ============================================================
export const EMPTY_ORG_PROFILE = {
  mission: "", vision: "", history: "",
  key_programs: [], target_demographics: [], geographic_focus: [],
  cause_keywords: [], known_donors_public: [], previous_campaigns: [],
  org_strengths: [], talking_points: [], donor_deck_notes: "",
  ai_research_date: "", ai_research_raw: "",
};

// ============================================================
// ROLES — RBAC for multi-user access
// ============================================================
export const ROLES = [
  { id: "admin", label: "Admin", icon: "👑", desc: "Full access, user management", perms: ["all"] },
  { id: "manager", label: "Manager", icon: "📊", desc: "Donors, campaigns, analytics", perms: ["donors", "campaigns", "analytics", "deals", "network", "outreach", "reports"] },
  { id: "fundraiser", label: "Fundraiser", icon: "✉️", desc: "Donors, outreach, email", perms: ["donors", "outreach", "email", "deals", "reminders", "whatsapp"] },
  { id: "viewer", label: "Viewer", icon: "👁️", desc: "Read-only dashboard access", perms: ["dashboard", "analytics"] },
];

// ============================================================
// TAG COLORS — for donor segmentation
// ============================================================
export const TAG_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#ef4444", "#22c55e", "#a855f7"];

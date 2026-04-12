// ============================================================
// ChaiRaise — AI Engine
// Unified AI caller, org research, cause matching, scoring
// ============================================================

import { STAGES, DEFAULT_COMMUNITY_MAP, EMPTY_ORG_PROFILE } from "./constants";
import { fmt$, getOrgCommunityMap } from "./storage";

// ============================================================
// UNIFIED AI CALLER — routes through /api/ai (keys stay server-side)
// ============================================================
export const callAI = async (prompt, provider = "anthropic", _anthropicKey, _pplxKey) => {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, provider, max_tokens: 1024 }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error + (data.hint ? " — " + data.hint : ""));
  return data.result || "";
};

// ============================================================
// ORG INTELLIGENCE — AI-driven deep research for any organization
// ============================================================
export const aiResearchOrg = async (orgName, website, orgType, manualMission, provider, anthropicKey, pplxKey) => {
  const prompt = `You are an expert nonprofit research analyst. Research the following organization and return a comprehensive profile for fundraising CRM use.

Organization: ${orgName}
Website: ${website || "Not provided"}
Type: ${orgType || "nonprofit"}
${manualMission ? `Mission (user-provided): ${manualMission}` : ""}

Return a JSON object (and ONLY valid JSON, no markdown) with these exact keys:
{
  "mission": "1-3 sentence mission statement (use provided or research)",
  "vision": "1-2 sentence aspirational vision",
  "history": "2-3 sentences on founding, milestones, growth",
  "key_programs": ["program1", "program2", "program3"],
  "target_demographics": ["demographic1", "demographic2"],
  "geographic_focus": ["city1", "region1", "country1"],
  "cause_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "known_donors_public": ["Name1 - context", "Name2 - context"],
  "previous_campaigns": ["Campaign1 - amount/year", "Campaign2"],
  "org_strengths": ["strength1", "strength2", "strength3"],
  "talking_points": ["point1 for donor outreach", "point2", "point3"],
  "donor_deck_notes": "Summary of key talking points for a donor deck"
}

Be specific and factual. If you cannot find information on a field, provide reasonable inferences based on the org type and name. For cause_keywords, extract the 5-10 most important keywords that describe what this organization does — these will be used for matching donors by interest area. For known_donors_public, only include information that is publicly available (e.g., from IRS 990 filings, public donor walls, press releases). If uncertain, say "No public data found."`;

  const result = await callAI(prompt, provider, anthropicKey, pplxKey);
  let cleaned = result.trim();
  if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  try {
    const parsed = JSON.parse(cleaned);
    return { ...EMPTY_ORG_PROFILE, ...parsed, ai_research_date: new Date().toISOString(), ai_research_raw: result };
  } catch (e) {
    console.warn("AI research JSON parse failed:", e.message);
    return { ...EMPTY_ORG_PROFILE, mission: manualMission || "", ai_research_date: new Date().toISOString(), ai_research_raw: result, donor_deck_notes: "AI returned unstructured response — see raw data" };
  }
};

// ============================================================
// CAUSE MATCH — keyword overlap between donor and org profile
// ============================================================
export const causeMatch = (donor, orgProfile) => {
  if (!orgProfile) return 0;
  const donorTerms = new Set([
    ...(donor.focus_areas || []).map(t => t.toLowerCase().trim()),
    ...(donor.community || "").toLowerCase().split(/[\s,;/]+/).filter(w => w.length > 3),
    ...(donor.industry || "").toLowerCase().split(/[\s,;/]+/).filter(w => w.length > 3),
    (donor.city || "").toLowerCase(),
  ].filter(Boolean));
  const orgTerms = new Set([
    ...(orgProfile.cause_keywords || []).map(t => t.toLowerCase().trim()),
    ...(orgProfile.target_demographics || []).map(t => t.toLowerCase().trim()),
    ...(orgProfile.geographic_focus || []).map(t => t.toLowerCase().trim()),
  ].filter(Boolean));
  if (!donorTerms.size || !orgTerms.size) return 0;
  let matches = 0;
  donorTerms.forEach(dt => { orgTerms.forEach(ot => { if (dt.includes(ot) || ot.includes(dt)) matches++ }) });
  return Math.min(Math.round((matches / Math.max(orgTerms.size, 1)) * 100), 100);
};

// ============================================================
// AI-GENERATED DONOR BRIEF — nexus between donor and org
// ============================================================
export const aiGenerateBrief = async (donor, orgProfile, org, provider, anthropicKey, pplxKey) => {
  const prompt = `Write a 3-5 sentence brief about why ${donor.name} is a good fit as a donor for ${org.name}.

Donor: ${donor.name}, ${donor.community || "community unknown"}, ${donor.industry || "industry unknown"}, ${donor.city || ""}.
Focus areas: ${(donor.focus_areas || []).join(", ") || "unknown"}.
Net worth: ${fmt$(donor.net_worth)}. Annual giving: ${fmt$(donor.annual_giving)}.

Organization mission: ${orgProfile.mission || org.tagline || ""}
Cause keywords: ${(orgProfile.cause_keywords || []).join(", ")}
Key programs: ${(orgProfile.key_programs || []).join(", ")}

Be specific about connection points. Mention shared values, geographic ties, community overlap, or professional relevance. Be warm but data-driven.`;
  return await callAI(prompt, provider, anthropicKey, pplxKey);
};

// ============================================================
// TEMPLATE CLASSIFICATION — which email template fits this donor
// ============================================================
export const aiTemplate = (d) => {
  if (!d) return "T-E";
  const c = (d.community || d.synagogue || "").toLowerCase();
  const cMap = typeof window !== "undefined" ? getOrgCommunityMap() : DEFAULT_COMMUNITY_MAP;
  for (const [k, t] of Object.entries(cMap)) if (c.includes(k.toLowerCase())) return t;
  if (d.school) return "T-A";
  if (c.includes("synagogue") || c.includes("shul") || c.includes("temple")) return "T-B";
  if (d.prior_gift_detail || c.includes("federation") || c.includes("uja")) return "T-C";
  if (d.family_legacy || (d.net_worth && parseInt(d.net_worth) > 50000000)) return "T-D";
  if (/sephardi|persian|mizrach|community/i.test(c)) return "T-F";
  return "T-E";
};

// ============================================================
// ENGAGEMENT SCORE — 0-100 based on data completeness + activity
// ============================================================
export const aiScore = (d, acts = []) => {
  let s = 0;
  if (d.email) s += 8; if (d.phone) s += 5; if (d.net_worth) s += 5; if (d.community || d.synagogue) s += 4;
  if (d.connector_paths?.length) s += 8;
  s += parseInt(d.warmth_score || d.warmth || 0) * 3;
  const da = acts.filter(a => a.did === (d.id || d.name));
  if (da.length > 0) {
    s += Math.min(da.length * 3, 12);
    const latest = da.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const days = (Date.now() - new Date(latest.date)) / 864e5;
    if (days < 7) s += 8; else if (days < 30) s += 5; else if (days < 90) s += 2;
  }
  s += STAGES.findIndex(st => st.id === (d.pipeline_stage || "not_started")) * 2;
  return Math.min(s, 100);
};

// ============================================================
// CONVERSION LIKELIHOOD — based on engagement + pipeline stage
// ============================================================
export const aiLikelihood = (eng, d) => {
  const si = STAGES.findIndex(s => s.id === (d.pipeline_stage || "not_started"));
  if (si >= 8) return { l: "Very High", c: "#22c55e" };
  if (si >= 6 || eng >= 70) return { l: "High", c: "#10b981" };
  if (si >= 3 || eng >= 40) return { l: "Medium", c: "#f59e0b" };
  return { l: "Low", c: "#71717a" };
};

// ============================================================
// ASK AMOUNT — recommended gift size based on net worth + history
// Rounds to nearest chai multiple ($18) for cultural alignment
// ============================================================
export const roundToChai = (amount) => {
  // Round to nearest chai multiple ($18)
  return Math.round(amount / 18) * 18;
};

export const CHAI_AMOUNTS = [18, 36, 54, 72, 90, 180, 360, 540, 1800, 3600, 5400, 10800, 18000, 36000, 54000];

export const aiAsk = (d) => {
  const nw = parseInt(d.net_worth || 0), pg = parseInt(d.annual_giving || d.prior_gift || 0);
  let base;
  if (pg > 0) base = Math.max(pg * 1.5, 25000);
  else if (nw >= 1e8) base = 100000;
  else if (nw >= 5e7) base = 75000;
  else if (nw >= 1e7) base = 50000;
  else if (nw >= 5e6) base = 25000;
  else base = 18000;
  return roundToChai(base);
};

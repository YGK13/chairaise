// ============================================================
// ChaiRaise — server-owned AI tasks
// Prompts for the core drafting workflow live here, on the server, instead of
// being assembled in the browser. That gives us one versioned prompt, a
// cacheable system block per org, a structured {subject, body} result, and a
// place to enforce the rules donors actually care about (no invented facts,
// no wealth talk, one clear ask).
// Pure module: no DB, no network, no browser APIs — safe to unit test.
// ============================================================
import { STAGES } from "./constants";

export const DRAFT_EMAIL_PROMPT_VERSION = "draft_email/v1";
export const AI_TASKS = ["draft_email"];

// ------------------------------------------------------------
// Input hygiene — every field is clipped so a hostile or huge record cannot
// blow up the prompt or smuggle in pages of text.
// ------------------------------------------------------------
const clip = (v, max = 200) => {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
};
const clipList = (v, maxItems = 8, maxLen = 120) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,;]/) : [])
    .map((x) => clip(typeof x === "object" && x ? x.name || x.label || "" : x, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);

// ------------------------------------------------------------
// What the email is FOR depends on where the donor is in the pipeline.
// A first-touch email and a post-meeting thank-you are different letters;
// sending the same "let's meet" email to someone who already committed is
// the fastest way to look like a mail-merge.
// ------------------------------------------------------------
export const STAGE_GOALS = {
  not_started: "First contact. Introduce the organization through the donor's likely connection to it and ask for a short (15–20 minute) conversation.",
  researching: "First contact. Introduce the organization through the donor's likely connection to it and ask for a short (15–20 minute) conversation.",
  intro_requested: "First contact following a pending introduction. Reference the mutual connection if one is listed, and ask for a short conversation.",
  email_drafted: "First contact. Introduce the organization through the donor's likely connection to it and ask for a short (15–20 minute) conversation.",
  email_sent: "Polite follow-up to an earlier email that has had no reply. Short (under 120 words), no guilt, add one new reason to talk, and make replying easy.",
  responded: "The donor has replied. Thank them warmly and propose two or three concrete times (or ask for theirs) to meet.",
  meeting_scheduled: "Confirm the upcoming meeting, say briefly what you will share, and ask if there is anything they would like covered.",
  meeting_held: "Thank-you after a meeting. Recall one thing the donor cared about, share the promised follow-up, and propose the next step.",
  proposal_sent: "Follow-up on a proposal already sent. Offer to answer questions, restate the impact in one sentence, and suggest a short call.",
  commitment: "Stewardship. Thank the donor sincerely for their commitment and tell them concretely what their gift will make possible. Do not ask for anything.",
};
export const stageGoal = (stageId) => STAGE_GOALS[stageId] || STAGE_GOALS.not_started;

// ------------------------------------------------------------
// Static guidelines. Byte-stable across every request (no dates, no ids), so
// together with the per-org block below it forms a cacheable prefix.
// ------------------------------------------------------------
export const DRAFT_EMAIL_SYSTEM = `You are a senior major-gifts officer and fundraising copywriter who writes outreach for Jewish and mission-driven nonprofits: synagogues, yeshivas, day schools, federations, and community organizations. You write on behalf of a real person at the organization, to a real prospective or current donor. Your drafts are reviewed and edited by that person before anything is sent.

What a great donor email does:
- Opens with the donor, not the organization. The first sentence should show why this person, specifically, is hearing from us: a shared community, school, synagogue, city, cause, family history, or a mutual connection named in the donor record.
- Tells one concrete, human-scale story or fact about the organization's work that fits the donor's interests. One vivid detail beats three adjectives.
- Makes exactly one clear, low-friction ask that matches the stated goal for this email (usually a short conversation, not money).
- Sounds like a person: warm, direct, respectful of the reader's time. Short paragraphs. No marketing clichés ("exciting opportunity", "make a difference", "don't miss out"), no exclamation-mark enthusiasm, no emoji.
- Respects Jewish communal norms. Hebrew or Yiddish terms (tzedakah, chesed, kehillah, l'dor vador) are welcome only when they fit the organization and the donor's community; never force them. Never assume a donor's level of observance.

Hard rules — these protect the organization's reputation:
1. Use ONLY facts present in the donor record and organization profile you are given. Never invent names, titles, relationships, gift history, statistics, program results, dates, or quotes. If a detail would help but is missing, write around it rather than making it up.
2. Never mention or allude to the donor's net worth, wealth, capacity, or giving history amounts, and never name a dollar figure unless the stated goal explicitly calls for one.
3. Only name a mutual connection if that person appears in the donor record's connectors. Do not claim a prior relationship that the record does not show.
4. Do not include placeholders like [Name] or {Program}, except the specific merge fields you are explicitly told to use for a batch template.
5. Do not include a signature block with invented phone numbers, titles, or addresses. Sign off with the sender name you are given.
6. Plain text only. No markdown, no bullet points, no headings, no HTML.

Subject lines: under 60 characters, specific to the donor or the shared connection, no clickbait, no ALL CAPS, no emoji. A good subject reads like a note from a colleague ("Beth Shalom and our new teen program"), not a campaign ("Support Our Mission Today!").

Segment guidance (use the one that matches the segment you are given):
- Alumni: lead with the shared school and what has changed or grown since the donor's time there.
- Synagogue members: lead with the shared kehillah or rabbi; keep it neighborly, not institutional.
- Prior givers / federation donors: acknowledge their past involvement in general terms (never amounts) and show what continued involvement makes possible now.
- Family legacy: speak to continuity across generations and what the family's name has stood for, only as far as the record supports.
- Cold / minimal information: be brief and honest that you are reaching out for the first time; let the mission and one specific program carry the email.
- Community / cultural: lead with the shared heritage or community, and how the organization serves it.

Weak vs. strong openings (illustrative only; never reuse these words or facts):
- Weak: "I hope this email finds you well. I am reaching out on behalf of our organization, which does amazing work."
- Strong: "Rabbi Stein mentioned you have been involved with the Maple Street day school for years, so I wanted to tell you about the new after-school beit midrash we opened for its graduates."

Illustrative example of a first-contact email for a fictional organization (for tone and structure only; do not copy its facts):
{"subject": "Maple Street grads and our new beit midrash", "body": "Dear Sarah,\\n\\nRabbi Stein mentioned that you and your husband have been part of the Maple Street community for many years, so I wanted to reach out personally.\\n\\nThis fall we opened an after-school beit midrash for Maple Street graduates. Twenty-two tenth graders now learn there three evenings a week, many of them paired with a college-age mentor.\\n\\nI would love to tell you more about where the program is headed and hear what matters most to you in Jewish education. Would you have 20 minutes for a call or coffee in the next couple of weeks?\\n\\nWith warm regards,\\nDaniel Adler, Riverside Torah Center"}

Length: follow the length given for this email. When unsure, 120–200 words for a body is right; shorter is better than longer.

Output format: return ONLY a JSON object, with no code fences and no commentary before or after it, in exactly this shape:
{"subject": "the subject line", "body": "the full email body, with paragraphs separated by \\n\\n"}`;

/** Per-org context block — identical for every donor in the same org, so it caches. */
export function orgContextBlock(org = {}, profile = {}) {
  const lines = [`ORGANIZATION`, `Name: ${clip(org.name, 120) || "Our organization"}`];
  const tagline = clip(org.tagline, 200);
  if (tagline) lines.push(`Tagline: ${tagline}`);
  const mission = clip(profile.mission, 600);
  if (mission) lines.push(`Mission: ${mission}`);
  const vision = clip(profile.vision, 300);
  if (vision) lines.push(`Vision: ${vision}`);
  const programs = clipList(profile.key_programs);
  if (programs.length) lines.push(`Key programs: ${programs.join("; ")}`);
  const who = clipList(profile.target_demographics);
  if (who.length) lines.push(`Who we serve: ${who.join("; ")}`);
  const geo = clipList(profile.geographic_focus);
  if (geo.length) lines.push(`Where: ${geo.join("; ")}`);
  const strengths = clipList(profile.org_strengths, 6, 200);
  if (strengths.length) lines.push(`Strengths: ${strengths.join("; ")}`);
  const points = clipList(profile.talking_points, 6, 240);
  if (points.length) lines.push(`Approved talking points: ${points.join("; ")}`);
  if (!mission && !programs.length && !points.length) {
    lines.push(`(No detailed profile yet. Keep claims about the organization general and modest; do not invent programs or results.)`);
  }
  return lines.join("\n");
}

/** Donor facts the model may use. Wealth fields are deliberately left out. */
export function donorFacts(donor = {}) {
  const lines = [];
  const add = (label, v, max) => { const s = clip(v, max); if (s) lines.push(`${label}: ${s}`); };
  add("Name", donor.name, 120);
  add("Community / synagogue", donor.community || donor.synagogue, 160);
  add("School", donor.school, 160);
  add("City", donor.city, 80);
  add("Industry", donor.industry, 120);
  add("Family foundation", donor.foundation, 160);
  const focus = clipList(donor.focus_areas);
  if (focus.length) lines.push(`Interests: ${focus.join(", ")}`);
  const connectors = (Array.isArray(donor.connector_paths) ? donor.connector_paths : [])
    .map((c) => (c && typeof c === "object" ? [clip(c.name, 80), clip(c.role, 80)].filter(Boolean).join(" — ") : clip(c, 120)))
    .filter(Boolean).slice(0, 4);
  if (connectors.length) lines.push(`Mutual connections (may be named): ${connectors.join("; ")}`);
  add("Personal hook (from our notes)", donor.custom_hook, 300);
  add("Prior involvement (from our notes)", donor.prior_gift_detail, 300);
  add("Family legacy (from our notes)", donor.family_legacy, 300);
  return lines;
}

/**
 * Build the Messages API payload pieces for a donor email draft.
 * mode "single": one donor, fully personalized.
 * mode "batch":  one reusable template with {name}, {community}, {city} merge fields.
 */
export function buildDraftEmailRequest({ donor = {}, org = {}, orgProfile = {}, template = {}, recentActivity = [], mode = "single", senderName = "" } = {}) {
  const system = [
    { type: "text", text: DRAFT_EMAIL_SYSTEM },
    { type: "text", text: orgContextBlock(org, orgProfile), cache_control: { type: "ephemeral" } },
  ];

  const orgName = clip(org.name, 120) || "our organization";
  const signer = clip(senderName, 80);
  const signOff = signer ? `${signer}, ${orgName}` : `The ${orgName} team`;
  const tmpl = [clip(template.name, 80), clip(template.segment, 120)].filter(Boolean).join(" — ");
  const hooks = clip(template.hooks, 200);

  const parts = [];
  if (mode === "batch") {
    parts.push(
      `TASK: Write one reusable outreach email template that will be personalized by mail merge and sent to many donors in this segment.`,
      tmpl ? `Segment: ${tmpl}` : "",
      hooks ? `Angles that tend to work for this segment: ${hooks}` : "",
      `Goal: ${STAGE_GOALS.not_started}`,
      `Use these merge fields and no others: {name} (the donor's first name, use it in the greeting), {community}, {city}. Use {community} and {city} only where the sentence still reads naturally if the value is generic. The subject may use {name}.`,
      `Length: 130–180 words.`,
      `Sign off as: ${signOff}`,
    );
  } else {
    const stageId = clip(donor.pipeline_stage, 40) || "not_started";
    const stage = STAGES.find((s) => s.id === stageId);
    parts.push(
      `TASK: Write a personal email from ${signOff} to this donor.`,
      `Pipeline stage: ${stage ? stage.label : "Not Started"}`,
      `Goal of this email: ${stageGoal(stageId)}`,
      tmpl ? `Donor segment: ${tmpl}` : "",
      hooks ? `Angles that tend to work for this segment: ${hooks}` : "",
      ``,
      `DONOR RECORD`,
      ...donorFacts(donor),
    );
    const acts = (Array.isArray(recentActivity) ? recentActivity : []).map((a) => clip(a, 200)).filter(Boolean).slice(0, 5);
    if (acts.length) parts.push(``, `RECENT HISTORY WITH THIS DONOR (most recent first; do not repeat it back verbatim)`, ...acts.map((a) => `- ${a}`));
    parts.push(``, `Greet the donor by first name. Length: ${stageId === "email_sent" ? "60–120" : "120–200"} words.`, `Sign off as: ${signOff}`);
  }

  return {
    system,
    messages: [{ role: "user", content: parts.filter((p) => p !== "").join("\n") }],
  };
}

/**
 * Turn the model's reply into {subject, body}. Tolerates code fences, leading
 * chatter, and a plain "Subject: ..." fallback so a formatting slip never
 * loses the draft.
 */
export function parseDraft(text) {
  const raw = String(text || "").trim();
  if (!raw) return { subject: "", body: "" };
  const unfenced = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(unfenced.slice(start, end + 1));
      if (obj && typeof obj.body === "string") {
        return { subject: clip(obj.subject, 150), body: obj.body.trim() };
      }
    } catch { /* fall through to plain-text parsing */ }
  }
  const m = unfenced.match(/^\s*subject\s*:\s*(.+)\n+([\s\S]*)$/i);
  if (m) return { subject: clip(m[1], 150), body: m[2].trim() };
  return { subject: "", body: unfenced };
}

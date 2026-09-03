// ============================================================
// ChaiRaise — Public marketing surface: single source of truth
//
// Everything the public site says about the product lives here so the
// homepage, the JSON-LD, the sitemap, llms.txt and the tests can never drift
// apart. Pricing is DERIVED from lib/plan.js (what we sell is what the server
// enforces). Every claim below maps to something implemented in this repo.
// ============================================================
import { PLANS } from "@/lib/plan";
import { POSTS } from "@/content/blog/posts";

export const SITE = {
  name: "ChaiRaise",
  url: "https://chairaise.com",
  tagline: "Donor letters, appeals and outreach drafted in minutes",
  // One-sentence value prop: who + outcome + proof.
  valueProp:
    "ChaiRaise is the AI fundraising copilot and donor CRM for nonprofits and Jewish community organizations: it drafts personalized donor letters, appeals and outreach from your own donor records, suggests the ask, and tracks every relationship through a 10-stage pipeline.",
  description:
    "AI fundraising copilot and donor CRM for nonprofits. Donor letters, appeals and outreach drafted in minutes, with suggested asks. Free for 100 donors.",
  contactEmail: "hello@chairaise.com",
  lastUpdated: "2026-09-02",
  launched: "2026-03",
  category: "Nonprofit fundraising software",
  publisher: {
    name: "Portfolio Leverage Company",
    alternateName: "PortLev",
    url: "https://portlev.com",
  },
  author: {
    name: "Yuri Kruman",
    url: "https://yurikruman.com",
    jobTitle: "Founder",
    sameAs: [
      "https://www.linkedin.com/in/yurikruman/",
      "https://yurikruman.com",
      "https://portlev.com",
      "https://substack.com/@commanderinchief",
      "https://leveragebrief.beehiiv.com",
    ],
  },
  newsletter: {
    name: "The Leverage Brief",
    url: "https://leveragebrief.beehiiv.com/subscribe",
    dripId: "chairaise-brief",
  },
};

// Sister products for the "A PortLev build" footer strip.
export const SISTER_LINKS = [
  { name: "PortLev", url: "https://portlev.com" },
  { name: "Yuri Kruman", url: "https://yurikruman.com" },
  { name: "AI HR Pilot", url: "https://aihrpilot.com" },
  { name: "DueDrill", url: "https://duedrill.com" },
  { name: "BookToCourse.AI", url: "https://booktocourse.ai" },
  { name: "Career Beast Mode", url: "https://careerbeastmode.com" },
  { name: "Commander-in-Chief AI", url: "https://commanderinchief.ai" },
  { name: "I9Drill", url: "https://i9drill.com" },
  { name: "AI Wage Gap", url: "https://aiwagegap.com" },
  { name: "AI Build Gap", url: "https://aibuildgap.com" },
  { name: "PortLev Academy", url: "https://learn.portlev.com" },
  { name: "PortLev Labs", url: "https://apps.portlev.com" },
  { name: "The Leverage Brief", url: "https://leveragebrief.beehiiv.com" },
];

// ---- Pricing: derived from the enforced plan ladder ----
const money = (n) => (n === 0 ? "Free" : n == null ? "Custom" : `$${n}`);

export const PRICING = [
  {
    id: "starter",
    name: PLANS.starter.label,
    price: money(PLANS.starter.price),
    per: "",
    note: "Forever. No credit card.",
    desc: "For one fundraiser getting the first letters out the door.",
    feats: [
      `Up to ${PLANS.starter.limits.donors} donors`,
      "AI donor letters and emails (6 templates)",
      "10-stage pipeline and Kanban board",
      "CSV import and export",
      `${PLANS.starter.limits.seats} team member`,
    ],
    cta: "Start free",
    href: "/auth/signin",
    highlight: false,
  },
  {
    id: "pro",
    name: PLANS.pro.label,
    price: money(PLANS.pro.price),
    per: "/mo",
    note: "Billed annually. 14-day free trial.",
    desc: "For development directors running a real campaign.",
    feats: [
      "Unlimited donors",
      "AI org research and donor briefs",
      "Cause-match scoring and suggested asks",
      "Outreach strategy coach",
      "Batch campaigns (50 donors at once)",
      "Social graph and warm-intro paths",
      "Platform integrations",
      `${PLANS.pro.limits.seats} team members`,
      "Priority support",
    ],
    cta: "Start 14-day trial",
    href: "/auth/signin?upgrade=1",
    highlight: true,
  },
  {
    id: "enterprise",
    name: PLANS.enterprise.label,
    price: money(PLANS.enterprise.price),
    per: "",
    note: "Federations, umbrella orgs and multi-campus institutions.",
    desc: "For teams that manage several organizations at once.",
    feats: [
      "Everything in Professional",
      "Multi-org management",
      "Custom integrations",
      "Dedicated onboarding",
      "Unlimited team members",
      "SLA and compliance review",
    ],
    cta: "Talk to us",
    href: "contact",
    highlight: false,
  },
];

// Plain-language pricing sentence used on the page, in the FAQ and in llms.txt.
export const PRICING_SENTENCE = `Starter is free forever for up to ${PLANS.starter.limits.donors} donors and ${PLANS.starter.limits.seats} seat. Professional is $${PLANS.pro.price} per month billed annually, with unlimited donors, ${PLANS.pro.limits.seats} seats, the full AI suite and a 14-day free trial. Enterprise is custom-priced for federations and multi-org institutions.`;

// ---- Proof bar: only facts verifiable in this repository ----
export const PROOF = [
  { value: "6", label: "donor letter templates, from alumni to family legacy" },
  { value: "10", label: "pipeline stages, from first research to commitment" },
  { value: "50", label: "personalized letters per batch campaign" },
  { value: `${PLANS.starter.limits.donors}`, label: "donors on the free plan, no card, no expiry" },
];

// ---- Sample outputs (fictional organizations and donors) ----
export const SAMPLES = [
  {
    key: "letter",
    label: "Donor letter",
    kind: "Personalized email · Family Legacy template",
    inputs: ["Donor record", "Org profile", "Template T-D"],
    subject: "Miriam — the Adler legacy and Kehillat Shalom's next chapter",
    body: [
      "Dear Miriam,",
      "Your family's name is on the beit midrash doors for a reason. Three generations of Adlers have kept Kehillat Shalom's learning alive, and the scholarship your parents endowed in 1998 still sends two students a year to Israel.",
      "This year we are opening the doors wider: a second morning kollel and an evening track for young families who moved to the neighborhood after 2023. Sixty families are already on the list. What they need is the same thing your parents gave: a room, a teacher and a reason to come back every week.",
      "I would love thirty minutes with you before Rosh Hashanah to walk through the plan and hear what the Adler legacy should look like in this next chapter. Would Tuesday the 9th or Thursday the 11th work?",
      "With gratitude,",
      "Development team, Kehillat Shalom",
    ],
  },
  {
    key: "appeal",
    label: "High Holiday appeal",
    kind: "Batch campaign · merge fields, one draft per donor",
    inputs: ["50 donors", "Giving window: High Holidays", "Template T-B"],
    subject: "{First} — before Rosh Hashanah, a request from {OrgName}",
    body: [
      "Dear {First},",
      "As the year turns, {OrgName} is asking every member of the {Synagogue} community to do one concrete thing: sponsor a seat in the new family minyan so no one is turned away on Yom Kippur.",
      "Last year {Prior_Gift_Detail} made the children's program possible. This year the need is 40 more seats, and a gift of {Suggested_Ask} covers two of them for the full year.",
      "Rabbi {Rabbi_Name} will be sharing the plan at Selichot. If you can, reply to this note and I will hold your seats.",
      "Shanah tovah u'metukah,",
      "{Sender_Name}, {OrgName}",
    ],
  },
  {
    key: "brief",
    label: "Donor brief + ask",
    kind: "AI donor brief · cause match · chai-aligned ask",
    inputs: ["Donor record", "Org profile", "Giving history"],
    meta: [
      ["Cause match", "84%"],
      ["Suggested ask", "$36,000"],
      ["Template", "T-D · Family Legacy"],
      ["Likelihood", "High"],
    ],
    body: [
      "Miriam Adler is a strong fit for Kehillat Shalom's expansion. Her family endowed an Israel-study scholarship in 1998 and she has given annually for two decades, which makes a legacy framing credible rather than aspirational.",
      "Her stated focus areas (Jewish education, young families) overlap directly with the new evening track, and she sits on a board with your president, a warm one-hop introduction.",
      "Open with the scholarship's continuing impact, then present the kollel plan as the next chapter of a gift her parents started. Ask for $36,000 (double chai), positioned as two years of seat sponsorships.",
    ],
  },
  {
    key: "strategy",
    label: "Outreach strategy",
    kind: "Outreach coach · plan for one donor",
    inputs: ["Donor record", "Network path", "Activity history"],
    body: [
      "OPENING STRATEGY: Lead with gratitude for the 1998 scholarship, then the number that matters to her: 60 families already waiting.",
      "KEY HOOKS: Legacy continuity; young families; a named room in the new wing.",
      "INTRO PATH: Ask your president to mention the meeting at Thursday's board call before your email lands.",
      "FOLLOW-UP CADENCE: Email now. WhatsApp check-in on day 4 if no reply. Call on day 8. Meeting before Rosh Hashanah.",
      "RISK FACTORS: Two peer schools are also in campaign. Differentiate on the family track, not the building.",
    ],
  },
];

// ---- How it works ----
export const STEPS = [
  { n: "1", t: "Tell it about your organization", d: "Name, website and mission. ChaiRaise researches your programs, strengths and talking points once, then reuses them in every draft." },
  { n: "2", t: "Add or import donors", d: "Start empty or import a CSV. Every donor is tiered, cause-matched against your mission and given a suggested chai-aligned ask." },
  { n: "3", t: "Draft letters, appeals and briefs", d: "Pick a template, click generate, edit in your own voice. Batch up to 50 personalized letters at once for an appeal." },
  { n: "4", t: "Send, track and close", d: "Send from your own mailbox or WhatsApp, log every touch, move donors through the pipeline and get a daily priority list." },
];

// ---- Outcomes / features ----
export const OUTCOMES = [
  { icon: "✉️", title: "Donor letters that sound like you", desc: "Six templates (alumni, synagogue, prior giver, family legacy, cold, community) drafted from your talking points and each donor's record. Edit, then send." },
  { icon: "📨", title: "Appeals at scale", desc: "Batch campaigns generate up to 50 personalized letters at once with merge fields, so a High Holiday or year-end appeal takes an hour, not a week." },
  { icon: "🧠", title: "Org intelligence", desc: "One prompt builds your mission profile, key programs, cause keywords and donor-deck talking points, reused across every draft." },
  { icon: "🎯", title: "Cause match and suggested asks", desc: "Every donor gets a 0-100% match against your mission and a chai-aligned ask amount ($18K, $36K, $54K…) from capacity and giving history." },
  { icon: "🧭", title: "Outreach strategy coach", desc: "For any donor: opening strategy, hooks, warm-intro path, a 150-word first message, follow-up cadence and risk factors." },
  { icon: "📊", title: "A pipeline that tells you what is next", desc: "Ten stages, Kanban board, engagement scoring, going-cold alerts and a priority leaderboard your board can read." },
  { icon: "🕯️", title: "Built on the Jewish calendar", desc: "High Holiday and year-end giving windows, yahrzeit fields, chai-multiple asks and a Shabbat send guard." },
  { icon: "🕸️", title: "Warm-intro paths", desc: "Import contacts and see the shortest path from your board to any donor before you write." },
  { icon: "📜", title: "Board-ready audit trail", desc: "Every edit, send and stage change is logged per organization and exportable for your board or auditor." },
];

// ---- Trust / data handling (each maps to /security) ----
export const TRUST = [
  { icon: "🔐", title: "Isolated per organization", body: "Every request is checked against your org membership before a row is returned. No shared donor pool, no cross-tenant path." },
  { icon: "🧠", title: "AI stays inside our boundary", body: "AI runs through one authenticated, rate-limited server endpoint. Only minimal donor context is sent, our provider does not train on it, and you can switch AI off in Settings." },
  { icon: "✉️", title: "Your mailbox, your sender", body: "Connect Gmail, Outlook or any SMTP provider and letters go out from your address. Credentials are encrypted with AES-256-GCM and never returned by the API." },
  { icon: "📤", title: "Export everything, delete for real", body: "One click exports donors, gifts, activities, pipeline and audit trail as JSON. Deletion is a hard delete across every table." },
];

// ---- Comparison / alternatives (AEO) ----
export const COMPARISON = {
  columns: ["Spreadsheet + chat assistant", "General nonprofit CRM", "ChaiRaise"],
  rows: [
    ["Personalized donor letters from your own records", "Copy-paste each donor by hand", "Depends on vendor add-ons", "Built in, 6 templates, batch of 50"],
    ["Knows your mission, programs and talking points", "Re-explain every session", "Not typically", "Researched once, reused everywhere"],
    ["Suggested ask amounts", "No", "Depends on vendor", "Chai-aligned, from capacity and history"],
    ["Pipeline, follow-ups and going-cold alerts", "Manual", "Yes", "Yes, 10 stages plus priority list"],
    ["Jewish calendar, yahrzeit, Shabbat guard", "No", "Rarely", "Yes"],
    ["Data isolated, exportable, hard-deletable", "Your laptop", "Varies", "Yes, documented at /security"],
    ["Starting price", "Free", "Varies", `Free for ${PLANS.starter.limits.donors} donors; $${PLANS.pro.price}/mo Pro`],
  ],
};

// ---- FAQ (answer-first, for people and answer engines) ----
export const FAQ = [
  {
    q: "What is ChaiRaise?",
    a: "ChaiRaise is an AI fundraising copilot and donor CRM for nonprofits, built first for Jewish community organizations such as synagogues, yeshivas, day schools and federations. It drafts personalized donor letters, appeals and outreach from your own donor records, suggests the ask, and tracks every relationship through a 10-stage pipeline.",
  },
  {
    q: "What does ChaiRaise actually write?",
    a: "Individual donor letters and emails (150 to 250 words, from six templates), batch appeals with merge fields for up to 50 donors at once, donor briefs that explain why a donor fits your mission, and a full outreach strategy for any donor. Every draft is editable before it is sent.",
  },
  {
    q: "Does ChaiRaise write grant proposals?",
    a: "Not today. ChaiRaise focuses on donor-facing writing: letters, appeals, briefs and outreach plans for individual and family donors. Its org research does produce the mission summary, program list and talking points that a grant narrative starts from, but it does not draft foundation proposals. If grant writing is your main need, email hello@chairaise.com and we will tell you honestly whether it fits.",
  },
  {
    q: "How does the AI know about my organization?",
    a: "You enter your organization's name, website and mission once. ChaiRaise researches your programs, strengths, cause keywords and talking points into an org profile, and every letter, brief and cause-match score is generated from that profile plus the individual donor's record.",
  },
  {
    q: "Is my donor data used to train AI?",
    a: "No. AI requests go through one authenticated server endpoint with only the minimum donor context needed, our AI provider does not train on API inputs under its commercial terms, and you can disable AI features entirely in Settings.",
  },
  {
    q: "Who can see my donor list?",
    a: "Only members of your organization. Every data request is checked against your org membership before a row is returned, there is no shared donor pool, and the sub-processors we use (hosting, database, AI, billing, email) are listed on the Security page.",
  },
  {
    q: "Can I send from my own email address?",
    a: "Yes. Connect Gmail, Outlook or any SMTP provider and letters are relayed through your own mail server from your own address. Your credentials are encrypted with AES-256-GCM before storage and never returned by the API. WhatsApp outreach uses click-to-chat links, so messages never pass through our servers.",
  },
  {
    q: "What does ChaiRaise cost?",
    a: PRICING_SENTENCE,
  },
  {
    q: "Do I need to migrate my data first?",
    a: "No. Start with an empty workspace and add donors as you go, or import a CSV export from your current tool with a column mapper. There is no IT project and no migration weekend.",
  },
  {
    q: "Is ChaiRaise only for Jewish organizations?",
    a: "It is built first for Jewish organizations: chai-aligned ask amounts, High Holiday and year-end giving windows, yahrzeit fields and a Shabbat send guard are native. Any mission-driven nonprofit can use it; onboarding includes hospitals, advocacy groups and a general nonprofit option.",
  },
  {
    q: "Can my whole team use it?",
    a: `Yes. Starter includes ${PLANS.starter.limits.seats} seat, Professional includes ${PLANS.pro.limits.seats}, and Enterprise is unlimited, with Admin, Manager, Fundraiser and view-only Viewer roles.`,
  },
  {
    q: "Can I export or delete my data?",
    a: "Yes, both, without a support ticket. One click exports every record for your organization as JSON, and you can permanently delete a single donor or your entire organization. Deletion is a hard delete, not a hidden flag.",
  },
  {
    q: "Who built ChaiRaise?",
    a: "Yuri Kruman, founder of Portfolio Leverage Company (PortLev), built ChaiRaise in 2026 while running a live capital campaign for a Torah institution in Haifa. Every feature exists because that campaign needed it.",
  },
];

// ---- Routes for the sitemap (lastmod = last substantive content change) ----
export const ROUTES = [
  { path: "/", lastmod: SITE.lastUpdated, changefreq: "weekly", priority: 1.0 },
  { path: "/blog", lastmod: SITE.lastUpdated, changefreq: "weekly", priority: 0.8 },
  ...POSTS.map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.date, changefreq: "monthly", priority: 0.8 })),
  { path: "/security", lastmod: "2026-08-16", changefreq: "monthly", priority: 0.6 },
  { path: "/privacy", lastmod: "2026-03-24", changefreq: "yearly", priority: 0.3 },
  { path: "/terms", lastmod: "2026-03-29", changefreq: "yearly", priority: 0.3 },
];

// ============================================================
// JSON-LD builders
// ============================================================
export function organizationLd() {
  return {
    "@type": "Organization",
    "@id": `${SITE.publisher.url}/#organization`,
    name: SITE.publisher.name,
    alternateName: SITE.publisher.alternateName,
    url: SITE.publisher.url,
    founder: { "@id": `${SITE.author.url}/#person` },
    brand: { "@type": "Brand", name: SITE.name, url: SITE.url },
    contactPoint: { "@type": "ContactPoint", email: SITE.contactEmail, contactType: "sales" },
  };
}

export function personLd() {
  return {
    "@type": "Person",
    "@id": `${SITE.author.url}/#person`,
    name: SITE.author.name,
    url: SITE.author.url,
    jobTitle: SITE.author.jobTitle,
    worksFor: { "@id": `${SITE.publisher.url}/#organization` },
    sameAs: SITE.author.sameAs,
  };
}

export function websiteLd() {
  return {
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    publisher: { "@id": `${SITE.publisher.url}/#organization` },
    inLanguage: "en",
  };
}

export function softwareLd() {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE.url}/#software`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.valueProp,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: SITE.category,
    operatingSystem: "Web",
    author: { "@id": `${SITE.author.url}/#person` },
    publisher: { "@id": `${SITE.publisher.url}/#organization` },
    audience: { "@type": "Audience", audienceType: "Nonprofit development directors and executive directors" },
    featureList: OUTCOMES.map((o) => o.title),
    offers: [
      { "@type": "Offer", name: PLANS.starter.label, price: "0", priceCurrency: "USD", description: `Free forever for up to ${PLANS.starter.limits.donors} donors`, url: `${SITE.url}/#pricing` },
      { "@type": "Offer", name: PLANS.pro.label, price: String(PLANS.pro.price), priceCurrency: "USD", description: "Per month, billed annually. 14-day free trial.", url: `${SITE.url}/#pricing` },
    ],
  };
}

export function faqLd() {
  return {
    "@type": "FAQPage",
    "@id": `${SITE.url}/#faq`,
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbLd(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/** Full JSON-LD graph for the homepage. */
export function homeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationLd(),
      personLd(),
      websiteLd(),
      softwareLd(),
      faqLd(),
      breadcrumbLd([{ name: "Home", url: `${SITE.url}/` }]),
    ],
  };
}

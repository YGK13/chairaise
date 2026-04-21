// ============================================================================
// CHAIRAISE BLOG POSTS REGISTRY
// Source of truth for /blog index and /blog/[slug] dynamic pages.
// Add new posts here + drop markdown file into /content/blog/posts/<slug>.md.
// ============================================================================

export const POSTS = [
  {
    slug: "ai-jewish-fundraising-guide-2026",
    title: "The Complete Guide to AI-Powered Jewish Fundraising in 2026",
    description:
      "How Jewish organizations use AI to transform donor cultivation. The 5-stage pipeline, tool comparison, and practical framework for synagogues, yeshivot and federations.",
    keywords: [
      "jewish fundraising",
      "ai fundraising",
      "synagogue fundraising software",
      "jewish nonprofit crm",
      "jewish donor management",
    ],
    date: "2026-04-21",
    readingTime: "13 min read",
    category: "Jewish Fundraising",
  },
  {
    slug: "synagogue-donor-management-small-orgs",
    title:
      "Synagogue Donor Management: How Small Jewish Organizations Can Compete with Federations",
    description:
      "Small Jewish orgs can match federation-level fundraising sophistication using AI. The 5-step playbook for synagogues and day schools with under 500 families.",
    keywords: [
      "synagogue donor management",
      "small jewish organization fundraising",
      "donor management for synagogues",
      "shul fundraising",
      "day school fundraising",
    ],
    date: "2026-04-21",
    readingTime: "11 min read",
    category: "Small Org Playbook",
  },
];

// ============================================================================
// HELPERS
// ============================================================================

export function getPost(slug) {
  return POSTS.find((p) => p.slug === slug);
}

export function getAllPostsSorted() {
  return [...POSTS].sort((a, b) => new Date(b.date) - new Date(a.date));
}

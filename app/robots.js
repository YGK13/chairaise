// ============================================================
// /robots.txt — search engines and AI crawlers are welcome on the public
// surface; the API, the authenticated app and the owner console are not.
// ============================================================
import { SITE } from "@/content/site";

const DISALLOW = ["/api/", "/app", "/admin", "/auth/"];
const AI_CRAWLERS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-User", "Claude-SearchBot",
  "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended",
  "Bytespider", "CCBot", "Amazonbot", "meta-externalagent", "DuckAssistBot", "cohere-ai", "YouBot",
];

export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_CRAWLERS.map((ua) => ({ userAgent: ua, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}

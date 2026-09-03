// ============================================================
// /sitemap.xml — generated from content/site.js ROUTES so a new blog post or
// page is listed the moment it is added to the registry. lastmod is the date
// of the last substantive content change, not the build date.
// ============================================================
import { SITE, ROUTES } from "@/content/site";

export default function sitemap() {
  return ROUTES.map((r) => ({
    url: `${SITE.url}${r.path}`,
    lastModified: r.lastmod,
    changeFrequency: r.changefreq,
    priority: r.priority,
  }));
}

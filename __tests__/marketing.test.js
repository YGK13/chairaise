// ============================================================
// ChaiRaise — Public marketing surface tests
// Locks the SEO/AEO contract: pricing on the page equals the enforced plan
// ladder, every FAQ has an answer, JSON-LD is well-formed, the sitemap and
// robots routes cover the public pages, and llms.txt stays in sync.
// ============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { PLANS } from "@/lib/plan";
import { POSTS } from "@/content/blog/posts";
import {
  SITE, PRICING, PRICING_SENTENCE, PROOF, SAMPLES, FAQ, ROUTES, SISTER_LINKS,
  homeJsonLd, softwareLd, faqLd, breadcrumbLd,
} from "@/content/site";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

describe("pricing mirrors lib/plan.js", () => {
  it("advertises the enforced prices and limits", () => {
    const starter = PRICING.find((p) => p.id === "starter");
    const pro = PRICING.find((p) => p.id === "pro");
    expect(starter.price).toBe("Free");
    expect(starter.feats.join(" ")).toContain(`${PLANS.starter.limits.donors} donors`);
    expect(pro.price).toBe(`$${PLANS.pro.price}`);
    expect(pro.feats.join(" ")).toContain(`${PLANS.pro.limits.seats} team members`);
    expect(PRICING_SENTENCE).toContain(`$${PLANS.pro.price}`);
    expect(PRICING_SENTENCE).toContain(`${PLANS.starter.limits.donors} donors`);
  });

  it("has one highlighted plan and a contact path for enterprise", () => {
    expect(PRICING.filter((p) => p.highlight)).toHaveLength(1);
    expect(PRICING.find((p) => p.id === "enterprise").href).toBe("contact");
  });
});

describe("FAQ is answer-first and honest", () => {
  it("every question has a substantive answer", () => {
    expect(FAQ.length).toBeGreaterThanOrEqual(10);
    for (const f of FAQ) {
      expect(f.q.endsWith("?")).toBe(true);
      expect(f.a.length).toBeGreaterThan(60);
    }
  });

  it("does not claim grant writing", () => {
    const grant = FAQ.find((f) => /grant/i.test(f.q));
    expect(grant).toBeTruthy();
    expect(grant.a).toMatch(/Not today/);
  });

  it("states pricing plainly", () => {
    const price = FAQ.find((f) => /cost/i.test(f.q));
    expect(price.a).toBe(PRICING_SENTENCE);
  });
});

describe("samples and proof are labeled and verifiable", () => {
  it("samples carry inputs and a body", () => {
    expect(SAMPLES.map((s) => s.key)).toEqual(["letter", "appeal", "brief", "strategy"]);
    for (const s of SAMPLES) {
      expect(s.inputs.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(2);
    }
  });

  it("proof bar numbers come from the product", () => {
    const values = PROOF.map((p) => p.value);
    expect(values).toContain(`${PLANS.starter.limits.donors}`);
    expect(values).toContain("10"); // pipeline stages
    expect(values).toContain("6"); // templates
  });
});

describe("JSON-LD", () => {
  it("builds a schema.org graph with the required entities", () => {
    const ld = homeJsonLd();
    expect(ld["@context"]).toBe("https://schema.org");
    const types = ld["@graph"].map((n) => n["@type"]);
    for (const t of ["Organization", "Person", "WebSite", "SoftwareApplication", "FAQPage", "BreadcrumbList"]) {
      expect(types).toContain(t);
    }
    // Serializable, no undefined leaks
    expect(() => JSON.parse(JSON.stringify(ld))).not.toThrow();
  });

  it("Organization is the publisher and Person carries sameAs links", () => {
    const org = homeJsonLd()["@graph"].find((n) => n["@type"] === "Organization");
    const person = homeJsonLd()["@graph"].find((n) => n["@type"] === "Person");
    expect(org.name).toBe("Portfolio Leverage Company");
    expect(person.name).toBe("Yuri Kruman");
    expect(person.sameAs).toContain("https://www.linkedin.com/in/yurikruman/");
    expect(person.sameAs).toContain("https://portlev.com");
  });

  it("SoftwareApplication offers match the plan ladder", () => {
    const offers = softwareLd().offers;
    expect(offers.find((o) => o.name === PLANS.starter.label).price).toBe("0");
    expect(offers.find((o) => o.name === PLANS.pro.label).price).toBe(String(PLANS.pro.price));
  });

  it("FAQPage mirrors the FAQ exactly", () => {
    const faq = faqLd();
    expect(faq.mainEntity).toHaveLength(FAQ.length);
    expect(faq.mainEntity[0].name).toBe(FAQ[0].q);
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe(FAQ[0].a);
  });

  it("BreadcrumbList positions are 1-based and ordered", () => {
    const bc = breadcrumbLd([{ name: "Home", url: "https://chairaise.com/" }, { name: "Blog", url: "https://chairaise.com/blog" }]);
    expect(bc.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });
});

describe("sitemap and robots", () => {
  it("lists every public route with a lastmod and no redirects", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://chairaise.com/");
    expect(urls).toContain("https://chairaise.com/security");
    expect(urls).toContain("https://chairaise.com/blog");
    for (const p of POSTS) expect(urls).toContain(`https://chairaise.com/blog/${p.slug}`);
    expect(urls).not.toContain("https://chairaise.com/landing");
    expect(urls.some((u) => u.includes("/app") || u.includes("/api") || u.includes("/admin"))).toBe(false);
    for (const e of entries) expect(e.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(entries).toHaveLength(ROUTES.length);
  });

  it("allows crawlers on public pages and blocks private surfaces", () => {
    const r = robots();
    expect(r.sitemap).toBe("https://chairaise.com/sitemap.xml");
    const star = r.rules.find((x) => x.userAgent === "*");
    expect(star.allow).toBe("/");
    expect(star.disallow).toEqual(expect.arrayContaining(["/api/", "/app", "/admin"]));
    for (const ua of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
      expect(r.rules.some((x) => x.userAgent === ua && x.allow === "/")).toBe(true);
    }
  });
});

describe("llms.txt", () => {
  it("both files exist, state pricing, the honest grant caveat and the update date", () => {
    for (const f of ["public/llms.txt", "public/llms-full.txt"]) {
      const txt = read(f);
      expect(txt).toContain("# ChaiRaise");
      expect(txt).toContain(`$${PLANS.pro.price}`);
      expect(txt).toContain(`${PLANS.starter.limits.donors} donors`);
      expect(txt.toLowerCase()).toContain("grant");
      expect(txt).toContain(`Last updated: ${SITE.lastUpdated}`);
      expect(txt).toContain("https://portlev.com");
    }
  });

  it("does not leak model identifiers", () => {
    for (const f of ["public/llms.txt", "public/llms-full.txt", "content/site.js"]) {
      expect(read(f)).not.toMatch(/sonnet|opus|haiku|gpt-4|claude-\d/i);
    }
  });
});

describe("site entity", () => {
  it("has the sister-link set for the PortLev footer strip", () => {
    const urls = SISTER_LINKS.map((s) => s.url);
    expect(urls).toContain("https://portlev.com");
    expect(urls).toContain("https://yurikruman.com");
    expect(urls.length).toBeGreaterThanOrEqual(10);
  });

  it("keeps title and description within SERP limits", () => {
    expect(SITE.description.length).toBeLessThanOrEqual(155);
    const pageSrc = read("app/page.js");
    const m = pageSrc.match(/const TITLE = "([^"]+)"/);
    expect(m).toBeTruthy();
    expect(m[1].length).toBeLessThanOrEqual(60);
  });
});

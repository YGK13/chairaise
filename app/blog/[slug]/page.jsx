import Link from "next/link";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import { POSTS, getPost } from "@/content/blog/posts";

// ============================================================================
// DYNAMIC BLOG ARTICLE PAGE — /blog/[slug]
// Renders markdown articles with ChaiRaise branding (amber accent on dark).
// ============================================================================

const ACCENT = "#f59e0b";
const ACCENT_LIGHT = "#fbbf24";
const BG = "#09090b";
const BG_CARD = "#18181b";
const BORDER = "#27272a";
const TEXT = "#e4e4e7";
const TEXT_MUTED = "#a1a1aa";

export async function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Not Found" };
  return {
    title: `${post.title} | ChaiRaise Blog`,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://chairaise.com/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
    },
  };
}

// ============================================================================
// MARKDOWN RENDERER — Dependency-free parser for our article dialect
// ============================================================================

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(s) {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, `<code style="background:${BG_CARD};padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em">$1</code>`);
  out = out.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');
  out = out.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, `<a href="$2" style="color:${ACCENT_LIGHT};text-decoration:underline">$1</a>`);
  return out;
}

function renderMarkdown(md) {
  const lines = md.split(/\r?\n/);
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      let code = "";
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code += lines[i] + "\n";
        i++;
      }
      i++;
      html += `<pre style="background:${BG_CARD};border:1px solid ${BORDER};border-radius:8px;padding:16px;overflow-x:auto;margin:24px 0;font-family:monospace;font-size:14px;line-height:1.6"><code>${escapeHtml(code)}</code></pre>`;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      html += `<hr style="border:0;border-top:1px solid ${BORDER};margin:40px 0" />`;
      i++;
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const sizes = { 1: 36, 2: 28, 3: 22, 4: 18, 5: 16, 6: 15 };
      const margins = { 1: "48px 0 24px", 2: "40px 0 20px", 3: "32px 0 16px", 4: "24px 0 12px", 5: "20px 0 10px", 6: "18px 0 10px" };
      html += `<h${level} style="font-size:${sizes[level]}px;font-weight:${level <= 2 ? 800 : 700};line-height:1.3;margin:${margins[level]};color:${TEXT}">${renderInline(h[2])}</h${level}>`;
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      let quote = "";
      while (i < lines.length && lines[i].startsWith("> ")) {
        quote += lines[i].slice(2) + "\n";
        i++;
      }
      html += `<blockquote style="border-left:3px solid ${ACCENT};padding:8px 20px;margin:24px 0;color:${TEXT_MUTED};font-style:italic">${renderInline(quote.trim())}</blockquote>`;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1])) {
      const headerCells = line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        const cells = lines[i].split("|").map((c) => c.trim()).filter((c) => c.length > 0);
        rows.push(cells);
        i++;
      }
      html += `<div style="overflow-x:auto;margin:24px 0"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>${headerCells.map((c) => `<th style="border:1px solid ${BORDER};padding:10px 14px;text-align:left;background:${BG_CARD};font-weight:600;color:${TEXT}">${renderInline(c)}</th>`).join("")}</tr></thead><tbody>`;
      for (const row of rows) {
        html += `<tr>${row.map((c) => `<td style="border:1px solid ${BORDER};padding:10px 14px;color:${TEXT}">${renderInline(c)}</td>`).join("")}</tr>`;
      }
      html += `</tbody></table></div>`;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      let items = "";
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items += `<li style="margin-bottom:8px">${renderInline(lines[i].replace(/^\s*[-*+]\s+/, ""))}</li>`;
        i++;
      }
      html += `<ul style="margin:16px 0;padding-left:24px;color:${TEXT}">${items}</ul>`;
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      let items = "";
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items += `<li style="margin-bottom:8px">${renderInline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`;
        i++;
      }
      html += `<ol style="margin:16px 0;padding-left:24px;color:${TEXT}">${items}</ol>`;
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    let para = line;
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("> ") &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      para += " " + lines[i];
      i++;
    }
    html += `<p style="margin:0 0 18px;font-size:17px;line-height:1.75;color:${TEXT}">${renderInline(para)}</p>`;
  }

  return html;
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const filePath = path.join(process.cwd(), "content", "blog", "posts", `${slug}.md`);
  let body = "";
  try {
    body = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    body = "# Article not found";
  }

  const html = renderMarkdown(body);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    author: { "@type": "Person", name: "Yuri Kruman", url: "https://www.linkedin.com/in/yurikruman" },
    datePublished: post.date,
    publisher: { "@type": "Organization", name: "ChaiRaise", url: "https://chairaise.com" },
  };

  return (
    <div
      style={{
        background: BG,
        color: TEXT,
        fontFamily: "Inter, system-ui, sans-serif",
        minHeight: "100vh",
      }}
    >
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(9,9,11,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
          }}
        >
          <Link href="/landing" style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 18, color: TEXT, textDecoration: "none" }}>
            <span style={{ width: 32, height: 32, background: ACCENT, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#1a1103" }}>✡</span>
            ChaiRaise
          </Link>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <Link href="/landing" style={{ color: TEXT_MUTED, fontSize: 14, textDecoration: "none" }}>Home</Link>
            <Link href="/blog" style={{ color: TEXT_MUTED, fontSize: 14, textDecoration: "none" }}>Blog</Link>
            <Link href="/auth/signin" style={{ background: ACCENT, color: "#1a1103", padding: "10px 20px", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              Request Demo
            </Link>
          </div>
        </div>
      </nav>

      <article style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 100px" }}>
        <Link href="/blog" style={{ color: ACCENT_LIGHT, fontSize: 14, textDecoration: "none", marginBottom: 24, display: "inline-block" }}>
          ← All articles
        </Link>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16, marginBottom: 24, fontSize: 13, color: TEXT_MUTED }}>
          <span style={{ background: "rgba(245,158,11,0.15)", color: ACCENT_LIGHT, padding: "3px 10px", borderRadius: 4, fontWeight: 600 }}>
            {post.category}
          </span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{post.readingTime}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
        </div>

        <div dangerouslySetInnerHTML={{ __html: html }} style={{ fontSize: 17, lineHeight: 1.75 }} />

        <div
          style={{
            background: BG_CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: 32,
            marginTop: 48,
            textAlign: "center",
          }}
        >
          <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: TEXT }}>
            Multiply your fundraising impact by 18x.
          </h3>
          <p style={{ color: TEXT_MUTED, marginBottom: 20, lineHeight: 1.6 }}>
            AI-native donor intelligence built for Jewish organizations. Purpose-built for synagogues, yeshivot and federations.
          </p>
          <Link
            href="/auth/signin"
            style={{
              background: ACCENT,
              color: "#1a1103",
              padding: "14px 32px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 16,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Request a Demo →
          </Link>
        </div>
      </article>

      <footer style={{ padding: "40px 0", borderTop: `1px solid ${BORDER}`, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: TEXT_MUTED }}>
          &copy; 2026 ChaiRaise by Portfolio Leverage Co. &middot;{" "}
          <Link href="/landing" style={{ color: ACCENT_LIGHT }}>Home</Link>{" "}&middot;{" "}
          <Link href="/blog" style={{ color: ACCENT_LIGHT }}>Blog</Link>{" "}&middot;{" "}
          <Link href="/privacy" style={{ color: ACCENT_LIGHT }}>Privacy</Link>
        </p>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
    </div>
  );
}

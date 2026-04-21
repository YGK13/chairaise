import Link from "next/link";
import { getAllPostsSorted } from "@/content/blog/posts";

// ============================================================================
// BLOG INDEX PAGE — /blog
// Lists all published ChaiRaise articles in reverse-chronological order.
// ============================================================================

const ACCENT = "#f59e0b";
const ACCENT_LIGHT = "#fbbf24";
const BG = "#09090b";
const BG_CARD = "#18181b";
const BORDER = "#27272a";
const TEXT = "#e4e4e7";
const TEXT_MUTED = "#a1a1aa";

export const metadata = {
  title: "ChaiRaise Blog — AI-Powered Jewish Fundraising Insights",
  description:
    "Practical guides and frameworks for Jewish fundraising professionals. AI, donor management, synagogue ops and federation-level strategy for every size org.",
  keywords: [
    "jewish fundraising blog",
    "synagogue fundraising",
    "jewish nonprofit crm",
    "ai fundraising",
    "donor management",
  ],
  alternates: { canonical: "https://chairaise.com/blog" },
  openGraph: {
    title: "ChaiRaise Blog — AI-Powered Jewish Fundraising Insights",
    description:
      "Practical guides and frameworks for Jewish fundraising professionals.",
    url: "https://chairaise.com/blog",
    type: "website",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPostsSorted();

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
            <Link href="/blog" style={{ color: TEXT, fontSize: 14, textDecoration: "none", fontWeight: 600 }}>Blog</Link>
            <Link href="/auth/signin" style={{ background: ACCENT, color: "#1a1103", padding: "10px 20px", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              Request Demo
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px 100px" }}>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 16,
            background: `linear-gradient(135deg, ${TEXT} 0%, ${ACCENT_LIGHT} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          The ChaiRaise Blog
        </h1>
        <p style={{ fontSize: 20, color: TEXT_MUTED, lineHeight: 1.6, marginBottom: 64, maxWidth: 700 }}>
          AI-powered fundraising frameworks, synagogue donor management playbooks and Jewish nonprofit strategy. Built for every org size, from minyan to federation.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{
                display: "block",
                background: BG_CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 28,
                textDecoration: "none",
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, fontSize: 13, color: TEXT_MUTED }}>
                <span style={{ background: "rgba(245,158,11,0.15)", color: ACCENT_LIGHT, padding: "3px 10px", borderRadius: 4, fontWeight: 600 }}>
                  {post.category}
                </span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{post.readingTime}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 10, lineHeight: 1.3 }}>
                {post.title}
              </h2>
              <p style={{ fontSize: 16, color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
                {post.description}
              </p>
              <div style={{ marginTop: 16, fontSize: 14, color: ACCENT_LIGHT, fontWeight: 600 }}>
                Read article →
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer style={{ padding: "40px 0", borderTop: `1px solid ${BORDER}`, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: TEXT_MUTED }}>
          &copy; 2026 ChaiRaise by Portfolio Leverage Co. &middot;{" "}
          <Link href="/landing" style={{ color: ACCENT_LIGHT }}>Home</Link>{" "}&middot;{" "}
          <Link href="/privacy" style={{ color: ACCENT_LIGHT }}>Privacy</Link>
        </p>
      </footer>
    </div>
  );
}

// ============================================================
// ChaiRaise — Security & Privacy (public trust page)
// Every claim here maps to something actually implemented in this codebase.
// If a control isn't built, it is not listed.
// ============================================================
import Link from "next/link";

export const metadata = {
  title: "Security & Privacy — ChaiRaise",
  description:
    "How ChaiRaise protects donor data: tenant isolation, encryption, where your data goes, your own mailbox, export and permanent erasure.",
};

const C = {
  bg: "#09090b", surface: "#161618", border: "#27272a", border2: "#3f3f46",
  text: "#fafafa", text2: "#a1a1aa", text3: "#71717a", accent: "#f59e0b",
  accentSoft: "rgba(245,158,11,0.12)", green: "#22c55e",
};

const PILLARS = [
  {
    icon: "🔐",
    title: "Your donors are yours alone",
    body: "Every record is scoped to your organization, and every data request is checked against your membership before a single row is returned. An org id is not a password: if you are not a member of an organization, the API refuses the request outright. There is no shared donor pool and no cross-tenant read path.",
  },
  {
    icon: "🧠",
    title: "Donor data never leaves through your browser",
    body: "AI features run through one authenticated server endpoint. Our AI provider key lives on the server and is never shipped to your browser, and donor details are never posted from your device to a third party. That path is auditable, rate-limited and sits entirely inside our boundary.",
  },
  {
    icon: "✉️",
    title: "Your mailbox, your mail server",
    body: "Connect your own email (Gmail, Outlook, or any provider) and outreach is relayed through YOUR mail server, from YOUR address. We do not keep a copy of your mailbox. Your SMTP password is encrypted with AES-256-GCM before it is stored and is never returned by our API — not even to you.",
  },
  {
    icon: "💬",
    title: "WhatsApp without surveillance",
    body: "WhatsApp outreach uses click-to-chat links that open your own WhatsApp with the message pre-filled. We hold no WhatsApp session and proxy no messages, so donor phone numbers and message content never pass through our servers on the way to Meta.",
  },
  {
    icon: "📤",
    title: "Take your data and go, any time",
    body: "One click exports every record we hold for your organization — donors, gifts, activities, pipeline, campaigns and your full audit trail — as a single JSON file. No support ticket, no export fee, no lock-in. Credentials are deliberately excluded from exports.",
  },
  {
    icon: "🗑️",
    title: "Real deletion means gone",
    body: "You can permanently erase an individual donor or your entire organization. Deletion is a hard delete across every table, not a hidden flag on a row we quietly keep. It is irreversible by design and requires typed confirmation.",
  },
];

const CONTROLS = [
  ["Encryption in transit", "TLS on every connection, with HSTS enforced."],
  ["Encryption at rest", "Database storage is encrypted at rest by our database provider."],
  ["Stored credentials", "Mail credentials are additionally encrypted app-side (AES-256-GCM), so a database dump alone does not expose them."],
  ["Passwords", "Hashed with scrypt and a per-password salt, verified in constant time. We never store or log a plaintext password."],
  ["Sign-in", "Email and password, or Google SSO. Organization owner accounts are bound to verified Google identities."],
  ["Session safety", "Sessions expire and the app auto-signs-out after a configurable period of inactivity."],
  ["Audit trail", "Donor edits, sends and administrative actions are written to a per-organization audit log you can export."],
  ["Abuse limits", "Authentication, AI, email and public forms are rate-limited to blunt credential stuffing and spam."],
  ["Browser hardening", "Strict security headers: no framing, no MIME sniffing, a locked-down permissions policy and a strict referrer policy."],
  ["Payments", "Card details are handled entirely by Stripe Checkout. ChaiRaise never sees or stores a card number."],
];

const SUBPROCESSORS = [
  ["Vercel", "Application hosting and edge network"],
  ["Neon", "Managed Postgres database"],
  ["Anthropic", "AI features (donor briefs, drafting) via our server"],
  ["Stripe", "Subscription billing and payment processing"],
  ["Google", "Optional single sign-on, when you choose it"],
  ["Resend", "Platform email, only when you have not connected your own mailbox"],
];

export default function SecurityPage() {
  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>
      <style>{`
        .sec-card { transition: border-color .2s ease, transform .2s ease; }
        .sec-card:hover { border-color: ${C.accent} !important; transform: translateY(-2px); }
        @media (max-width: 860px) {
          .sec-grid { grid-template-columns: 1fr !important; }
          .sec-h1 { font-size: 38px !important; }
          .sec-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, height: 60, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", width: "100%", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: C.text }}>
            <div style={{ width: 30, height: 30, background: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#09090b" }}>CR</div>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>ChaiRaise</span>
          </Link>
          <Link href="/auth/signin" style={{ padding: "8px 18px", background: C.accent, color: "#09090b", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ borderBottom: `1px solid ${C.border}`, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,158,11,0.10), transparent 65%)" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "72px 24px 56px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 20, background: C.accentSoft, color: C.accent, fontSize: 12, fontWeight: 600, marginBottom: 20 }}>
            🛡️ Security &amp; Privacy
          </div>
          <h1 className="sec-h1" style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.8, marginBottom: 18 }}>
            Your donor list is the<br />most sensitive file you own
          </h1>
          <p style={{ fontSize: 18, color: C.text2, lineHeight: 1.65, maxWidth: 640 }}>
            Names, capacity estimates, giving history, private notes about people who trust your organization. We built ChaiRaise on the assumption that this data should never be casually exposed, resold, mined, or held hostage. This page describes exactly how it is protected — and every claim here is something we actually implemented.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "64px 24px" }}>
        <div className="sec-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {PILLARS.map((p) => (
            <div key={p.title} className="sec-card" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 26 }}>
              <div style={{ fontSize: 26, marginBottom: 12 }}>{p.icon}</div>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 9 }}>{p.title}</h2>
              <p style={{ fontSize: 14, color: C.text3, lineHeight: 1.7 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Controls table */}
      <section style={{ borderTop: `1px solid ${C.border}`, background: "rgba(255,255,255,0.015)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 10 }}>The controls, specifically</h2>
          <p style={{ fontSize: 15, color: C.text3, marginBottom: 32 }}>What a security reviewer on your board will want itemized.</p>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
            {CONTROLS.map(([k, v], i) => (
              <div key={k} className="sec-2col" style={{
                display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, padding: "16px 20px",
                background: i % 2 ? "transparent" : "rgba(255,255,255,0.02)",
                borderTop: i ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>{k}</div>
                <div style={{ fontSize: 14, color: C.text2, lineHeight: 1.65 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subprocessors */}
      <section style={{ borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 10 }}>Who else touches your data</h2>
          <p style={{ fontSize: 15, color: C.text3, marginBottom: 28 }}>
            The complete list of subprocessors. We do not sell donor data, we do not share it with advertisers, and we do not use your donor records to train models.
          </p>
          <div className="sec-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {SUBPROCESSORS.map(([name, role]) => (
              <div key={name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{name}</div>
                <div style={{ fontSize: 13, color: C.text3, marginTop: 3 }}>{role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honest limits */}
      <section style={{ borderTop: `1px solid ${C.border}`, background: "rgba(245,158,11,0.04)" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "56px 24px" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 14 }}>What we do not claim</h2>
          <p style={{ fontSize: 15, color: C.text2, lineHeight: 1.75 }}>
            We would rather be trusted than impressive. ChaiRaise is a young product: we do not hold a SOC 2 report or an ISO certification, and we have not commissioned a third-party penetration test. We will say so plainly here until that changes, rather than imply coverage we do not have. If your organization requires a formal security review or a signed data processing agreement, contact us and we will work through it with you directly.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section style={{ borderTop: `1px solid ${C.border}`, padding: "56px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Found a vulnerability?</h2>
        <p style={{ fontSize: 15, color: C.text3, maxWidth: 560, margin: "0 auto 20px", lineHeight: 1.65 }}>
          Report it to <a href="mailto:security@chairaise.com" style={{ color: C.accent, textDecoration: "none" }}>security@chairaise.com</a>. We will acknowledge responsible disclosures and will not pursue action against good-faith researchers.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/privacy" style={{ padding: "11px 22px", border: `1px solid ${C.border2}`, borderRadius: 9, color: C.text, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Privacy Policy</Link>
          <Link href="/terms" style={{ padding: "11px 22px", border: `1px solid ${C.border2}`, borderRadius: 9, color: C.text, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Terms</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "28px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "#52525b" }}>© 2026 ChaiRaise. Multiply your impact by 18.</p>
      </footer>
    </div>
  );
}

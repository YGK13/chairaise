'use client';
// ============================================================
// ChaiRaise — Marketing Homepage (premium, interactive)
// Asymmetric layouts, live-feel product mockups, interactive feature
// switcher, demo modal, animated stats, accordion FAQ. Brand: dark + amber,
// "Multiply your impact by 18". All mockup names are fictional placeholders.
// ============================================================
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// Drop a real demo here later (YouTube/Loom embed URL) to light up the video.
const DEMO_VIDEO_URL = "";

const C = {
  bg: "#09090b", surface: "#161618", surface2: "#1d1d20", border: "#27272a",
  border2: "#3f3f46", text: "#fafafa", text2: "#a1a1aa", text3: "#71717a",
  text4: "#52525b", accent: "#f59e0b", accentSoft: "rgba(245,158,11,0.12)",
  green: "#22c55e", blue: "#3b82f6", purple: "#8b5cf6", cyan: "#06b6d4",
};

// ============================================================
// PRODUCT MOCKUPS — styled to look like real ChaiRaise screens
// ============================================================
function WindowChrome({ title, children, style }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", ...style,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
        borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)",
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
        <span style={{ marginLeft: 8, fontSize: 11, color: C.text3, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function StatTile({ label, value, sub, color }) {
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || C.text, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 10, color: C.text3, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: C.green, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function DashboardMock() {
  return (
    <WindowChrome title="chairaise.com/app — Dashboard · Product preview, sample data">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Welcome back, Sarah</div>
          <div style={{ fontSize: 11, color: C.text3 }}>247 donors · 21 in active pipeline</div>
        </div>
        <div style={{ fontSize: 10, color: C.accent, background: C.accentSoft, padding: "4px 10px", borderRadius: 20, fontWeight: 700 }}>⚡ 6 priority actions</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        <StatTile label="Pipeline" value="$6.5M" sub="▲ 18%" />
        <StatTile label="Tier 1 HNW" value="38" color={C.accent} />
        <StatTile label="Response" value="42%" sub="▲ 9%" />
        <StatTile label="Committed" value="$1.2M" color={C.green} />
      </div>
      <div style={{ fontSize: 10, color: C.text3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Pipeline funnel</div>
      {[["Researching", 62, C.blue], ["Email sent", 84, C.accent], ["Meeting held", 45, C.purple], ["Commitment", 28, C.green]].map(([l, w, c]) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
          <span style={{ fontSize: 10, color: C.text2, width: 78 }}>{l}</span>
          <div style={{ flex: 1, height: 8, background: C.surface2, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${w}%`, height: "100%", background: c, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </WindowChrome>
  );
}

function DonorMock() {
  return (
    <WindowChrome title="Donor — Avery Stone · Sample data">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#b45309)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#09090b" }}>AS</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Avery Stone</div>
          <div style={{ fontSize: 11, color: C.text3 }}>Private Equity · New York</div>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, color: "#09090b", background: C.accent, padding: "3px 9px", borderRadius: 6 }}>TIER 1</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={{ background: C.surface2, borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: C.text3 }}>Cause Match</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>92%</div>
        </div>
        <div style={{ background: C.surface2, borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: C.text3 }}>Suggested Ask</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>$54,000</div>
        </div>
      </div>
      <div style={{ background: C.accentSoft, border: `1px solid rgba(245,158,11,0.25)`, borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, marginBottom: 4 }}>🧠 AI BRIEF</div>
        <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.6 }}>
          Strong alignment with your education mission. Funded two scholarship campaigns at peer orgs. Shared board tie via Daniel K. Open the ask with the legacy framing.
        </div>
      </div>
    </WindowChrome>
  );
}

function EmailMock() {
  return (
    <WindowChrome title="AI Email Composer · Sample data">
      <div style={{ display: "flex", gap: 8, fontSize: 11, color: C.text3, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontWeight: 600 }}>To:</span> avery@example.org
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Avery — your scholarship legacy &amp; our next 100 students</div>
      <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.7, marginBottom: 12 }}>
        Dear Avery,<br />
        Your support of educational access has changed lives. As we open our next campaign, I immediately thought of you: <span style={{ background: "rgba(245,158,11,0.18)" }}>your focus on first-generation students</span> maps directly to what we&apos;re building...
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#09090b", background: C.accent, padding: "7px 14px", borderRadius: 7 }}>✨ Generated by AI</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.text2, border: `1px solid ${C.border2}`, padding: "7px 14px", borderRadius: 7 }}>Send</span>
      </div>
    </WindowChrome>
  );
}

function NetworkMock() {
  const cols = [
    ["Researching", C.blue, ["Avery Stone", "Jordan Blake"]],
    ["Email Sent", C.accent, ["Riley Chen", "Morgan Diaz", "Sam Patel"]],
    ["Meeting", C.purple, ["Casey Stone"]],
    ["Commitment", C.green, ["Taylor Reed"]],
  ];
  return (
    <WindowChrome title="Pipeline — Kanban · Sample data">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {cols.map(([name, color, cards]) => (
          <div key={name}>
            <div style={{ fontSize: 9, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />{name}
            </div>
            {cards.map((c) => (
              <div key={c} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 8px", marginBottom: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{c}</div>
                <div style={{ height: 3, width: "60%", background: color, borderRadius: 2, marginTop: 5, opacity: 0.6 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </WindowChrome>
  );
}

// ============================================================
// DATA
// ============================================================
const SHOWCASE = [
  { key: "intel", label: "Donor Intelligence", icon: "🧠", title: "Know every donor before you reach out", desc: "Enter your org once. AI researches your mission and scores every donor by how well they match what you actually do — so you spend time on the people most likely to give.", bullets: ["AI org research in 30 seconds", "Cause-match % on every donor", "Chai-aligned suggested ask amounts"], mock: <DonorMock /> },
  { key: "email", label: "AI Outreach", icon: "✉️", title: "Personalized emails in one click", desc: "Generate outreach that sounds like you wrote it — built from your talking points, the donor's interests and proven fundraising templates. Edit, then send.", bullets: ["One-click personalized drafts", "Your voice, your templates", "Batch to 50 donors at once"], mock: <EmailMock /> },
  { key: "pipeline", label: "Pipeline", icon: "📊", title: "A pipeline that tells you what to do next", desc: "Ten-stage pipeline, Kanban board, AI engagement scoring and a daily priority list — so nothing goes cold and no major gift slips through.", bullets: ["Drag-and-drop Kanban", "AI priority leaderboard", "Going-cold alerts"], mock: <NetworkMock /> },
  { key: "dash", label: "Dashboard", icon: "📈", title: "Your whole shop, at a glance", desc: "Pipeline value, tier breakdown, response rates and weekly activity — the numbers your board asks about, live and exportable.", bullets: ["Real-time fundraising metrics", "Board-ready reporting", "Full audit trail"], mock: <DashboardMock /> },
];

const FEATURES = [
  { icon: "🧠", title: "AI Org Intelligence", desc: "AI researches your mission, programs and known donors, then builds talking points for every outreach." },
  { icon: "🎯", title: "Cause Match Scoring", desc: "Every donor gets a match % against YOUR mission. Focus on donors who care about what you do." },
  { icon: "✉️", title: "AI Email Generation", desc: "One click drafts personalized outreach from your org's talking points and donor intel." },
  { icon: "🕸️", title: "Social Graph Mapping", desc: "Import LinkedIn + Google contacts. AI maps the shortest warm intro path to every donor." },
  { icon: "📊", title: "Pipeline Intelligence", desc: "10-stage pipeline, Kanban, engagement scoring, priority leaderboard and conversion analytics." },
  { icon: "🔌", title: "Platform Integrations", desc: "Connect IsraelGives, Donorbox, Charidy, Givebutter and more. Sync donors automatically." },
  { icon: "📨", title: "Batch Campaigns", desc: "Send personalized emails to 50 donors at once — each one tailored with merge fields and context." },
  { icon: "🕯️", title: "Jewish Calendar Aware", desc: "Yahrzeit reminders, chai-multiple asks and giving windows tuned to the Jewish calendar." },
  { icon: "📜", title: "Audit & Compliance", desc: "Every action logged. Full audit trail for board reporting and accountability. Export anytime." },
];

const ORGS = [
  { type: "Yeshivas", icon: "📖" }, { type: "Synagogues", icon: "🕍" }, { type: "Day Schools", icon: "🏫" },
  { type: "Federations", icon: "🏛️" }, { type: "Chesed Orgs", icon: "🤲" }, { type: "Israel Orgs", icon: "🇮🇱" },
  { type: "Camps & Youth", icon: "⛺" }, { type: "Advocacy", icon: "📢" },
];

const STATS = [
  { value: 18, suffix: "×", label: "The chai multiplier on your impact" },
  { value: 30, suffix: " sec", label: "To AI-research your entire org" },
  { value: 5, suffix: " min", label: "From signup to first outreach" },
  { value: 100, suffix: "%", label: "Of actions logged for your board" },
];

const FAQ = [
  { q: "Do I need to migrate my data first?", a: "No. Start empty and add donors as you go, or import a CSV/JSON export from your current tool in one step. No IT project, no migration weekend." },
  { q: "Is my donor data private and secure?", a: "Yes. Every organization's data is fully isolated — no one outside your org can see your donors. Auth is password-protected, all actions are logged, and we never share or sell your data." },
  { q: "How does the AI know about my organization?", a: "You enter your org name and website once. The AI researches your mission, programs, focus areas and publicly-known donors, then uses that to score donors by cause-match and draft personalized outreach." },
  { q: "What does 'cause match' actually mean?", a: "Each donor gets a 0–100% score showing how closely their interests, giving history and affiliations line up with your specific mission — so you prioritize the donors most likely to say yes." },
  { q: "Can my whole team use it?", a: "Yes. Starter includes 1 seat, Professional includes 5, and Enterprise is unlimited — with roles for admins, managers, fundraisers and view-only board members." },
  { q: "What does it cost?", a: "Starter is free forever (up to 100 donors). Professional is $149/mo with unlimited donors and the full AI suite, including a 14-day free trial. Enterprise is custom for federations and large institutions." },
  { q: "Why is it built specifically for Jewish organizations?", a: "Because generic CRMs don't speak your language. ChaiRaise understands chai-aligned ask amounts, yahrzeit reminders, the Jewish giving calendar, and the community structures — yeshivas, shuls, federations — that drive Jewish philanthropy." },
];

// ============================================================
// Count-up animation for the stats band
// ============================================================
function useCountUp(target, run) {
  // Initialize at the target so server-rendered and pre-scroll views show the
  // real number, never a wall of zeros. The count-up plays once `run` is true.
  const [n, setN] = useState(target);
  useEffect(() => {
    if (!run) return;
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / 1100, 1);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

function Stat({ value, suffix, label, run }) {
  const n = useCountUp(value, run);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 44, fontWeight: 800, color: C.accent, letterSpacing: -1, lineHeight: 1 }}>{n}{suffix}</div>
      <div style={{ fontSize: 12, color: C.text3, marginTop: 8, maxWidth: 180, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>{label}</div>
    </div>
  );
}

// ============================================================
// CONTACT / SALES MODAL
// ============================================================
function ContactModal({ plan, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", org: "", message: "", website: "" });
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [err, setErr] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.message) { setErr("Email and a short message are required."); return; }
    setState("sending"); setErr("");
    try {
      const r = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, plan }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Something went wrong."); setState("error"); return; }
      setState("sent");
    } catch {
      setErr("Could not send. Please email hello@chairaise.com."); setState("error");
    }
  };

  const field = { width: "100%", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 16, padding: 28 }}>
        {state === "sent" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Thanks — we&apos;ll be in touch</h3>
            <p style={{ fontSize: 14, color: C.text3, lineHeight: 1.6, marginBottom: 20 }}>Your message is on its way. We typically reply within one business day.</p>
            <button onClick={onClose} style={{ padding: "11px 24px", background: C.accent, color: "#09090b", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800 }}>Talk to us</h3>
              <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.text3, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: C.text3, marginBottom: 18 }}>Tell us about your organization and we&apos;ll get right back to you{plan ? ` about ${plan}` : ""}.</p>
            <form onSubmit={submit}>
              <input style={field} placeholder="Your name" value={form.name} onChange={set("name")} />
              <input style={field} type="email" placeholder="Work email *" value={form.email} onChange={set("email")} required />
              <input style={field} placeholder="Organization" value={form.org} onChange={set("org")} />
              <textarea style={{ ...field, minHeight: 90, resize: "vertical" }} placeholder="How can we help? *" value={form.message} onChange={set("message")} required />
              {/* honeypot — hidden from humans */}
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} aria-hidden="true" />
              {err && <div style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", padding: "8px 12px", borderRadius: 6, fontSize: 12, marginBottom: 10 }}>{err}</div>}
              <button type="submit" disabled={state === "sending"} style={{ width: "100%", padding: 12, background: C.accent, color: "#09090b", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: state === "sending" ? 0.6 : 1 }}>
                {state === "sending" ? "Sending…" : "Send message"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function LandingPage() {
  const [tab, setTab] = useState("intel");
  const [openFaq, setOpenFaq] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [contactPlan, setContactPlan] = useState(null); // null = closed; string = open + interest
  const [statsRun, setStatsRun] = useState(false);
  const statsRef = useRef(null);
  const active = SHOWCASE.find((s) => s.key === tab);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setStatsRun(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>
      <style>{`
        .cr-card { transition: border-color .2s ease, transform .2s ease, background .2s ease; }
        .cr-card:hover { border-color: ${C.accent} !important; transform: translateY(-3px); }
        .cr-cta { transition: filter .15s ease, transform .15s ease; }
        .cr-cta:hover { filter: brightness(1.06); transform: translateY(-1px); }
        .cr-tab { transition: all .15s ease; }
        .cr-link:hover { color: ${C.text} !important; }
        .cr-fade { animation: crFade .5s ease both; }
        @keyframes crFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes crPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); } 50% { box-shadow: 0 0 0 14px rgba(245,158,11,0); } }
        .cr-play { animation: crPulse 2.2s infinite; }
        @media (max-width: 980px) {
          .cr-hero { grid-template-columns: 1fr !important; text-align: center; }
          .cr-hero-cta { justify-content: center !important; }
          .cr-show { grid-template-columns: 1fr !important; }
          .cr-2col { grid-template-columns: 1fr !important; }
          .cr-grid3 { grid-template-columns: repeat(2,1fr) !important; }
          .cr-stats { grid-template-columns: repeat(2,1fr) !important; gap: 32px !important; }
          .cr-hide-sm { display: none !important; }
        }
        @media (max-width: 620px) {
          .cr-grid3, .cr-gridp, .cr-orgs { grid-template-columns: 1fr !important; }
          .cr-hero-h1 { font-size: 40px !important; }
          .cr-nav-link { display: none !important; }
        }
      `}</style>

      {/* ===== NAV ===== */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(9,9,11,0.8)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`, height: 60, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#09090b" }}>CR</div>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>ChaiRaise</span>
          </div>
          <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
            <a className="cr-nav-link cr-link" href="#product" style={{ color: C.text2, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>Product</a>
            <a className="cr-nav-link cr-link" href="#features" style={{ color: C.text2, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>Features</a>
            <a className="cr-nav-link cr-link" href="#pricing" style={{ color: C.text2, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>Pricing</a>
            <a className="cr-nav-link cr-link" href="#faq" style={{ color: C.text2, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>FAQ</a>
            <Link className="cr-nav-link cr-link" href="/auth/signin" style={{ color: C.text2, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>Sign In</Link>
            <Link className="cr-cta" href="/auth/signin" style={{ padding: "8px 18px", background: C.accent, color: "#09090b", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO (asymmetric) ===== */}
      <section style={{ borderBottom: `1px solid ${C.border}`, background: "radial-gradient(ellipse 80% 50% at 70% 0%, rgba(245,158,11,0.10), transparent 60%)" }}>
        <div className="cr-hero" style={{ maxWidth: 1180, margin: "0 auto", padding: "108px 24px 56px", display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 20, background: C.accentSoft, color: C.accent, fontSize: 12, fontWeight: 600, marginBottom: 22 }}>
              ✨ The first AI-native CRM for Jewish fundraising
            </div>
            <h1 className="cr-hero-h1" style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, marginBottom: 18 }}>
              Multiply your<br />impact by <span style={{ color: C.accent }}>18</span>
            </h1>
            <p style={{ fontSize: 18, color: C.text2, lineHeight: 1.6, marginBottom: 28, maxWidth: 480 }}>
              ChaiRaise researches your donors, scores them by cause match and writes the outreach — so yeshivas, shuls and federations raise more in less time.
            </p>
            <div className="cr-hero-cta" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="cr-cta" href="/auth/signin" style={{ padding: "14px 30px", background: C.accent, color: "#09090b", borderRadius: 10, fontSize: 16, fontWeight: 700, textDecoration: "none", boxShadow: "0 6px 24px rgba(245,158,11,0.3)" }}>Start Free →</Link>
              <button className="cr-cta" onClick={() => setShowVideo(true)} style={{ padding: "14px 26px", background: "transparent", color: C.text, borderRadius: 10, fontSize: 16, fontWeight: 600, border: `1px solid ${C.border2}`, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: C.accent, color: "#09090b", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>▶</span>
                Watch 2-min demo
              </button>
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 22, flexWrap: "wrap", fontSize: 12, color: C.text3 }}>
              <span>✓ No credit card</span><span>✓ Free forever tier</span><span>✓ Set up in 5 minutes</span>
            </div>
          </div>
          <div className="cr-fade"><DashboardMock /></div>
        </div>
      </section>

      {/* ===== LOGO / ORG STRIP ===== */}
      <section style={{ borderBottom: `1px solid ${C.border}`, padding: "22px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ fontSize: 11, color: C.text4, textTransform: "uppercase", letterSpacing: 1, marginRight: 8 }}>Built for every corner of the Jewish world</span>
          {ORGS.map((o) => (<span key={o.type} style={{ fontSize: 13, color: C.text3 }}>{o.icon} {o.type}</span>))}
        </div>
      </section>

      {/* ===== INTERACTIVE PRODUCT SHOWCASE ===== */}
      <section id="product" style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ maxWidth: 640, marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>The product</div>
          <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15, marginBottom: 12 }}>One workspace, from first contact to committed gift</h2>
          <p style={{ fontSize: 16, color: C.text3, lineHeight: 1.6 }}>Click through the tools your team uses every day.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
          {SHOWCASE.map((s) => (
            <button key={s.key} className="cr-tab" onClick={() => setTab(s.key)} style={{
              padding: "9px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              border: `1px solid ${tab === s.key ? C.accent : C.border}`,
              background: tab === s.key ? C.accentSoft : "transparent",
              color: tab === s.key ? C.accent : C.text2,
            }}>{s.icon} {s.label}</button>
          ))}
        </div>
        <div className="cr-show" style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 40, alignItems: "center" }}>
          <div key={tab} className="cr-fade">
            <h3 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 14 }}>{active.title}</h3>
            <p style={{ fontSize: 15, color: C.text2, lineHeight: 1.7, marginBottom: 20 }}>{active.desc}</p>
            {active.bullets.map((b) => (
              <div key={b} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: C.accentSoft, color: C.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: C.text }}>{b}</span>
              </div>
            ))}
          </div>
          <div key={tab + "m"} className="cr-fade">{active.mock}</div>
        </div>
      </section>

      {/* ===== DEMO VIDEO BAND ===== */}
      <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(245,158,11,0.06), transparent 70%)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 10 }}>See ChaiRaise in two minutes</h2>
          <p style={{ fontSize: 15, color: C.text3, marginBottom: 28 }}>Watch how a cold list becomes a warm pipeline — research, match, draft, send, track.</p>
          <button onClick={() => setShowVideo(true)} style={{ position: "relative", display: "block", width: "100%", border: "none", padding: 0, cursor: "pointer", borderRadius: 14, overflow: "hidden", background: "transparent" }}>
            <div style={{ pointerEvents: "none" }}><DashboardMock /></div>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(9,9,11,0.35)" }}>
              <span className="cr-play" style={{ width: 64, height: 64, borderRadius: "50%", background: C.accent, color: "#09090b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, paddingLeft: 4 }}>▶</span>
            </span>
          </button>
        </div>
      </section>

      {/* ===== FEATURE BENTO ===== */}
      <section id="features" style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ maxWidth: 620, marginBottom: 36 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Everything you need</div>
          <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15 }}>Built to raise more, with less busywork</h2>
        </div>
        <div className="cr-grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="cr-card" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
              <div style={{ fontSize: 26, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 7 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: C.text3, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== STATS BAND ===== */}
      <section ref={statsRef} style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.surface, padding: "56px 24px" }}>
        <div className="cr-stats" style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
          {STATS.map((s) => (<Stat key={s.label} {...s} run={statsRun} />))}
        </div>
      </section>

      {/* ===== HOW IT WORKS (left timeline) ===== */}
      <section id="how" style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 24px" }}>
        <div className="cr-2col" style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 48, alignItems: "start" }}>
          <div style={{ position: "sticky", top: 90 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>How it works</div>
            <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15, marginBottom: 14 }}>Up and running in 5 minutes</h2>
            <p style={{ fontSize: 15, color: C.text3, lineHeight: 1.7, marginBottom: 24 }}>No IT department. No migration weekend. Just sign up and start raising.</p>
            <Link className="cr-cta" href="/auth/signin" style={{ display: "inline-block", padding: "12px 26px", background: C.accent, color: "#09090b", borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>Start Free →</Link>
          </div>
          <div>
            {[
              { n: "1", t: "Enter your org", d: "Name and website. AI researches your mission, programs and known donors in seconds." },
              { n: "2", t: "Add or import donors", d: "Start fresh or import a CSV/JSON export. We tier and score every donor by cause match." },
              { n: "3", t: "Let AI draft outreach", d: "One click writes personalized emails from your talking points and each donor's intel." },
              { n: "4", t: "Send, track, close", d: "Move donors through the pipeline, get going-cold alerts and a daily priority list." },
            ].map((s, i, arr) => (
              <div key={s.n} style={{ display: "flex", gap: 18, paddingBottom: i === arr.length - 1 ? 0 : 26 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.accentSoft, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0, border: `1px solid rgba(245,158,11,0.3)` }}>{s.n}</div>
                  {i !== arr.length - 1 && <div style={{ width: 2, flex: 1, background: C.border, marginTop: 6 }} />}
                </div>
                <div style={{ paddingTop: 6 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{s.t}</h3>
                  <p style={{ fontSize: 14, color: C.text3, lineHeight: 1.6 }}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ORIGIN: honest founder credibility, no anonymous testimonials ===== */}
      <section style={{ borderTop: `1px solid ${C.border}`, padding: "64px 24px", background: "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(245,158,11,0.05), transparent 70%)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 16 }}>✡️</div>
          <blockquote style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.5, letterSpacing: -0.5, margin: "0 0 18px" }}>
            &ldquo;ChaiRaise wasn&apos;t built in a lab. I built it running a live $12M campaign for a
            360-student Torah institution in Haifa, managing a pipeline of 110+ major donors.
            Every feature exists because the campaign needed it.&rdquo;
          </blockquote>
          <p style={{ fontSize: 13, color: C.text3 }}>— Yuri Kruman, founder of ChaiRaise. 3x CHRO, fundraising strategist, executive coach to 2,300+ leaders.</p>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" style={{ maxWidth: 1080, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, marginBottom: 10 }}>Simple, transparent pricing</h2>
          <p style={{ fontSize: 16, color: C.text3 }}>Start free. Upgrade when you&apos;re ready to raise more.</p>
        </div>
        <div className="cr-gridp" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, alignItems: "start" }}>
          {[
            { name: "Starter", price: "Free", note: "Forever", desc: "For small organizations getting started", feats: ["Up to 100 donors", "AI email generation", "Pipeline & Kanban board", "CSV import / export", "1 team member"], cta: "Get Started", highlight: false },
            { name: "Professional", price: "$149", per: "/mo", note: "Billed annually · 14-day trial", desc: "For growing organizations", feats: ["Unlimited donors", "AI Org Intelligence", "Cause match scoring", "Social graph mapping", "Platform integrations", "Batch campaigns", "5 team members", "Priority support"], cta: "Start Free Trial", highlight: true },
            { name: "Enterprise", price: "Custom", note: "Let's talk", desc: "For federations & large institutions", feats: ["Everything in Pro", "Multi-org management", "Custom integrations", "Dedicated onboarding", "SLA & compliance", "Unlimited team members", "White-label option"], cta: "Contact Sales", highlight: false },
          ].map((p) => (
            <div key={p.name} style={{ background: C.surface, border: `${p.highlight ? 2 : 1}px solid ${p.highlight ? C.accent : C.border}`, borderRadius: 16, padding: 28, position: "relative" }}>
              {p.highlight && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: C.accent, color: "#09090b", padding: "3px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>MOST POPULAR</div>}
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 3 }}>{p.name}</h3>
              <p style={{ fontSize: 12, color: C.text3, marginBottom: 14 }}>{p.desc}</p>
              <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>{p.price}<span style={{ fontSize: 15, fontWeight: 500, color: C.text3 }}>{p.per || ""}</span></div>
              <p style={{ fontSize: 11, color: C.text4, marginBottom: 20 }}>{p.note}</p>
              {p.name === "Enterprise" ? (
                <button className="cr-cta" onClick={() => setContactPlan("Enterprise")} style={{ display: "block", width: "100%", textAlign: "center", padding: 12, borderRadius: 9, fontSize: 14, fontWeight: 700, marginBottom: 20, background: "transparent", color: C.text, border: `1px solid ${C.border2}`, cursor: "pointer", fontFamily: "inherit" }}>{p.cta}</button>
              ) : (
                <Link className="cr-cta" href={p.name === "Professional" ? "/auth/signin?upgrade=1" : "/auth/signin"} style={{ display: "block", textAlign: "center", padding: 12, borderRadius: 9, fontSize: 14, fontWeight: 700, textDecoration: "none", marginBottom: 20, background: p.highlight ? C.accent : "transparent", color: p.highlight ? "#09090b" : C.text, border: p.highlight ? "none" : `1px solid ${C.border2}` }}>{p.cta}</Link>
              )}
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13, color: C.text2, lineHeight: 1.9 }}>
                {p.feats.map((f) => (<li key={f}>✓ {f}</li>))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FAQ (accordion) ===== */}
      <section id="faq" style={{ borderTop: `1px solid ${C.border}`, padding: "72px 24px" }}>
        <div className="cr-2col" style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: 48, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>FAQ</div>
            <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15, marginBottom: 12 }}>Questions, answered</h2>
            <p style={{ fontSize: 14, color: C.text3, lineHeight: 1.7 }}>Still curious? Email <a href="mailto:hello@chairaise.com" style={{ color: C.accent, textDecoration: "none" }}>hello@chairaise.com</a> and we&apos;ll get right back to you.</p>
          </div>
          <div>
            {FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <button onClick={() => setOpenFaq(open ? -1 : i)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "18px 0", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{item.q}</span>
                    <span style={{ fontSize: 20, color: C.accent, flexShrink: 0, transition: "transform .2s", transform: open ? "rotate(45deg)" : "none" }}>+</span>
                  </button>
                  {open && <p className="cr-fade" style={{ fontSize: 14, color: C.text2, lineHeight: 1.7, padding: "0 0 18px", margin: 0, maxWidth: 620 }}>{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section style={{ borderTop: `1px solid ${C.border}`, padding: "80px 24px", textAlign: "center", background: "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(245,158,11,0.12), transparent 70%)" }}>
        <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.5, marginBottom: 14, lineHeight: 1.1 }}>Ready to raise smarter?</h2>
        <p style={{ fontSize: 17, color: C.text3, maxWidth: 480, margin: "0 auto 30px", lineHeight: 1.6 }}>Join the next generation of Jewish fundraising. Set up in 5 minutes — no credit card.</p>
        <Link className="cr-cta" href="/auth/signin" style={{ display: "inline-block", padding: "16px 40px", background: C.accent, color: "#09090b", borderRadius: 12, fontSize: 18, fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 30px rgba(245,158,11,0.35)" }}>Get Started Free →</Link>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "32px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 22, height: 22, background: C.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 9, color: "#09090b" }}>CR</div>
              <span style={{ fontSize: 14, fontWeight: 700 }}>ChaiRaise</span>
            </div>
            <p style={{ fontSize: 11, color: C.text4 }}>Multiply your impact by 18.</p>
          </div>
          <div style={{ display: "flex", gap: 22 }}>
            <a href="mailto:hello@chairaise.com" className="cr-link" style={{ color: C.text3, fontSize: 12, textDecoration: "none" }}>Contact</a>
            <a href="/security" className="cr-link" style={{ color: C.accent, fontSize: 12, textDecoration: "none", fontWeight: 600 }}>Security</a>
            <a href="/privacy" className="cr-link" style={{ color: C.text3, fontSize: 12, textDecoration: "none" }}>Privacy</a>
            <a href="/terms" className="cr-link" style={{ color: C.text3, fontSize: 12, textDecoration: "none" }}>Terms</a>
          </div>
          <p style={{ fontSize: 11, color: C.text4 }}>© 2026 ChaiRaise. All rights reserved.</p>
        </div>
      </footer>

      {/* ===== VIDEO MODAL ===== */}
      {showVideo && (
        <div onClick={() => setShowVideo(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 880, background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>ChaiRaise — Product Demo</span>
              <button onClick={() => setShowVideo(false)} style={{ background: "transparent", border: "none", color: C.text3, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            {DEMO_VIDEO_URL ? (
              <div style={{ position: "relative", paddingTop: "56.25%" }}>
                <iframe src={DEMO_VIDEO_URL} title="ChaiRaise demo" allow="accelerated-encoding; autoplay; fullscreen" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} />
              </div>
            ) : (
              <div style={{ padding: "48px 32px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>🎬</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>The full walkthrough is on its way</h3>
                <p style={{ fontSize: 14, color: C.text3, lineHeight: 1.7, maxWidth: 460, margin: "0 auto 24px" }}>
                  Want the fastest tour? Jump straight into the live demo — it takes about two minutes to see research, AI drafting and the pipeline in action.
                </p>
                <Link className="cr-cta" href="/auth/signin" style={{ display: "inline-block", padding: "13px 30px", background: C.accent, color: "#09090b", borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>Try the live demo →</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CONTACT / SALES MODAL ===== */}
      {contactPlan && <ContactModal plan={contactPlan} onClose={() => setContactPlan(null)} />}
    </div>
  );
}

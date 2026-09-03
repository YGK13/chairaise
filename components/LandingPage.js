'use client';
// ============================================================
// ChaiRaise — Public homepage
//
// Outcome-first marketing surface for nonprofit development directors and
// executive directors. All copy, samples, pricing and FAQ come from
// content/site.js so the page, the JSON-LD and the tests share one source.
// Brand: dark + amber. Sample organizations and donors are fictional.
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  SITE, PRICING, PROOF, SAMPLES, STEPS, OUTCOMES, TRUST, COMPARISON, FAQ, SISTER_LINKS,
} from "@/content/site";

const C = {
  bg: "#09090b", surface: "#161618", surface2: "#1d1d20", border: "#27272a",
  border2: "#3f3f46", text: "#fafafa", text2: "#a1a1aa", text3: "#71717a",
  text4: "#52525b", accent: "#f59e0b", accentSoft: "rgba(245,158,11,0.12)",
  green: "#22c55e",
};

// Lightweight CTA tracking: no analytics vendor is installed, so we emit to a
// dataLayer if one exists and fire a DOM event any future snippet can hook.
function trackCta(name, meta = {}) {
  if (typeof window === "undefined") return;
  try {
    (window.dataLayer = window.dataLayer || []).push({ event: "cta_click", cta: name, ...meta });
    window.dispatchEvent(new CustomEvent("cr:cta", { detail: { name, ...meta } }));
  } catch { /* analytics must never break navigation */ }
}

const CSS = `
  .cr-root { --bg:${C.bg}; --surface:${C.surface}; --surface2:${C.surface2}; --border:${C.border}; --border2:${C.border2}; --text:${C.text}; --text2:${C.text2}; --text3:${C.text3}; --text4:${C.text4}; --accent:${C.accent}; --accent-soft:${C.accentSoft}; --green:${C.green};
    background:var(--bg); color:var(--text); font-family:'Inter',system-ui,-apple-system,"Segoe UI",sans-serif; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
  .cr-root *:focus-visible { outline:2px solid var(--accent); outline-offset:3px; border-radius:6px; }
  .cr-wrap { max-width:1180px; margin:0 auto; padding:0 24px; }
  .cr-section { padding:80px 0; }
  .cr-eyebrow { font-size:12px; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:1px; margin:0 0 12px; }
  .cr-h2 { font-size:38px; font-weight:800; letter-spacing:-1px; line-height:1.12; margin:0 0 14px; }
  .cr-lead { font-size:16px; color:var(--text3); line-height:1.65; margin:0; }
  .cr-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:13px 26px; border-radius:10px; font-size:15px; font-weight:700; text-decoration:none; border:1px solid transparent; cursor:pointer; font-family:inherit; transition:transform .15s ease, filter .15s ease, background .15s ease; line-height:1.2; }
  .cr-btn:hover { transform:translateY(-1px); filter:brightness(1.06); }
  .cr-btn-primary { background:var(--accent); color:#09090b; box-shadow:0 6px 24px rgba(245,158,11,0.28); }
  .cr-btn-ghost { background:transparent; color:var(--text); border-color:var(--border2); }
  .cr-btn-ghost:hover { background:rgba(255,255,255,0.04); }
  .cr-btn-sm { padding:8px 16px; font-size:13px; border-radius:8px; }
  .cr-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:22px; transition:border-color .2s ease, transform .2s ease; }
  .cr-card:hover { border-color:var(--accent); transform:translateY(-3px); }
  .cr-grid-2 { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
  .cr-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .cr-grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
  .cr-link { color:var(--text2); text-decoration:none; transition:color .15s; }
  .cr-link:hover { color:var(--text); }
  .cr-chip { display:inline-flex; align-items:center; gap:6px; padding:5px 10px; border-radius:20px; background:var(--surface2); border:1px solid var(--border); color:var(--text2); font-size:12px; font-weight:500; }
  .cr-doc { background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.45); }
  .cr-doc-head { display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding:12px 16px; border-bottom:1px solid var(--border); background:rgba(255,255,255,0.02); font-size:12px; color:var(--text3); }
  .cr-doc-body { padding:18px 20px; }
  .cr-doc-subject { font-size:14px; font-weight:700; margin:0 0 12px; color:var(--text); }
  .cr-doc-body p { font-size:13px; line-height:1.7; color:var(--text2); margin:0 0 10px; }
  .cr-doc-body p:last-child { margin-bottom:0; }
  .cr-doc-foot { padding:10px 16px; border-top:1px solid var(--border); font-size:11px; color:var(--text4); display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; }
  .cr-merge { background:rgba(245,158,11,0.16); color:#fcd34d; padding:0 4px; border-radius:4px; font-family:'JetBrains Mono',ui-monospace,monospace; font-size:12px; }
  .cr-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px; }
  .cr-tab { padding:9px 16px; border-radius:9px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; border:1px solid var(--border); background:transparent; color:var(--text2); transition:all .15s ease; }
  .cr-tab[aria-selected="true"] { border-color:var(--accent); background:var(--accent-soft); color:var(--accent); }
  .cr-faq-item { border-bottom:1px solid var(--border); }
  .cr-faq-q { width:100%; display:flex; justify-content:space-between; align-items:center; gap:16px; padding:18px 0; background:transparent; border:none; cursor:pointer; font-family:inherit; text-align:left; color:var(--text); font-size:15px; font-weight:600; }
  .cr-faq-q span:last-child { font-size:22px; color:var(--accent); flex-shrink:0; transition:transform .2s; line-height:1; }
  .cr-faq-q[aria-expanded="true"] span:last-child { transform:rotate(45deg); }
  .cr-faq-a { font-size:14px; color:var(--text2); line-height:1.7; padding:0 0 18px; margin:0; max-width:680px; }
  .cr-table-wrap { overflow-x:auto; border:1px solid var(--border); border-radius:14px; }
  .cr-table { width:100%; border-collapse:collapse; font-size:13px; min-width:640px; }
  .cr-table th, .cr-table td { padding:12px 14px; text-align:left; border-bottom:1px solid var(--border); vertical-align:top; line-height:1.5; }
  .cr-table th { font-size:12px; text-transform:uppercase; letter-spacing:.5px; color:var(--text3); background:rgba(255,255,255,0.02); }
  .cr-table tr:last-child td { border-bottom:none; }
  .cr-table td:first-child { color:var(--text); font-weight:600; }
  .cr-table td { color:var(--text2); }
  .cr-table td.cr-us { color:var(--text); background:rgba(245,158,11,0.06); }
  .cr-table th.cr-us { color:var(--accent); }
  .cr-nav { position:fixed; top:0; left:0; right:0; z-index:100; background:rgba(9,9,11,0.82); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border-bottom:1px solid var(--border); height:60px; }
  .cr-nav-inner { height:100%; display:flex; align-items:center; justify-content:space-between; gap:16px; }
  .cr-nav-links { display:flex; gap:20px; align-items:center; }
  .cr-nav-links a { font-size:13px; font-weight:500; }
  .cr-burger { display:none; background:transparent; border:1px solid var(--border2); color:var(--text); border-radius:8px; padding:7px 10px; cursor:pointer; font-family:inherit; font-size:13px; }
  .cr-mobile-menu { display:none; }
  .cr-hero { display:grid; grid-template-columns:1.05fr 1fr; gap:48px; align-items:center; padding:120px 0 64px; }
  .cr-h1 { font-size:54px; font-weight:800; line-height:1.06; letter-spacing:-2px; margin:0 0 18px; }
  .cr-hero-p { font-size:18px; color:var(--text2); line-height:1.6; margin:0 0 26px; max-width:520px; }
  .cr-hero-cta { display:flex; gap:12px; flex-wrap:wrap; }
  .cr-hero-trust { display:flex; gap:10px; margin-top:22px; flex-wrap:wrap; }
  .cr-proof { border-top:1px solid var(--border); border-bottom:1px solid var(--border); background:var(--surface); padding:32px 0; }
  .cr-proof-val { font-size:36px; font-weight:800; color:var(--accent); letter-spacing:-1px; line-height:1; }
  .cr-proof-lbl { font-size:13px; color:var(--text3); margin-top:8px; line-height:1.5; }
  .cr-steps { display:grid; grid-template-columns:0.9fr 1.1fr; gap:48px; align-items:start; }
  .cr-step { display:flex; gap:18px; }
  .cr-step-n { width:40px; height:40px; border-radius:50%; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:16px; flex-shrink:0; border:1px solid rgba(245,158,11,0.3); }
  .cr-step h3 { font-size:17px; font-weight:700; margin:6px 0 6px; }
  .cr-step p { font-size:14px; color:var(--text3); line-height:1.6; margin:0; }
  .cr-samples { display:grid; grid-template-columns:0.9fr 1.1fr; gap:40px; align-items:start; }
  .cr-pricing { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; align-items:start; }
  .cr-price-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:28px; position:relative; }
  .cr-price-card.hl { border:2px solid var(--accent); }
  .cr-price-card ul { list-style:none; padding:0; margin:0; font-size:13px; color:var(--text2); line-height:1.9; }
  .cr-newsletter { display:flex; gap:10px; flex-wrap:wrap; position:relative; }
  .cr-input { flex:1; min-width:220px; padding:12px 14px; background:var(--bg); border:1px solid var(--border2); border-radius:10px; color:var(--text); font-size:14px; font-family:inherit; }
  .cr-footer-grid { display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr; gap:32px; }
  .cr-footer h4 { font-size:12px; text-transform:uppercase; letter-spacing:.8px; color:var(--text3); margin:0 0 12px; }
  .cr-footer ul { list-style:none; padding:0; margin:0; }
  .cr-footer li { margin-bottom:8px; font-size:13px; }
  .cr-portlev { border-top:1px solid var(--border); padding:18px 0; font-size:12px; color:var(--text4); display:flex; flex-wrap:wrap; gap:8px 14px; align-items:center; }
  .cr-portlev a { color:var(--text3); text-decoration:none; }
  .cr-portlev a:hover { color:var(--accent); }
  .cr-sticky { display:none; }
  .cr-js .cr-reveal { opacity:0; transform:translateY(14px); transition:opacity .55s ease, transform .55s ease; }
  .cr-js .cr-reveal.is-in { opacity:1; transform:none; }
  @media (prefers-reduced-motion: reduce) { .cr-js .cr-reveal { opacity:1; transform:none; transition:none; } .cr-btn:hover, .cr-card:hover { transform:none; } }
  @media (max-width: 980px) {
    .cr-hero { grid-template-columns:1fr; padding-top:100px; }
    .cr-steps, .cr-samples { grid-template-columns:1fr; gap:28px; }
    .cr-grid-3 { grid-template-columns:repeat(2,1fr); }
    .cr-grid-4 { grid-template-columns:repeat(2,1fr); gap:24px; }
    .cr-footer-grid { grid-template-columns:1fr 1fr; }
    .cr-pricing { grid-template-columns:1fr; }
    .cr-sticky-top { position:static !important; }
  }
  @media (max-width: 720px) {
    .cr-section { padding:56px 0; }
    .cr-h1 { font-size:36px; letter-spacing:-1.2px; }
    .cr-h2 { font-size:28px; }
    .cr-hero-p { font-size:16px; }
    .cr-grid-2, .cr-grid-3 { grid-template-columns:1fr; }
    .cr-nav-links { display:none; }
    .cr-burger { display:inline-flex; }
    .cr-mobile-menu[data-open="true"] { display:flex; flex-direction:column; gap:4px; position:fixed; top:60px; left:0; right:0; background:var(--bg); border-bottom:1px solid var(--border); padding:12px 24px 18px; z-index:99; }
    .cr-mobile-menu a { padding:12px 4px; font-size:16px; border-bottom:1px solid var(--border); }
    .cr-sticky { display:flex; position:fixed; left:0; right:0; bottom:0; z-index:90; gap:10px; align-items:center; justify-content:space-between; padding:10px 16px calc(10px + env(safe-area-inset-bottom)); background:rgba(9,9,11,0.94); backdrop-filter:blur(10px); border-top:1px solid var(--border); }
    .cr-sticky span { font-size:12px; color:var(--text3); }
    .cr-root { padding-bottom:70px; }
  }
`;

// ------------------------------------------------------------
// Sample output document card
// ------------------------------------------------------------
function withMergeFields(text) {
  const parts = text.split(/(\{[A-Za-z_]+\})/g);
  return parts.map((p, i) => (/^\{[A-Za-z_]+\}$/.test(p) ? <span key={i} className="cr-merge">{p}</span> : p));
}

function SampleDoc({ sample, compact = false }) {
  return (
    <figure className="cr-doc" style={{ margin: 0 }}>
      <div className="cr-doc-head">
        <span style={{ fontWeight: 700, color: C.text2 }}>{sample.kind}</span>
        <span aria-hidden="true">·</span>
        {sample.inputs.map((i) => (<span key={i} className="cr-chip" style={{ padding: "3px 8px", fontSize: 11 }}>{i}</span>))}
      </div>
      <div className="cr-doc-body">
        {sample.meta && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 14 }}>
            {sample.meta.map(([k, v]) => (
              <div key={k} style={{ background: C.surface2, borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: C.text3, textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: k === "Suggested ask" ? C.accent : k === "Cause match" ? C.green : C.text }}>{v}</div>
              </div>
            ))}
          </div>
        )}
        {sample.subject && <p className="cr-doc-subject">Subject: {withMergeFields(sample.subject)}</p>}
        {(compact ? sample.body.slice(0, 4) : sample.body).map((p, i) => (<p key={i}>{withMergeFields(p)}</p>))}
      </div>
      <figcaption className="cr-doc-foot">
        <span>Sample output. Fictional organization and donor.</span>
        <span>Every draft is editable before it is sent.</span>
      </figcaption>
    </figure>
  );
}

// ------------------------------------------------------------
// Contact / sales modal (posts to the existing /api/contact route)
// ------------------------------------------------------------
function ContactModal({ plan, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", org: "", message: "", website: "" });
  const [state, setState] = useState("idle");
  const [err, setErr] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.message) { setErr("Email and a short message are required."); return; }
    setState("sending"); setErr("");
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, plan }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Something went wrong."); setState("error"); return; }
      setState("sent"); trackCta("contact_sent", { plan });
    } catch {
      setErr(`Could not send. Please email ${SITE.contactEmail}.`); setState("error");
    }
  };

  const field = { width: "100%", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10 };
  const label = { display: "block", fontSize: 11, color: C.text3, marginBottom: 4, fontWeight: 600 };

  return (
    <div onClick={onClose} role="presentation" style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="cr-contact-title" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 16, padding: 28 }}>
        {state === "sent" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden="true">✓</div>
            <h3 id="cr-contact-title" style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Thanks, we will be in touch</h3>
            <p style={{ fontSize: 14, color: C.text3, lineHeight: 1.6, marginBottom: 20 }}>Your message is on its way. We typically reply within one business day.</p>
            <button onClick={onClose} className="cr-btn cr-btn-primary">Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <h3 id="cr-contact-title" style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Talk to us</h3>
              <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", color: C.text3, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: C.text3, marginBottom: 18 }}>Tell us about your organization and we will get right back to you{plan ? ` about ${plan}` : ""}.</p>
            <form onSubmit={submit}>
              <label style={label} htmlFor="cr-c-name">Your name</label>
              <input id="cr-c-name" style={field} value={form.name} onChange={set("name")} autoComplete="name" />
              <label style={label} htmlFor="cr-c-email">Work email *</label>
              <input id="cr-c-email" style={field} type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
              <label style={label} htmlFor="cr-c-org">Organization</label>
              <input id="cr-c-org" style={field} value={form.org} onChange={set("org")} autoComplete="organization" />
              <label style={label} htmlFor="cr-c-msg">How can we help? *</label>
              <textarea id="cr-c-msg" style={{ ...field, minHeight: 90, resize: "vertical" }} value={form.message} onChange={set("message")} required />
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} aria-hidden="true" />
              {err && <div role="alert" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", padding: "8px 12px", borderRadius: 6, fontSize: 12, marginBottom: 10 }}>{err}</div>}
              <button type="submit" disabled={state === "sending"} className="cr-btn cr-btn-primary" style={{ width: "100%", opacity: state === "sending" ? 0.6 : 1 }}>
                {state === "sending" ? "Sending…" : "Send message"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Newsletter capture: existing drip route first, Beehiiv link as fallback
// ------------------------------------------------------------
function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle");
  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setState("sending");
    try {
      const r = await fetch("/api/drip/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dripId: SITE.newsletter.dripId, email, source: "chairaise-home" }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok !== false) { setState("sent"); trackCta("newsletter_subscribed"); return; }
      setState("fallback");
    } catch { setState("fallback"); }
  };
  if (state === "sent") return <p style={{ fontSize: 14, color: C.green, margin: 0 }}>You are on the list. Watch for the next issue.</p>;
  return (
    <form onSubmit={submit} className="cr-newsletter" aria-label="Subscribe to The Leverage Brief">
      <label htmlFor="cr-nl-email" style={{ position: "absolute", left: -9999 }}>Email address</label>
      <input id="cr-nl-email" className="cr-input" type="email" required placeholder="you@yourorg.org" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <button type="submit" className="cr-btn cr-btn-primary" disabled={state === "sending"}>{state === "sending" ? "Subscribing…" : "Subscribe"}</button>
      {state === "fallback" && (
        <p style={{ width: "100%", fontSize: 13, color: C.text3, margin: "6px 0 0" }}>
          Our signup service is busy. <a href={SITE.newsletter.url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent }}>Subscribe directly on {SITE.newsletter.name}</a>.
        </p>
      )}
    </form>
  );
}

const SAMPLE_BLURBS = {
  letter: "A 150 to 250 word letter built from the donor's history, affiliations and focus areas plus your org's talking points, ending with a clear meeting ask. Six templates cover alumni, synagogue, prior givers, family legacy, cold prospects and community ties.",
  appeal: "Pick a template, select up to 50 donors, and ChaiRaise drafts one personalized letter per donor with merge fields filled from their record. Review, edit and send from your own mailbox.",
  brief: "Before you write, a three to five sentence brief explains why this donor fits your mission, with a cause-match score, a suggested chai-aligned ask and the best template for them.",
  strategy: "For any donor, an outreach plan: how to open, which hooks will land, the warm-intro path through your network, a first message, a follow-up cadence across email, WhatsApp and calls, and what could go wrong.",
};

const NAV = [
  ["#samples", "Samples"], ["#how", "How it works"], ["#pricing", "Pricing"], ["#faq", "FAQ"], ["/blog", "Blog"], ["/security", "Security"],
];

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------
export default function LandingPage() {
  const [tab, setTab] = useState(SAMPLES[0].key);
  const [openFaq, setOpenFaq] = useState(0);
  const [contactPlan, setContactPlan] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [js, setJs] = useState(false);
  const rootRef = useRef(null);
  const active = SAMPLES.find((s) => s.key === tab) || SAMPLES[0];
  const closeContact = useCallback(() => setContactPlan(null), []);

  // Reveal-on-scroll. Content is fully visible until JS runs, then animates in.
  useEffect(() => {
    setJs(true);
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const els = root.querySelectorAll(".cr-reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const navLink = (href, label, onClick) => (href.startsWith("#")
    ? <a key={href} className="cr-link" href={href} onClick={onClick}>{label}</a>
    : <Link key={href} className="cr-link" href={href} onClick={onClick}>{label}</Link>);

  return (
    <div ref={rootRef} className={`cr-root${js ? " cr-js" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ===== NAV ===== */}
      <header>
        <nav className="cr-nav" aria-label="Primary">
          <div className="cr-wrap cr-nav-inner">
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: C.text }} aria-label="ChaiRaise home">
              <span style={{ width: 30, height: 30, background: C.accent, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#09090b" }} aria-hidden="true">CR</span>
              <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>ChaiRaise</span>
            </Link>
            <div className="cr-nav-links">
              {NAV.map(([href, label]) => navLink(href, label))}
              <Link className="cr-link" href="/auth/signin">Sign in</Link>
              <Link className="cr-btn cr-btn-primary cr-btn-sm" href="/auth/signin" data-cta="nav_start" onClick={() => trackCta("nav_start")}>Start free</Link>
            </div>
            <button className="cr-burger" aria-expanded={menuOpen} aria-controls="cr-mobile-menu" onClick={() => setMenuOpen((o) => !o)}>
              {menuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </nav>
        <div id="cr-mobile-menu" className="cr-mobile-menu" data-open={menuOpen}>
          {NAV.map(([href, label]) => navLink(href, label, () => setMenuOpen(false)))}
          <Link className="cr-link" href="/auth/signin" onClick={() => setMenuOpen(false)}>Sign in</Link>
        </div>
      </header>

      <main id="main-content">
        {/* ===== HERO ===== */}
        <section aria-labelledby="cr-hero-title" style={{ borderBottom: `1px solid ${C.border}`, background: "radial-gradient(ellipse 80% 50% at 70% 0%, rgba(245,158,11,0.10), transparent 60%)" }}>
          <div className="cr-wrap cr-hero">
            <div>
              <p style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 20, background: C.accentSoft, color: C.accent, fontSize: 12, fontWeight: 600, margin: "0 0 22px" }}>
                AI fundraising copilot + donor CRM for nonprofits
              </p>
              <h1 id="cr-hero-title" className="cr-h1">
                Donor letters, appeals and outreach, drafted in <span style={{ color: C.accent }}>minutes</span>, not afternoons.
              </h1>
              <p className="cr-hero-p">
                For development directors and EDs at synagogues, day schools, yeshivas, federations and any mission-driven nonprofit.
                Import your donors; ChaiRaise writes the personalized letter, scores the fit, suggests the chai-aligned ask and tracks the relationship to a committed gift.
              </p>
              <div className="cr-hero-cta">
                <Link className="cr-btn cr-btn-primary" href="/auth/signin" data-cta="hero_start" onClick={() => trackCta("hero_start")}>Start free, no card</Link>
                <a className="cr-btn cr-btn-ghost" href="#samples" data-cta="hero_samples" onClick={() => trackCta("hero_samples")}>See sample outputs</a>
              </div>
              <div className="cr-hero-trust" aria-label="Trust highlights">
                <span className="cr-chip">🔐 Data isolated per organization</span>
                <span className="cr-chip">✉️ Send from your own mailbox</span>
                <span className="cr-chip">📤 Export or delete any time</span>
              </div>
            </div>
            <div className="cr-reveal">
              <SampleDoc sample={SAMPLES[0]} compact />
            </div>
          </div>
        </section>

        {/* ===== PROOF BAR ===== */}
        <section className="cr-proof" aria-label="Product facts">
          <div className="cr-wrap cr-grid-4">
            {PROOF.map((p) => (
              <div key={p.label} className="cr-reveal">
                <div className="cr-proof-val">{p.value}</div>
                <div className="cr-proof-lbl">{p.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== SAMPLE OUTPUTS ===== */}
        <section id="samples" className="cr-section" aria-labelledby="cr-samples-title">
          <div className="cr-wrap">
            <div style={{ maxWidth: 680, marginBottom: 32 }} className="cr-reveal">
              <p className="cr-eyebrow">Sample outputs</p>
              <h2 id="cr-samples-title" className="cr-h2">What ChaiRaise writes for you</h2>
              <p className="cr-lead">Four things a development director produces every week, generated from one donor record and one org profile. Names and organizations below are fictional.</p>
            </div>
            <div className="cr-samples">
              <div>
                <div className="cr-tabs" role="tablist" aria-label="Sample output types">
                  {SAMPLES.map((s) => (
                    <button key={s.key} type="button" role="tab" id={`tab-${s.key}`} aria-selected={tab === s.key} aria-controls={`panel-${s.key}`} className="cr-tab" onClick={() => { setTab(s.key); trackCta("sample_tab", { tab: s.key }); }}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, margin: "0 0 12px" }}>{active.label}</h3>
                <p style={{ fontSize: 15, color: C.text2, lineHeight: 1.7, margin: "0 0 18px" }}>{SAMPLE_BLURBS[active.key]}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {active.inputs.map((b) => (
                    <li key={b} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontSize: 14 }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: C.accentSoft, color: C.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }} aria-hidden="true">✓</span>
                      Uses: {b}
                    </li>
                  ))}
                </ul>
                <Link className="cr-btn cr-btn-primary" href="/auth/signin" style={{ marginTop: 20 }} data-cta="samples_start" onClick={() => trackCta("samples_start")}>Draft your first letter free</Link>
              </div>
              <div role="tabpanel" id={`panel-${active.key}`} aria-labelledby={`tab-${active.key}`} key={active.key}>
                <SampleDoc sample={active} />
              </div>
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section id="how" className="cr-section" aria-labelledby="cr-how-title" style={{ borderTop: `1px solid ${C.border}`, background: "rgba(255,255,255,0.015)" }}>
          <div className="cr-wrap cr-steps">
            <div className="cr-sticky-top" style={{ position: "sticky", top: 90 }}>
              <p className="cr-eyebrow">The workflow</p>
              <h2 id="cr-how-title" className="cr-h2">From a spreadsheet to a signed pledge</h2>
              <p className="cr-lead" style={{ marginBottom: 24 }}>No IT project. Sign up, describe your organization, import a CSV, and the first letter is ready to edit before your coffee cools.</p>
              <Link className="cr-btn cr-btn-primary" href="/auth/signin" data-cta="how_start" onClick={() => trackCta("how_start")}>Start free</Link>
            </div>
            <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {STEPS.map((s, i) => (
                <li key={s.n} className="cr-step cr-reveal" style={{ paddingBottom: i === STEPS.length - 1 ? 0 : 26 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div className="cr-step-n" aria-hidden="true">{s.n}</div>
                    {i !== STEPS.length - 1 && <div style={{ width: 2, flex: 1, background: C.border, marginTop: 6 }} />}
                  </div>
                  <div>
                    <h3>{s.t}</h3>
                    <p>{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ===== OUTCOMES ===== */}
        <section id="features" className="cr-section" aria-labelledby="cr-out-title">
          <div className="cr-wrap">
            <div style={{ maxWidth: 640, marginBottom: 36 }} className="cr-reveal">
              <p className="cr-eyebrow">Outcomes</p>
              <h2 id="cr-out-title" className="cr-h2">Built to raise more with a smaller team</h2>
              <p className="cr-lead">Everything a one-person development shop needs to run like a federation, and nothing a board will not understand.</p>
            </div>
            <div className="cr-grid-3">
              {OUTCOMES.map((f) => (
                <article key={f.title} className="cr-card cr-reveal">
                  <div style={{ fontSize: 26, marginBottom: 12 }} aria-hidden="true">{f.icon}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 7px" }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: C.text3, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TRUST / DATA HANDLING ===== */}
        <section id="trust" className="cr-section" aria-labelledby="cr-trust-title" style={{ borderTop: `1px solid ${C.border}`, background: "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(245,158,11,0.05), transparent 70%)" }}>
          <div className="cr-wrap">
            <div style={{ maxWidth: 680, marginBottom: 32 }} className="cr-reveal">
              <p className="cr-eyebrow">Data handling</p>
              <h2 id="cr-trust-title" className="cr-h2">Your donor list is the most sensitive file you own</h2>
              <p className="cr-lead">Every claim below is implemented in the product and itemized, control by control, on the <Link href="/security" style={{ color: C.accent }}>Security page</Link>. Sub-processors: Vercel (hosting), Neon (database), Anthropic (AI via our server), Stripe (billing), Resend (platform email) and Google (optional sign-in).</p>
            </div>
            <div className="cr-grid-2">
              {TRUST.map((t) => (
                <article key={t.title} className="cr-card cr-reveal" style={{ display: "flex", gap: 16 }}>
                  <div style={{ fontSize: 24 }} aria-hidden="true">{t.icon}</div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>{t.title}</h3>
                    <p style={{ fontSize: 13, color: C.text3, lineHeight: 1.65, margin: 0 }}>{t.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FOUNDER ===== */}
        <section className="cr-section" aria-labelledby="cr-founder-title" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="cr-wrap" style={{ maxWidth: 820, textAlign: "center" }}>
            <h2 className="cr-eyebrow" id="cr-founder-title">Why it exists</h2>
            <blockquote className="cr-reveal" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.5, letterSpacing: -0.4, margin: "0 0 18px" }}>
              &ldquo;ChaiRaise was not built in a lab. I built it while running a live $12M campaign for a 360-student Torah institution in Haifa, managing a pipeline of 110+ major donors. Every feature exists because the campaign needed it.&rdquo;
            </blockquote>
            <p style={{ fontSize: 13, color: C.text3, margin: 0 }}>
              <a href={SITE.author.url} style={{ color: C.text2, fontWeight: 600, textDecoration: "none" }}>{SITE.author.name}</a>, founder of ChaiRaise and <a href={SITE.publisher.url} style={{ color: C.text2, textDecoration: "none" }}>{SITE.publisher.name}</a>. 3x CHRO, fundraising strategist, executive coach to 2,300+ leaders.
            </p>
          </div>
        </section>

        {/* ===== PRICING ===== */}
        <section id="pricing" className="cr-section" aria-labelledby="cr-pricing-title" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="cr-wrap">
            <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 40px" }} className="cr-reveal">
              <p className="cr-eyebrow">Pricing</p>
              <h2 id="cr-pricing-title" className="cr-h2">Free until you outgrow 100 donors</h2>
              <p className="cr-lead">The plans below are exactly what the server enforces. Starter never expires and never asks for a card.</p>
            </div>
            <div className="cr-pricing">
              {PRICING.map((p) => (
                <div key={p.id} className={`cr-price-card cr-reveal${p.highlight ? " hl" : ""}`}>
                  {p.highlight && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: C.accent, color: "#09090b", padding: "3px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>MOST POPULAR</div>}
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 3px" }}>{p.name}</h3>
                  <p style={{ fontSize: 12, color: C.text3, margin: "0 0 14px" }}>{p.desc}</p>
                  <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>{p.price}<span style={{ fontSize: 15, fontWeight: 500, color: C.text3 }}>{p.per}</span></div>
                  <p style={{ fontSize: 11, color: C.text4, margin: "0 0 20px" }}>{p.note}</p>
                  {p.href === "contact" ? (
                    <button type="button" className="cr-btn cr-btn-ghost" style={{ width: "100%", marginBottom: 20 }} onClick={() => { setContactPlan(p.name); trackCta("pricing_contact", { plan: p.id }); }}>{p.cta}</button>
                  ) : (
                    <Link className={`cr-btn ${p.highlight ? "cr-btn-primary" : "cr-btn-ghost"}`} style={{ width: "100%", marginBottom: 20, boxSizing: "border-box" }} href={p.href} data-cta={`pricing_${p.id}`} onClick={() => trackCta("pricing_cta", { plan: p.id })}>{p.cta}</Link>
                  )}
                  <ul>{p.feats.map((f) => (<li key={f}>✓ {f}</li>))}</ul>
                </div>
              ))}
            </div>

            {/* Comparison */}
            <div style={{ marginTop: 56 }} className="cr-reveal">
              <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: "0 0 8px" }}>How it compares</h3>
              <p style={{ fontSize: 14, color: C.text3, margin: "0 0 18px" }}>What you actually do today versus what ChaiRaise does. Vendor-specific claims are deliberately left as &ldquo;varies&rdquo;.</p>
              <div className="cr-table-wrap">
                <table className="cr-table">
                  <caption style={{ position: "absolute", left: -9999 }}>Comparison of ChaiRaise with a spreadsheet plus chat assistant and a general nonprofit CRM</caption>
                  <thead>
                    <tr>
                      <th scope="col">Capability</th>
                      {COMPARISON.columns.map((c, i) => (<th key={c} scope="col" className={i === COMPARISON.columns.length - 1 ? "cr-us" : ""}>{c}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.rows.map((r) => (
                      <tr key={r[0]}>
                        {r.map((cell, i) => (i === 0 ? <td key={i}>{cell}</td> : <td key={i} className={i === r.length - 1 ? "cr-us" : ""}>{cell}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section id="faq" className="cr-section" aria-labelledby="cr-faq-title" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="cr-wrap cr-samples">
            <div>
              <p className="cr-eyebrow">FAQ</p>
              <h2 id="cr-faq-title" className="cr-h2">Questions, answered</h2>
              <p className="cr-lead">Direct answers first. Still curious? Email <a href={`mailto:${SITE.contactEmail}`} style={{ color: C.accent, textDecoration: "none" }}>{SITE.contactEmail}</a>.</p>
            </div>
            <div>
              {FAQ.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div key={item.q} className="cr-faq-item">
                    <h3 style={{ margin: 0 }}>
                      <button type="button" className="cr-faq-q" aria-expanded={open} aria-controls={`faq-a-${i}`} id={`faq-q-${i}`} onClick={() => setOpenFaq(open ? -1 : i)}>
                        <span>{item.q}</span>
                        <span aria-hidden="true">+</span>
                      </button>
                    </h3>
                    <p id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} className="cr-faq-a" hidden={!open}>{item.a}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== NEWSLETTER ===== */}
        <section className="cr-section" aria-labelledby="cr-nl-title" style={{ borderTop: `1px solid ${C.border}`, background: "rgba(255,255,255,0.015)" }}>
          <div className="cr-wrap cr-grid-2" style={{ alignItems: "center" }}>
            <div>
              <p className="cr-eyebrow">Stay sharp</p>
              <h2 id="cr-nl-title" className="cr-h2" style={{ fontSize: 28 }}>One idea a week on raising more with less</h2>
              <p className="cr-lead">{SITE.newsletter.name} covers AI leverage for small teams, including the fundraising playbooks behind ChaiRaise. No spam, unsubscribe any time.</p>
            </div>
            <Newsletter />
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="cr-section" aria-labelledby="cr-final-title" style={{ borderTop: `1px solid ${C.border}`, textAlign: "center", background: "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(245,158,11,0.12), transparent 70%)" }}>
          <div className="cr-wrap">
            <h2 id="cr-final-title" className="cr-h2" style={{ fontSize: 44 }}>Your next appeal, drafted tonight</h2>
            <p className="cr-lead" style={{ maxWidth: 520, margin: "0 auto 30px" }}>Free for your first 100 donors. Import a CSV, generate a letter, and decide for yourself. No credit card, no sales call.</p>
            <Link className="cr-btn cr-btn-primary" href="/auth/signin" style={{ fontSize: 17, padding: "16px 40px" }} data-cta="final_start" onClick={() => trackCta("final_start")}>Start free</Link>
          </div>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="cr-footer" style={{ borderTop: `1px solid ${C.border}`, padding: "48px 0 0" }}>
        <div className="cr-wrap">
          <div className="cr-footer-grid">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ width: 22, height: 22, background: C.accent, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 9, color: "#09090b" }} aria-hidden="true">CR</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>ChaiRaise</span>
              </div>
              <p style={{ fontSize: 13, color: C.text3, lineHeight: 1.6, margin: "0 0 10px", maxWidth: 320 }}>{SITE.tagline}. An AI fundraising copilot and donor CRM for nonprofits and Jewish community organizations.</p>
              <p style={{ fontSize: 12, color: C.text4, margin: 0 }}>Last updated {SITE.lastUpdated}</p>
            </div>
            <div>
              <h4>Product</h4>
              <ul>
                <li><a className="cr-link" href="#samples">Sample outputs</a></li>
                <li><a className="cr-link" href="#how">How it works</a></li>
                <li><a className="cr-link" href="#pricing">Pricing</a></li>
                <li><a className="cr-link" href="#faq">FAQ</a></li>
                <li><Link className="cr-link" href="/security">Security &amp; privacy</Link></li>
              </ul>
            </div>
            <div>
              <h4>Resources</h4>
              <ul>
                <li><Link className="cr-link" href="/blog">Blog</Link></li>
                <li><Link className="cr-link" href="/blog/ai-jewish-fundraising-guide-2026">AI Jewish fundraising guide</Link></li>
                <li><Link className="cr-link" href="/blog/synagogue-donor-management-small-orgs">Synagogue donor management</Link></li>
                <li><a className="cr-link" href="/llms.txt">llms.txt</a></li>
              </ul>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li><a className="cr-link" href={`mailto:${SITE.contactEmail}`}>Contact</a></li>
                <li><a className="cr-link" href={SITE.author.url}>{SITE.author.name}</a></li>
                <li><a className="cr-link" href={SITE.publisher.url}>{SITE.publisher.name}</a></li>
                <li><Link className="cr-link" href="/privacy">Privacy</Link></li>
                <li><Link className="cr-link" href="/terms">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="cr-portlev" style={{ marginTop: 40 }}>
            <span style={{ color: C.text3, fontWeight: 600 }}>A PortLev build</span>
            <span aria-hidden="true">·</span>
            {SISTER_LINKS.map((s) => (<a key={s.url} href={s.url} rel="noopener">{s.name}</a>))}
          </div>
          <div style={{ padding: "14px 0 20px", fontSize: 11, color: C.text4 }}>© 2026 {SITE.publisher.name}. ChaiRaise is a product of {SITE.publisher.name}. All rights reserved.</div>
        </div>
      </footer>

      {/* ===== STICKY MOBILE CTA ===== */}
      <div className="cr-sticky" aria-hidden={contactPlan ? "true" : "false"}>
        <span>Free for 100 donors</span>
        <Link className="cr-btn cr-btn-primary cr-btn-sm" href="/auth/signin" data-cta="sticky_start" onClick={() => trackCta("sticky_start")}>Start free</Link>
      </div>

      {contactPlan && <ContactModal plan={contactPlan} onClose={closeContact} />}
    </div>
  );
}

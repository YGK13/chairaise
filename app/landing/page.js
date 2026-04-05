'use client';
// ============================================================
// ChaiRaise — Landing Page / Marketing Site
// Conversion-optimized, mobile-first, designed to sell to Jewish org executives
// ============================================================

import { useState } from 'react';
import Link from 'next/link';

const FEATURES = [
  { icon: "🧠", title: "AI Org Intelligence", desc: "Enter your org name + website. Our AI instantly researches your mission, programs, known donors, and builds personalized talking points for every outreach." },
  { icon: "🎯", title: "Cause Match Scoring", desc: "Every donor gets a cause match % showing how aligned they are with YOUR specific mission. Focus on donors who care about what you do." },
  { icon: "✉️", title: "AI Email Generation", desc: "One click generates personalized outreach emails using your org's talking points, donor intel, and proven fundraising templates." },
  { icon: "🕸️", title: "Social Graph Mapping", desc: "Import your LinkedIn + Google contacts. AI maps the shortest intro path to every donor through people you already know." },
  { icon: "📊", title: "Pipeline Intelligence", desc: "10-stage pipeline, Kanban board, AI engagement scoring, priority leaderboard, and conversion analytics — all in real time." },
  { icon: "🔌", title: "Platform Integrations", desc: "Connect IsraelGives, Donorbox, Charidy, Givebutter, and more. Sync donor data automatically. No more spreadsheet chaos." },
  { icon: "📨", title: "Batch Campaigns", desc: "Send personalized emails to 50 donors at once. AI personalizes each one with merge fields and org-specific context." },
  { icon: "🏷️", title: "Tags & Segmentation", desc: "Flexible tagging system for donor segmentation. Filter by any combination of tier, stage, community, giving capacity, and more." },
  { icon: "📜", title: "Audit & Compliance", desc: "Every action is logged. Full audit trail for board reporting, compliance, and accountability. Export anytime." },
];

const ORGS = [
  { type: "Yeshivas & Seminaries", icon: "📖" },
  { type: "Synagogues & Shuls", icon: "🕍" },
  { type: "Day Schools", icon: "🏫" },
  { type: "Federations", icon: "🏛️" },
  { type: "Chesed Organizations", icon: "🤲" },
  { type: "Israel Organizations", icon: "🇮🇱" },
  { type: "Camps & Youth", icon: "⛺" },
  { type: "Advocacy Groups", icon: "📢" },
];

const TESTIMONIAL_PLACEHOLDER = {
  quote: "We went from spreadsheets to closing $250K in 90 days. The AI knows our donors better than we do.",
  name: "Development Director",
  org: "Major Jewish Organization",
};

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div style={{ background: "#09090b", color: "#fafafa", fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>

      {/* ===== NAV BAR ===== */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(9,9,11,0.85)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #27272a", padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: "#f59e0b", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 13, color: "#09090b",
          }}>CR</div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>ChaiRaise</span>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <a href="#features" style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>Features</a>
          <a href="#how" style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>How It Works</a>
          <a href="#pricing" style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>Pricing</a>
          <Link href="/auth/signin" style={{
            padding: "8px 20px", background: "#f59e0b", color: "#09090b",
            borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none",
          }}>Get Started Free</Link>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section style={{
        paddingTop: 140, paddingBottom: 80, textAlign: "center",
        background: "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 70%)",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 20, background: "rgba(245,158,11,0.12)",
            color: "#f59e0b", fontSize: 12, fontWeight: 600, marginBottom: 24,
          }}>
            ✨ The first AI-native CRM built for Jewish organizations
          </div>
          <h1 style={{
            fontSize: 56, fontWeight: 800, lineHeight: 1.1, letterSpacing: -2,
            marginBottom: 20,
            background: "linear-gradient(135deg, #fafafa 0%, #a1a1aa 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Multiply Your<br />Impact by 18
          </h1>
          <p style={{
            fontSize: 18, color: "#a1a1aa", lineHeight: 1.6, maxWidth: 560,
            margin: "0 auto 32px",
          }}>
            AI-powered donor intelligence, cause matching, and personalized outreach
            for yeshivas, synagogues, federations, and every Jewish organization.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/auth/signin" style={{
              padding: "14px 32px", background: "#f59e0b", color: "#09090b",
              borderRadius: 10, fontSize: 16, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
            }}>Start Free →</Link>
            <Link href="/" style={{
              padding: "14px 32px", background: "transparent", color: "#fafafa",
              borderRadius: 10, fontSize: 16, fontWeight: 600, textDecoration: "none",
              border: "1px solid #3f3f46",
            }}>See Demo</Link>
          </div>
          <p style={{ fontSize: 12, color: "#52525b", marginTop: 16 }}>
            No credit card required. Set up in 5 minutes.
          </p>
        </div>
      </section>

      {/* ===== SOCIAL PROOF STRIP ===== */}
      <section style={{
        borderTop: "1px solid #27272a", borderBottom: "1px solid #27272a",
        padding: "20px 24px", textAlign: "center",
      }}>
        <p style={{ fontSize: 12, color: "#52525b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
          Built for every corner of the Jewish world
        </p>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
          {ORGS.map(o => (
            <span key={o.type} style={{ fontSize: 13, color: "#71717a" }}>{o.icon} {o.type}</span>
          ))}
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section id="features" style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: "center", marginBottom: 12, letterSpacing: -1 }}>
          Everything You Need to Raise More
        </h2>
        <p style={{ fontSize: 16, color: "#71717a", textAlign: "center", marginBottom: 48 }}>
          From first contact to committed gift — powered by AI at every step
        </p>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
        }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: "#18181b", border: "1px solid #27272a", borderRadius: 12,
              padding: 24, transition: "border-color 0.2s",
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section style={{
        padding: "80px 24px", borderTop: "1px solid #27272a",
        background: "radial-gradient(ellipse at 50% 50%, rgba(245,158,11,0.04) 0%, transparent 70%)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: "center", marginBottom: 12, letterSpacing: -1 }}>
            Up and Running in 5 Minutes
          </h2>
          <p style={{ fontSize: 16, color: "#71717a", textAlign: "center", marginBottom: 48 }}>
            No IT department needed. No migration headaches. Just results.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {[
              { step: "1", title: "Enter Your Org", desc: "Name + website. AI instantly researches your mission, programs, and known donors.", icon: "🏛️" },
              { step: "2", title: "Import Contacts", desc: "Upload your LinkedIn connections or Google contacts. We map every relationship.", icon: "📇" },
              { step: "3", title: "AI Matches Donors", desc: "Each donor gets a cause match score showing how aligned they are with YOUR mission.", icon: "🎯" },
              { step: "4", title: "Send & Track", desc: "AI drafts personalized emails. Send with one click. Track everything in real time.", icon: "📈" },
            ].map(s => (
              <div key={s.step} style={{ textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "rgba(245,158,11,0.12)", color: "#f59e0b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, margin: "0 auto 12px", fontWeight: 800,
                }}>{s.icon}</div>
                <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>Step {s.step}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF / TESTIMONIAL ===== */}
      <section style={{
        padding: "60px 24px",
        borderTop: "1px solid #27272a",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✡️</div>
          <blockquote style={{
            fontSize: 20, fontWeight: 500, fontStyle: "italic", lineHeight: 1.6,
            color: "#fafafa", marginBottom: 16,
          }}>
            &ldquo;We replaced three tools and a spreadsheet with ChaiRaise. The AI knows our donors better than we do.&rdquo;
          </blockquote>
          <p style={{ fontSize: 13, color: "#71717a" }}>— Development Director, Major Jewish Organization</p>
        </div>
      </section>

      {/* ===== FOR WHO ===== */}
      <section id="for-who" style={{
        padding: "80px 24px", background: "rgba(245,158,11,0.03)",
        borderTop: "1px solid #27272a", borderBottom: "1px solid #27272a",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12, letterSpacing: -1 }}>
            Built for Jewish Organizations
          </h2>
          <p style={{ fontSize: 16, color: "#71717a", marginBottom: 40 }}>
            Whether you're raising $50K or $50M, ChaiRaise scales with your mission
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {ORGS.map(o => (
              <div key={o.type} style={{
                background: "#18181b", border: "1px solid #27272a", borderRadius: 12,
                padding: 20, textAlign: "center",
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{o.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{o.type}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: "center", marginBottom: 12, letterSpacing: -1 }}>
          Simple, Transparent Pricing
        </h2>
        <p style={{ fontSize: 16, color: "#71717a", textAlign: "center", marginBottom: 48 }}>
          Start free. Upgrade when you're ready to raise more.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {/* Free */}
          <div style={{
            background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 32,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Starter</h3>
            <p style={{ fontSize: 12, color: "#71717a", marginBottom: 16 }}>For small organizations getting started</p>
            <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 4 }}>Free</div>
            <p style={{ fontSize: 12, color: "#52525b", marginBottom: 24 }}>Forever</p>
            <ul style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 2, listStyle: "none", padding: 0, marginBottom: 24 }}>
              <li>✓ Up to 100 donors</li>
              <li>✓ AI email generation</li>
              <li>✓ Pipeline & Kanban board</li>
              <li>✓ CSV import/export</li>
              <li>✓ 1 team member</li>
            </ul>
            <Link href="/auth/signin" style={{
              display: "block", textAlign: "center", padding: "12px",
              border: "1px solid #3f3f46", borderRadius: 8, color: "#fafafa",
              fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}>Get Started</Link>
          </div>

          {/* Pro */}
          <div style={{
            background: "#18181b", border: "2px solid #f59e0b", borderRadius: 16, padding: 32,
            position: "relative",
          }}>
            <div style={{
              position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
              background: "#f59e0b", color: "#09090b", padding: "4px 16px",
              borderRadius: 12, fontSize: 11, fontWeight: 700,
            }}>MOST POPULAR</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Professional</h3>
            <p style={{ fontSize: 12, color: "#71717a", marginBottom: 16 }}>For growing organizations</p>
            <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 4 }}>$149<span style={{ fontSize: 16, fontWeight: 500, color: "#71717a" }}>/mo</span></div>
            <p style={{ fontSize: 12, color: "#52525b", marginBottom: 24 }}>Billed annually</p>
            <ul style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 2, listStyle: "none", padding: 0, marginBottom: 24 }}>
              <li>✓ Unlimited donors</li>
              <li>✓ AI Org Intelligence</li>
              <li>✓ Cause match scoring</li>
              <li>✓ Social graph mapping</li>
              <li>✓ Platform integrations</li>
              <li>✓ Batch campaigns</li>
              <li>✓ 5 team members</li>
              <li>✓ Priority support</li>
            </ul>
            <Link href="/auth/signin" style={{
              display: "block", textAlign: "center", padding: "12px",
              background: "#f59e0b", borderRadius: 8, color: "#09090b",
              fontSize: 14, fontWeight: 700, textDecoration: "none",
            }}>Start Free Trial</Link>
          </div>

          {/* Enterprise */}
          <div style={{
            background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 32,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Enterprise</h3>
            <p style={{ fontSize: 12, color: "#71717a", marginBottom: 16 }}>For federations & large institutions</p>
            <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 4 }}>Custom</div>
            <p style={{ fontSize: 12, color: "#52525b", marginBottom: 24 }}>Let's talk</p>
            <ul style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 2, listStyle: "none", padding: 0, marginBottom: 24 }}>
              <li>✓ Everything in Pro</li>
              <li>✓ Multi-org management</li>
              <li>✓ Custom integrations</li>
              <li>✓ Dedicated onboarding</li>
              <li>✓ SLA & compliance</li>
              <li>✓ Unlimited team members</li>
              <li>✓ White-label option</li>
            </ul>
            <a href="mailto:hello@chairaise.com" style={{
              display: "block", textAlign: "center", padding: "12px",
              border: "1px solid #3f3f46", borderRadius: 8, color: "#fafafa",
              fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}>Contact Sales</a>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{
        padding: "80px 24px", textAlign: "center",
        background: "radial-gradient(ellipse at 50% 100%, rgba(245,158,11,0.08) 0%, transparent 70%)",
        borderTop: "1px solid #27272a",
      }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12, letterSpacing: -1 }}>
          Ready to Raise Smarter?
        </h2>
        <p style={{ fontSize: 16, color: "#71717a", marginBottom: 32, maxWidth: 500, margin: "0 auto 32px" }}>
          Join the next generation of Jewish fundraising. Set up in 5 minutes.
          No credit card required.
        </p>
        <Link href="/auth/signin" style={{
          padding: "16px 40px", background: "#f59e0b", color: "#09090b",
          borderRadius: 10, fontSize: 18, fontWeight: 700, textDecoration: "none",
          display: "inline-block", boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
        }}>Get Started Free →</Link>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{
        borderTop: "1px solid #27272a", padding: "40px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        maxWidth: 1200, margin: "0 auto", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 24, height: 24, background: "#f59e0b", borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 10, color: "#09090b",
            }}>CR</div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>ChaiRaise</span>
          </div>
          <p style={{ fontSize: 11, color: "#52525b" }}>Multiply your impact by 18.</p>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <a href="mailto:hello@chairaise.com" style={{ color: "#71717a", fontSize: 12, textDecoration: "none" }}>Contact</a>
          <a href="/privacy" style={{ color: "#71717a", fontSize: 12, textDecoration: "none" }}>Privacy</a>
          <a href="/terms" style={{ color: "#71717a", fontSize: 12, textDecoration: "none" }}>Terms</a>
        </div>
        <p style={{ fontSize: 11, color: "#3f3f46" }}>© 2026 ChaiRaise. All rights reserved.</p>
      </footer>
    </div>
  );
}

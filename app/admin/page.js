"use client";
// ============================================================
// ChaiRaise — Owner Operations Console (/admin)
//
// A founder's telemetry board, not a generic SaaS admin. One signal color
// (amber), every number set in JetBrains Mono like an instrument readout, and a
// live signup feed as the thing you actually watch. Data comes from the
// owner-gated /api/admin/stats; a non-owner gets an access screen, never data.
// ============================================================
import { useEffect, useState, useCallback } from "react";

const C = {
  bg: "#09090b", panel: "#111114", panel2: "#17171b", line: "#242429",
  text: "#f4f4f5", dim: "#8a8a94", faint: "#5a5a63",
  amber: "#f59e0b", green: "#22c55e", blue: "#60a5fa", red: "#ef4444",
};
const mono = "'JetBrains Mono', ui-monospace, monospace";

const fmtInt = (n) => (n ?? 0).toLocaleString("en-US");
const fmtUsd = (cents) => "$" + Math.round((Number(cents) || 0) / 100).toLocaleString("en-US");
function ago(iso) {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AdminConsole() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | forbidden | error
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0); // re-render for relative times

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/stats", { cache: "no-store" });
      if (r.status === 403) { setStatus("forbidden"); return; }
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
      setData(d); setStatus("ok");
    } catch (e) { setErr(e.message); setStatus("error"); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const poll = setInterval(load, 60_000);   // refresh data each minute
    const beat = setInterval(() => setTick((t) => t + 1), 15_000); // keep "ago" fresh
    return () => { clearInterval(poll); clearInterval(beat); };
  }, [load]);

  if (status === "forbidden") return <Gate title="Restricted" body="This console is limited to ChaiRaise owners." />;
  if (status === "error") return <Gate title="Couldn't load" body={err} retry={load} />;
  if (status === "loading" || !data) return <Gate title="ChaiRaise Ops" body="Reading telemetry…" spin />;

  const t = data.totals || {};
  const proActive = (data.plan_mix || []).filter((p) => p.plan === "pro" && (p.status === "active" || p.status === "trialing")).reduce((s, p) => s + p.n, 0);
  const mrr = proActive * 149;
  const maxDay = Math.max(1, ...(data.signups_by_day || []).map((d) => d.n));

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .ops-num { font-family:${mono}; letter-spacing:-0.5px; font-variant-numeric:tabular-nums; }
        .ops-grid { max-width:1180px; margin:0 auto; padding:0 24px; }
        .ops-vitals { display:grid; grid-template-columns:repeat(5,1fr); gap:1px; background:${C.line}; border:1px solid ${C.line}; border-radius:14px; overflow:hidden; }
        .ops-cols { display:grid; grid-template-columns:1.35fr 1fr; gap:16px; margin-top:16px; }
        .ops-bar { transition:height .5s cubic-bezier(.2,.7,.3,1); }
        .ops-feed-row:first-child .ops-dot { box-shadow:0 0 0 0 rgba(245,158,11,.6); animation:opsPulse 2s infinite; }
        @keyframes opsPulse { 70%{ box-shadow:0 0 0 8px rgba(245,158,11,0); } 100%{ box-shadow:0 0 0 0 rgba(245,158,11,0); } }
        @keyframes opsSpin { to { transform:rotate(360deg); } }
        @media (max-width:880px){ .ops-vitals{ grid-template-columns:repeat(2,1fr); } .ops-cols{ grid-template-columns:1fr; } .ops-hide-sm{ display:none; } }
      `}</style>

      {/* command bar */}
      <header style={{ borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, zIndex: 10, background: "rgba(9,9,11,0.85)", backdropFilter: "blur(10px)" }}>
        <div className="ops-grid" style={{ height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 28, height: 28, background: C.amber, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: C.bg }}>CR</div>
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>ChaiRaise</span>
            <span style={{ fontFamily: mono, fontSize: 11, color: C.amber, border: `1px solid ${C.line}`, borderRadius: 6, padding: "2px 7px", textTransform: "uppercase", letterSpacing: 1 }}>Ops</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span className="ops-hide-sm" style={{ fontFamily: mono, fontSize: 11, color: C.faint }}>updated {ago(data.generated_at)}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: C.green }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} /> live
            </span>
            <a href="/app" style={{ fontSize: 12, color: C.dim, textDecoration: "none" }}>← App</a>
          </div>
        </div>
      </header>

      <main className="ops-grid" style={{ padding: "26px 24px 60px" }}>
        {/* vitals */}
        <div className="ops-vitals">
          <Vital label="Organizations" value={fmtInt(t.orgs)} sub={`${fmtInt(data.mailboxes?.connected)} sending own email`} />
          <Vital label="Users" value={fmtInt(t.accounts)} sub={`${fmtInt(t.active_7d)} active this week`} />
          <Vital label="Signups · 7d" value={fmtInt(t.signups_7d)} accent delta={t.signups_30d} deltaLabel="in 30d" />
          <Vital label="Est. MRR" value={fmtUsd(mrr * 100)} sub={`${proActive} on Professional`} />
          <Vital label="Donors managed" value={fmtInt(t.donors)} sub={`${fmtUsd(t.donation_total)} tracked`} />
        </div>

        <div className="ops-cols">
          {/* LEFT: growth + mix */}
          <div>
            <Panel title="Signups" right={<span style={{ fontFamily: mono, fontSize: 11, color: C.faint }}>last 30 days</span>}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120, marginTop: 6 }}>
                {(data.signups_by_day || []).map((d) => (
                  <div key={d.day} title={`${d.day}: ${d.n}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                    <div className="ops-bar" style={{ height: `${(d.n / maxDay) * 100}%`, minHeight: d.n ? 3 : 0, background: d.n ? C.amber : "transparent", borderRadius: 2, opacity: d.n ? 1 : 0.15, ...(d.n ? {} : { background: C.line, height: 2 }) }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: mono, fontSize: 10, color: C.faint }}>
                <span>{(data.signups_by_day || [])[0]?.day?.slice(5)}</span>
                <span>peak {maxDay}/day</span>
                <span>today</span>
              </div>
            </Panel>

            <Panel title="Plan mix" style={{ marginTop: 16 }}>
              {(data.plan_mix || []).length === 0 ? (
                <Empty>No paid subscriptions yet. Every org starts on the free Starter tier.</Empty>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.plan_mix.map((p, i) => (
                    <Line key={i} left={<span style={{ textTransform: "capitalize" }}>{p.plan} · <span style={{ color: p.status === "active" || p.status === "trialing" ? C.green : C.faint }}>{p.status}</span></span>} right={fmtInt(p.n)} />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Usage" style={{ marginTop: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                <Mini label="Donations 30d" value={fmtInt(data.donations_30d)} />
                <Mini label="Activities" value={fmtInt(data.activity?.activities)} />
                <Mini label="Emails sent" value={fmtInt(data.activity?.emails)} />
                <Mini label="WhatsApp" value={fmtInt(data.activity?.whatsapp)} />
              </div>
            </Panel>
          </div>

          {/* RIGHT: the signature — live signup feed */}
          <Panel title="Signup feed" right={<span style={{ fontFamily: mono, fontSize: 11, color: C.faint }}>{fmtInt((data.recent_signups || []).length)} shown</span>} noPad>
            <div style={{ maxHeight: 470, overflowY: "auto" }}>
              {(data.recent_signups || []).length === 0 ? (
                <div style={{ padding: 20 }}><Empty>No signups yet. This is where new users appear the moment they join.</Empty></div>
              ) : data.recent_signups.map((u, i) => (
                <div key={i} className="ops-feed-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? `1px solid ${C.line}` : "none" }}>
                  <span className="ops-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? C.amber : C.faint, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name || u.email.split("@")[0]}</div>
                    <div style={{ fontFamily: mono, fontSize: 11, color: C.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: mono, fontSize: 11, color: C.faint }}>{ago(u.created_at)}</div>
                    <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, color: u.provider === "google" ? C.blue : C.dim }}>{u.provider === "google" ? "Google" : "Email"}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* orgs table */}
        <Panel title="Organizations" style={{ marginTop: 16 }} right={<span style={{ fontFamily: mono, fontSize: 11, color: C.faint }}>by donor count</span>} noPad>
          {(data.top_orgs || []).length === 0 ? (
            <div style={{ padding: 20 }}><Empty>No organizations yet.</Empty></div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: C.faint, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    <Th left>Organization</Th><Th>Type</Th><Th num>Donors</Th><Th num>Members</Th><Th num>Raised</Th><Th num>Joined</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_orgs.map((o) => (
                    <tr key={o.id} style={{ borderTop: `1px solid ${C.line}` }}>
                      <Td left><span style={{ fontWeight: 600 }}>{o.name}</span></Td>
                      <Td dim>{o.org_type || "—"}</Td>
                      <Td num accent>{fmtInt(o.donors)}</Td>
                      <Td num>{fmtInt(o.members)}</Td>
                      <Td num>{fmtUsd(o.raised)}</Td>
                      <Td num dim>{o.created_at ? new Date(o.created_at).toISOString().slice(0, 10) : "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </main>
    </div>
  );
}

// ---- primitives ----
function Vital({ label, value, sub, accent, delta, deltaLabel }) {
  return (
    <div style={{ background: C.panel, padding: "18px 18px 16px" }}>
      <div style={{ fontSize: 10.5, color: C.dim, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>{label}</div>
      <div className="ops-num" style={{ fontSize: 30, fontWeight: 700, color: accent ? C.amber : C.text, lineHeight: 1 }}>{value}</div>
      {(sub || delta != null) && (
        <div style={{ fontSize: 11, color: C.faint, marginTop: 8 }}>
          {delta != null ? <span><span style={{ fontFamily: mono, color: C.green }}>+{fmtInt(delta)}</span> {deltaLabel}</span> : sub}
        </div>
      )}
    </div>
  );
}
function Panel({ title, right, children, style, noPad }) {
  return (
    <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: `1px solid ${C.line}` }}>
        <h2 style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: C.dim }}>{title}</h2>
        {right}
      </div>
      <div style={{ padding: noPad ? 0 : 16 }}>{children}</div>
    </section>
  );
}
function Line({ left, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: C.text }}>{left}</span>
      <span className="ops-num" style={{ fontWeight: 700 }}>{right}</span>
    </div>
  );
}
function Mini({ label, value }) {
  return (
    <div>
      <div className="ops-num" style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 10, color: C.faint, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
    </div>
  );
}
function Empty({ children }) {
  return <p style={{ fontSize: 13, color: C.faint, lineHeight: 1.6, margin: 0 }}>{children}</p>;
}
function Th({ children, num, left }) {
  return <th style={{ textAlign: num ? "right" : "left", padding: left ? "10px 16px" : "10px 12px", fontWeight: 600 }}>{children}</th>;
}
function Td({ children, num, left, dim, accent }) {
  return <td style={{ textAlign: num ? "right" : "left", padding: left ? "11px 16px" : "11px 12px", color: accent ? C.amber : dim ? C.faint : C.text, fontFamily: num ? mono : "inherit", fontWeight: num ? 700 : 400, whiteSpace: "nowrap" }}>{children}</td>;
}
function Gate({ title, body, retry, spin }) {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <div style={{ width: 44, height: 44, background: C.amber, borderRadius: 11, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: C.bg, marginBottom: 16, ...(spin ? { animation: "opsSpin 1.4s linear infinite" } : {}) }}>CR</div>
        <style>{`@keyframes opsSpin{to{transform:rotate(360deg)}}`}</style>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{title}</h1>
        <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.6 }}>{body}</p>
        {retry && <button onClick={retry} style={{ marginTop: 16, background: C.amber, color: C.bg, border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Retry</button>}
      </div>
    </div>
  );
}

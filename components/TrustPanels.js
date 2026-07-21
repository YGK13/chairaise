"use client";
// ============================================================
// ChaiRaise — Trust & integrations UI
//   <EmailConnectPanel/>  connect your own mailbox (SMTP)
//   <DataPrivacyPanel/>   export everything / permanently erase
//   <WhatsAppButton/>     click-to-chat from a donor record
//
// Self-contained so the 246KB CRM shell only needs small hook-ins.
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { waLinkForDonor, normalizePhone, DEFAULT_WA_TEMPLATE } from "@/lib/whatsapp";

// Common provider presets so a fundraiser never has to hunt for SMTP settings.
const PROVIDERS = {
  gmail: { label: "Gmail / Google Workspace", host: "smtp.gmail.com", port: 587, secure: false,
    help: "Google requires an App Password (not your normal password). Turn on 2-Step Verification, then create one at myaccount.google.com → Security → App passwords." },
  outlook: { label: "Outlook / Microsoft 365", host: "smtp.office365.com", port: 587, secure: false,
    help: "Use your full email as the username. If your org enforces MFA, create an app password in your Microsoft account security settings." },
  other: { label: "Other provider", host: "", port: 587, secure: false,
    help: "Enter the SMTP details from your email provider. Port 587 uses STARTTLS; port 465 uses implicit TLS (tick “Use TLS”)." },
};

const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 16 };
const label = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 };
const input = { width: "100%", padding: "9px 11px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
const row = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 };

// ============================================================
// CONNECT YOUR EMAIL
// ============================================================
export function EmailConnectPanel({ orgId }) {
  const [provider, setProvider] = useState("gmail");
  const [f, setF] = useState({ from_name: "", from_email: "", smtp_host: "smtp.gmail.com", smtp_port: 587, smtp_secure: false, smtp_user: "", smtp_pass: "" });
  const [state, setState] = useState({ loading: true, connected: false, verified_at: null, has_password: false });
  const [msg, setMsg] = useState(null); // {ok, text}
  const [busy, setBusy] = useState("");

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      const r = await fetch(`/api/org/email?org_id=${encodeURIComponent(orgId)}`);
      const d = await r.json();
      const s = d.settings || {};
      setState({ loading: false, connected: !!s.connected, verified_at: s.verified_at, has_password: !!s.has_password });
      if (s.connected) {
        setF((p) => ({ ...p, from_name: s.from_name || "", from_email: s.from_email || "", smtp_host: s.smtp_host || p.smtp_host, smtp_port: s.smtp_port || 587, smtp_secure: !!s.smtp_secure, smtp_user: s.smtp_user || "", smtp_pass: "" }));
      }
    } catch { setState((p) => ({ ...p, loading: false })); }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const pickProvider = (id) => {
    setProvider(id);
    const p = PROVIDERS[id];
    setF((prev) => ({ ...prev, smtp_host: p.host || prev.smtp_host, smtp_port: p.port, smtp_secure: p.secure }));
  };

  const save = async () => {
    setBusy("save"); setMsg(null);
    try {
      const r = await fetch("/api/org/email", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ org_id: orgId, ...f }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save");
      setMsg({ ok: true, text: "Saved. Now send a test to confirm it works." });
      setState((p) => ({ ...p, connected: !!d.settings?.connected, has_password: !!d.settings?.has_password }));
      setF((p) => ({ ...p, smtp_pass: "" }));
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy("");
  };

  const test = async () => {
    setBusy("test"); setMsg(null);
    try {
      const r = await fetch("/api/org/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ org_id: orgId, action: "test" }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "Test failed");
      setMsg({ ok: true, text: `Test email sent to ${d.sent_to} from ${d.from}. Check your inbox.` });
      setState((p) => ({ ...p, verified_at: new Date().toISOString() }));
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy("");
  };

  const disconnect = async () => {
    if (!confirm("Disconnect this mailbox? Your stored credentials will be destroyed.")) return;
    setBusy("disc"); setMsg(null);
    try {
      await fetch(`/api/org/email?org_id=${encodeURIComponent(orgId)}`, { method: "DELETE" });
      setState({ loading: false, connected: false, verified_at: null, has_password: false });
      setF({ from_name: "", from_email: "", smtp_host: "smtp.gmail.com", smtp_port: 587, smtp_secure: false, smtp_user: "", smtp_pass: "" });
      setMsg({ ok: true, text: "Mailbox disconnected and credentials destroyed." });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy("");
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>✉️ Send from your own email</h3>
        {state.connected && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
            background: state.verified_at ? "var(--green-soft, rgba(34,197,94,0.15))" : "var(--accent-soft, rgba(245,158,11,0.15))",
            color: state.verified_at ? "var(--green)" : "var(--accent)" }}>
            {state.verified_at ? "✓ VERIFIED" : "SAVED — NOT TESTED"}
          </span>
        )}
      </div>
      <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6, marginBottom: 14 }}>
        Donor outreach goes out from <strong>your address</strong>, relayed through <strong>your mail server</strong>. We never keep a copy of your mailbox, and your password is encrypted before it is stored — it is never shown again, even to you.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {Object.entries(PROVIDERS).map(([id, p]) => (
          <button key={id} onClick={() => pickProvider(id)} className="btn btn-sm"
            style={{ border: `1px solid ${provider === id ? "var(--accent)" : "var(--border)"}`, background: provider === id ? "var(--accent-soft, rgba(245,158,11,0.12))" : "transparent", color: provider === id ? "var(--accent)" : "var(--text2)", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {p.label}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.6, marginBottom: 14, padding: "8px 10px", background: "var(--surface2)", borderRadius: 6 }}>
        {PROVIDERS[provider].help}
      </p>

      <div style={row}>
        <div><label style={label}>From name</label><input style={input} value={f.from_name} onChange={set("from_name")} placeholder="Sarah at Yeshiva X" /></div>
        <div><label style={label}>From address *</label><input style={input} type="email" value={f.from_email} onChange={set("from_email")} placeholder="sarah@yourorg.org" /></div>
      </div>
      <div style={row}>
        <div><label style={label}>SMTP host *</label><input style={input} value={f.smtp_host} onChange={set("smtp_host")} placeholder="smtp.gmail.com" /></div>
        <div><label style={label}>Port</label><input style={input} type="number" value={f.smtp_port} onChange={set("smtp_port")} /></div>
      </div>
      <div style={row}>
        <div><label style={label}>Username *</label><input style={input} value={f.smtp_user} onChange={set("smtp_user")} placeholder="sarah@yourorg.org" /></div>
        <div>
          <label style={label}>{state.has_password ? "Password (leave blank to keep)" : "Password / app password *"}</label>
          <input style={input} type="password" value={f.smtp_pass} onChange={set("smtp_pass")} placeholder={state.has_password ? "••••••••  stored & encrypted" : "app password"} autoComplete="new-password" />
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text2)", marginBottom: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={f.smtp_secure} onChange={set("smtp_secure")} />
        Use implicit TLS (tick only for port 465)
      </label>

      {msg && (
        <div style={{ fontSize: 12, padding: "9px 12px", borderRadius: 7, marginBottom: 12, lineHeight: 1.5,
          background: msg.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: msg.ok ? "var(--green)" : "var(--red)" }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={save} disabled={!!busy}>{busy === "save" ? "Saving…" : "Save mailbox"}</button>
        <button className="btn btn-ghost" onClick={test} disabled={!!busy || !state.connected}>{busy === "test" ? "Sending…" : "Send test email"}</button>
        {state.connected && <button className="btn btn-ghost" onClick={disconnect} disabled={!!busy} style={{ color: "var(--red)" }}>Disconnect</button>}
      </div>
    </div>
  );
}

// ============================================================
// DATA PRIVACY — export everything / erase everything
// ============================================================
export function DataPrivacyPanel({ orgId }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [showDanger, setShowDanger] = useState(false);

  const exportAll = async () => {
    setBusy("export"); setMsg(null);
    try {
      const r = await fetch(`/api/org/export?org_id=${encodeURIComponent(orgId)}`);
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `Export failed (${r.status})`); }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `chairaise-export-${orgId}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      setMsg({ ok: true, text: "Export downloaded. It contains every record we hold for this organization." });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy("");
  };

  const eraseAll = async () => {
    setBusy("delete"); setMsg(null);
    try {
      const r = await fetch("/api/org/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ org_id: orgId, confirm: confirmText }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Deletion failed");
      setMsg({ ok: true, text: "Permanently erased. Signing you out…" });
      setTimeout(() => { try { localStorage.clear(); } catch {} window.location.href = "/api/auth/signout?callbackUrl=/"; }, 1800);
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy("");
  };

  return (
    <div style={card}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>🛡️ Your data, your rights</h3>
      <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6, marginBottom: 14 }}>
        Take everything with you at any time, or erase it for good. No support ticket, no export fee, no lock-in. See our{" "}
        <a href="/security" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>security page</a> for how this data is protected.
      </p>

      {msg && (
        <div style={{ fontSize: 12, padding: "9px 12px", borderRadius: 7, marginBottom: 12, lineHeight: 1.5,
          background: msg.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: msg.ok ? "var(--green)" : "var(--red)" }}>
          {msg.text}
        </div>
      )}

      <button className="btn btn-primary" onClick={exportAll} disabled={!!busy}>
        {busy === "export" ? "Preparing…" : "⬇ Export all my data (JSON)"}
      </button>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        {!showDanger ? (
          <button className="btn btn-ghost" onClick={() => setShowDanger(true)} style={{ color: "var(--red)", fontSize: 12 }}>
            Permanently delete this organization…
          </button>
        ) : (
          <div style={{ border: "1px solid var(--red)", borderRadius: 9, padding: 14, background: "rgba(239,68,68,0.06)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", marginBottom: 6 }}>This cannot be undone</div>
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, marginBottom: 10 }}>
              Every donor, gift, activity, deal, campaign and audit record for this organization will be permanently destroyed. There is no backup and no recovery. Export first if you want a copy.
            </p>
            <label style={label}>Type <code style={{ color: "var(--red)" }}>{orgId}</code> to confirm</label>
            <input style={{ ...input, marginBottom: 10 }} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={orgId} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={eraseAll} disabled={busy === "delete" || confirmText !== orgId}
                style={{ background: "var(--red)", color: "#fff", opacity: confirmText === orgId ? 1 : 0.5 }}>
                {busy === "delete" ? "Erasing…" : "Permanently erase everything"}
              </button>
              <button className="btn btn-ghost" onClick={() => { setShowDanger(false); setConfirmText(""); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CLICK-TO-WHATSAPP
// ============================================================
export function WhatsAppButton({ donor, org, template, onLogged, small }) {
  const link = waLinkForDonor(donor, template || DEFAULT_WA_TEMPLATE, org || {});
  const disabled = !link;
  const go = (e) => {
    e.stopPropagation();
    if (!link) return;
    window.open(link, "_blank", "noopener,noreferrer");
    if (onLogged) onLogged(donor);
  };
  return (
    <button
      onClick={go}
      disabled={disabled}
      title={disabled ? "No phone number on this donor" : `Open WhatsApp to ${normalizePhone(donor?.phone)}`}
      className="btn btn-ghost btn-sm"
      style={{ fontSize: small ? 11 : 12, opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer", color: disabled ? "var(--text3)" : "var(--green)" }}
    >
      💬 WhatsApp
    </button>
  );
}

"use client";
// ============================================================
// ChaiRaise — Plan Gating UI (self-contained)
// A small, dependency-free layer that the CRM uses to:
//   - fetch the authoritative plan from /api/billing,
//   - read entitlements with usePlan(),
//   - lock Pro-only surfaces with <ProGate>,
//   - and prompt upgrades with <UpgradeModal>.
// Server routes remain the source of truth; this only controls presentation.
// ============================================================
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { can as canFeature, withinLimit, FEATURES, planMeta } from "@/lib/plan";

const PlanContext = createContext({
  plan: "starter",
  label: "Starter",
  features: [],
  limits: { donors: 100, seats: 1 },
  owner: false,
  loading: true,
  can: () => false,
  withinLimit: () => true,
  refresh: () => {},
  upgrade: () => {},
});

export const FEAT = FEATURES;

// ---- Provider: fetches plan once, exposes entitlement helpers + upgrade flow ----
export function PlanProvider({ children }) {
  const [state, setState] = useState({
    plan: "starter",
    label: "Starter",
    features: planMeta("starter").features,
    limits: planMeta("starter").limits,
    owner: false,
    loading: true,
  });
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/billing");
      const data = await res.json();
      const meta = planMeta(data.plan || "starter");
      setState({
        plan: data.plan || "starter",
        label: data.label || meta.label,
        features: data.features || meta.features,
        limits: data.limits || meta.limits,
        owner: !!data.owner,
        loading: false,
      });
    } catch {
      // Keep the safe Starter defaults if billing is unreachable.
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upgrade = useCallback((reason = "") => {
    setUpgradeReason(reason);
    setUpgradeOpen(true);
  }, []);

  const value = {
    ...state,
    can: (feature) => state.features.includes(feature),
    withinLimit: (key, count) => withinLimit(state.plan, key, count),
    refresh,
    upgrade,
  };

  return (
    <PlanContext.Provider value={value}>
      {children}
      {upgradeOpen && (
        <UpgradeModal reason={upgradeReason} plan={state.plan} onClose={() => setUpgradeOpen(false)} />
      )}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}

// ---- Small lock chip shown on gated controls ----
export function ProBadge({ style }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontWeight: 700,
        color: "#09090b",
        background: "#f59e0b",
        borderRadius: 6,
        padding: "2px 7px",
        letterSpacing: 0.3,
        ...style,
      }}
    >
      ✦ PRO
    </span>
  );
}

// ---- Wrap any Pro-only surface. Free users see a tasteful upsell, not a dead end. ----
export function ProGate({ feature, title, children }) {
  const plan = usePlan();
  if (plan.loading || plan.can(feature)) return children;
  return <FeatureLockCard title={title} onUpgrade={() => plan.upgrade(title)} />;
}

function FeatureLockCard({ title, onUpgrade }) {
  return (
    <div
      style={{
        border: "1px dashed #3f3f46",
        background: "linear-gradient(180deg, rgba(245,158,11,0.05), transparent)",
        borderRadius: 14,
        padding: "48px 32px",
        textAlign: "center",
        maxWidth: 540,
        margin: "40px auto",
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
      <ProBadge style={{ marginBottom: 14 }} />
      <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fafafa", margin: "10px 0 6px" }}>
        {title} is a Professional feature
      </h3>
      <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.6, marginBottom: 22 }}>
        Upgrade to unlock {title.toLowerCase()} — plus unlimited donors, AI Org Intelligence,
        cause-match scoring, social graph mapping, integrations and batch campaigns.
      </p>
      <button
        onClick={onUpgrade}
        style={{
          background: "#f59e0b",
          color: "#09090b",
          border: "none",
          borderRadius: 9,
          padding: "12px 28px",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Upgrade to Pro →
      </button>
    </div>
  );
}

// ---- Upgrade modal: starts Stripe checkout (or self-serve trial) ----
export function UpgradeModal({ reason, plan, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pro = planMeta("pro");

  const startCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const org = (typeof window !== "undefined" && window.__chairaise_org) || {};
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: org.id || "default", orgName: org.name || "ChaiRaise", plan: "pro" }),
      });
      const data = await res.json();
      if (data.owner) {
        setError("You're on an owner account — everything is already unlocked.");
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.hint || data.error || "Billing isn't configured yet. Please try again later.");
    } catch {
      setError("Could not start checkout. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#18181b",
          border: "2px solid #f59e0b",
          borderRadius: 16,
          padding: 32,
          width: 440,
          maxWidth: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <ProBadge />
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fafafa", margin: "14px 0 4px" }}>
          Upgrade to Professional
        </h2>
        {reason && (
          <p style={{ fontSize: 13, color: "#f59e0b", marginBottom: 12 }}>
            Unlock {reason} and everything else in Pro.
          </p>
        )}
        <div style={{ fontSize: 34, fontWeight: 800, color: "#fafafa", marginBottom: 2 }}>
          ${pro.price}
          <span style={{ fontSize: 15, fontWeight: 500, color: "#71717a" }}>/mo</span>
        </div>
        <p style={{ fontSize: 12, color: "#52525b", marginBottom: 18 }}>
          Billed annually · 14-day free trial · cancel anytime
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 22px", fontSize: 13, color: "#a1a1aa", lineHeight: 2 }}>
          <li>✓ Unlimited donors</li>
          <li>✓ AI Org Intelligence + cause-match scoring</li>
          <li>✓ Social graph mapping</li>
          <li>✓ Platform integrations + batch campaigns</li>
          <li>✓ 5 team members + priority support</li>
        </ul>
        {error && (
          <div style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 12 }}>
            {error}
          </div>
        )}
        <button
          onClick={startCheckout}
          disabled={loading}
          style={{
            width: "100%",
            background: "#f59e0b",
            color: "#09090b",
            border: "none",
            borderRadius: 9,
            padding: "13px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
            marginBottom: 10,
          }}
        >
          {loading ? "Starting checkout…" : "Start 14-day free trial →"}
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            background: "transparent",
            color: "#71717a",
            border: "1px solid #27272a",
            borderRadius: 9,
            padding: "11px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

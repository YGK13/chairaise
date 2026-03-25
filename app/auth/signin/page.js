'use client';
// ============================================================
// ChaiRaise — Sign-In Page (BULLETPROOF)
// Three paths in: Quick Demo, Email, OAuth
// Email always works. Demo is instant. OAuth gracefully degrades.
// ============================================================
import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function SignInPageWrapper() {
  return (
    <Suspense fallback={<div style={{ height: "100vh", background: "#09090b" }} />}>
      <SignInPage />
    </Suspense>
  );
}

function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const errorMessages = {
    OAuthAccountNotLinked: "This email is already registered with a different method.",
    Configuration: "OAuth provider not configured yet. Use email or demo login.",
    OAuthCallback: "OAuth login failed. Please try email or demo login.",
    Default: "Something went wrong. Please try again.",
  };

  const displayError = error || (urlError ? (errorMessages[urlError] || errorMessages.Default) : "");

  // ---- QUICK DEMO LOGIN — instant access, no credentials needed ----
  const handleDemo = async () => {
    setLoading("demo");
    setError("");
    try {
      const result = await signIn("credentials", {
        email: "demo@chairaise.com",
        password: "demo123456",
        redirect: false,
      });
      if (result?.ok) {
        window.location.href = "/";
      } else {
        setError("Demo login failed. Please try email login.");
      }
    } catch (e) {
      setError("Demo login failed. Please try email login.");
    }
    setLoading("");
  };

  // ---- EMAIL LOGIN — always works ----
  const handleEmail = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Email and password required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading("email");
    setError("");
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Login failed. Check your credentials and try again.");
      } else if (result?.ok) {
        window.location.href = "/";
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (e) {
      setError("Connection error. Please check your network.");
    }
    setLoading("");
  };

  // ---- OAUTH — gracefully degrades ----
  const handleOAuth = async (provider) => {
    setLoading(provider);
    setError("");
    try {
      await signIn(provider, { callbackUrl: "/" });
    } catch (e) {
      setError(`${provider} login not configured yet. Use email or demo login.`);
      setLoading("");
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(135deg, #09090b 0%, #1a1a2e 50%, #09090b 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#18181b", border: "1px solid #27272a", borderRadius: 12,
        padding: "36px 40px", width: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
        <div style={{
          width: 52, height: 52, background: "#f59e0b", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 20, color: "#09090b", margin: "0 auto 12px",
        }}>CR</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: "center", color: "#fafafa", marginBottom: 2 }}>ChaiRaise</h1>
        <p style={{ fontSize: 11, color: "#71717a", textAlign: "center", marginBottom: 24 }}>AI-Native Jewish Fundraising CRM</p>

        {displayError && (
          <div style={{
            background: "rgba(239,68,68,0.12)", color: "#ef4444",
            padding: "8px 12px", borderRadius: 6, marginBottom: 16, fontSize: 12,
          }}>{displayError}</div>
        )}

        {/* ===== QUICK DEMO — the fastest path in ===== */}
        <button
          onClick={handleDemo}
          disabled={!!loading}
          style={{
            width: "100%", padding: "14px", borderRadius: 8,
            border: "2px solid #f59e0b", background: "rgba(245,158,11,0.08)", color: "#f59e0b",
            fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            marginBottom: 20, opacity: loading === "demo" ? 0.6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          {loading === "demo" ? "⏳ Loading demo..." : "⚡ Try ChaiRaise — Quick Demo"}
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "#27272a" }} />
          <span style={{ fontSize: 10, color: "#52525b", textTransform: "uppercase", letterSpacing: 1 }}>or sign in</span>
          <div style={{ flex: 1, height: 1, background: "#27272a" }} />
        </div>

        {/* ===== EMAIL LOGIN ===== */}
        <form onSubmit={handleEmail}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@yourorg.org" autoComplete="email"
              style={{
                width: "100%", padding: "9px 12px", background: "#09090b",
                border: "1px solid #27272a", borderRadius: 6, color: "#fafafa",
                fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters" autoComplete="current-password"
              style={{
                width: "100%", padding: "9px 12px", background: "#09090b",
                border: "1px solid #27272a", borderRadius: 6, color: "#fafafa",
                fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <button
            type="submit" disabled={!!loading}
            style={{
              width: "100%", padding: "11px", borderRadius: 8,
              border: "none", background: "#f59e0b", color: "#09090b",
              fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              opacity: loading === "email" ? 0.6 : 1,
            }}>
            {loading === "email" ? "Signing in..." : "Sign In with Email"}
          </button>
        </form>

        <p style={{ fontSize: 10, color: "#52525b", textAlign: "center", marginTop: 8, marginBottom: 16 }}>
          New here? Any email + password (6+ chars) creates your account instantly.
        </p>

        {/* ===== SOCIAL LOGIN ===== */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => handleOAuth("google")}
            disabled={!!loading}
            style={{
              flex: 1, padding: "9px", borderRadius: 8,
              border: "1px solid #27272a", background: "#fff", color: "#1f1f1f",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontFamily: "inherit", opacity: loading === "google" ? 0.6 : 1,
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button
            onClick={() => handleOAuth("linkedin")}
            disabled={!!loading}
            style={{
              flex: 1, padding: "9px", borderRadius: 8,
              border: "1px solid #27272a", background: "#0A66C2", color: "#fff",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontFamily: "inherit", opacity: loading === "linkedin" ? 0.6 : 1,
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </button>
        </div>

        {/* Footer */}
        <p style={{ fontSize: 9, color: "#3f3f46", textAlign: "center", marginTop: 20, lineHeight: 1.5 }}>
          By signing in, you agree to ChaiRaise's <a href="/privacy" style={{ color: "#52525b" }}>Privacy Policy</a>.
          <br />Your data is encrypted and never shared.
        </p>
      </div>
    </div>
  );
}

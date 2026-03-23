'use client';
// ============================================================
// ChaiRaise — Custom Sign-In Page
// Beautiful auth screen with Google, LinkedIn, and Email options
// ============================================================
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  const [mode, setMode] = useState("social"); // social | email

  const handleOAuth = async (provider) => {
    setLoading(provider);
    setError("");
    try {
      await signIn(provider, { callbackUrl: "/" });
    } catch (e) {
      setError("Failed to connect. Please try again.");
      setLoading("");
    }
  };

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
        setError("Invalid credentials. Please try again.");
      } else {
        window.location.href = "/";
      }
    } catch (e) {
      setError("Login failed. Please try again.");
    }
    setLoading("");
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
        padding: 40, width: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
        <div style={{
          width: 56, height: 56, background: "#f59e0b", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 22, color: "#09090b", margin: "0 auto 16px",
        }}>CR</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, textAlign: "center", color: "#fafafa", marginBottom: 4 }}>ChaiRaise</h1>
        <p style={{ fontSize: 12, color: "#71717a", textAlign: "center", marginBottom: 28 }}>AI-Native Jewish Fundraising CRM</p>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.12)", color: "#ef4444",
            padding: "8px 12px", borderRadius: 6, marginBottom: 16, fontSize: 12,
          }}>{error}</div>
        )}

        {/* Social Login Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => handleOAuth("google")}
            disabled={!!loading}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 8,
              border: "1px solid #27272a", background: "#fff", color: "#1f1f1f",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              fontFamily: "inherit", opacity: loading === "google" ? 0.6 : 1,
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading === "google" ? "Connecting..." : "Continue with Google"}
          </button>

          <button
            onClick={() => handleOAuth("linkedin")}
            disabled={!!loading}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 8,
              border: "1px solid #27272a", background: "#0A66C2", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              fontFamily: "inherit", opacity: loading === "linkedin" ? 0.6 : 1,
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            {loading === "linkedin" ? "Connecting..." : "Continue with LinkedIn"}
          </button>
        </div>

        {/* Divider */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
        }}>
          <div style={{ flex: 1, height: 1, background: "#27272a" }} />
          <span style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: 1 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#27272a" }} />
        </div>

        {/* Email Login */}
        <form onSubmit={handleEmail}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@yourorg.org"
              style={{
                width: "100%", padding: "10px 12px", background: "#09090b",
                border: "1px solid #27272a", borderRadius: 6, color: "#fafafa",
                fontSize: 13, fontFamily: "inherit", outline: "none",
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              style={{
                width: "100%", padding: "10px 12px", background: "#09090b",
                border: "1px solid #27272a", borderRadius: 6, color: "#fafafa",
                fontSize: 13, fontFamily: "inherit", outline: "none",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!!loading}
            style={{
              width: "100%", padding: "12px", borderRadius: 8,
              border: "none", background: "#f59e0b", color: "#09090b",
              fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              opacity: loading === "email" ? 0.6 : 1,
            }}>
            {loading === "email" ? "Signing in..." : "Sign In with Email"}
          </button>
        </form>

        {/* Footer */}
        <p style={{ fontSize: 10, color: "#52525b", textAlign: "center", marginTop: 20, lineHeight: 1.5 }}>
          By signing in, you agree to ChaiRaise's Terms of Service and Privacy Policy.
          <br />Your data is encrypted and never shared.
        </p>
      </div>
    </div>
  );
}

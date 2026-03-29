// ============================================================
// ChaiRaise — Dynamic OG Image (generated via Satori/Edge)
// Shows branded card for social sharing on LinkedIn, Twitter, etc.
// ============================================================
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ChaiRaise — AI-Native Jewish Fundraising CRM";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #09090b 0%, #1a1a2e 50%, #09090b 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 80,
            height: 80,
            background: "#f59e0b",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            fontWeight: 800,
            color: "#09090b",
            marginBottom: 24,
          }}
        >
          CR
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#fafafa",
            letterSpacing: -2,
            marginBottom: 8,
          }}
        >
          ChaiRaise
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: "#a1a1aa",
            marginBottom: 32,
          }}
        >
          AI-Native Jewish Fundraising CRM
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 20,
            color: "#f59e0b",
            fontWeight: 600,
            padding: "8px 24px",
            borderRadius: 12,
            background: "rgba(245, 158, 11, 0.12)",
          }}
        >
          Multiply Your Impact by 18
        </div>

        {/* Features strip */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 32,
            fontSize: 14,
            color: "#71717a",
          }}
        >
          <span>AI Donor Intelligence</span>
          <span>•</span>
          <span>Cause Matching</span>
          <span>•</span>
          <span>Social Graph</span>
          <span>•</span>
          <span>Smart Outreach</span>
        </div>
      </div>
    ),
    { ...size }
  );
}

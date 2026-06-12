import { dirname } from "path";
import { fileURLToPath } from "url";

// Pin the workspace root to this project so Next ignores the parent Downloads
// lockfile (silences the multi-lockfile "inferred workspace root" warning).
const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Turbopack workspace root — see note above.
  turbopack: { root: __dirname },

  // ============================================================
  // SECURITY HEADERS — protect against XSS, clickjacking, MIME sniffing
  // ============================================================
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
      // API routes get CORS headers for webhook integration
      {
        source: "/api/webhook",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, x-webhook-secret, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;

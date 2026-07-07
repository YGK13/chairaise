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
    // Content-Security-Policy. Locked-down defaults with two pragmatic
    // 'unsafe-*' allowances that Next.js + React 19 require until we
    // wire per-request nonces:
    //   script-src 'unsafe-inline' 'unsafe-eval'
    //     Next hydration and dev-mode HMR inject inline scripts and
    //     eval() during compilation. Nonces would eliminate both but
    //     require a middleware that mints a nonce per request and
    //     stamps it into every <script>. Deferred to when we ship the
    //     middleware.
    //   style-src 'unsafe-inline'
    //     ChaiRaise ships thousands of inline styles across
    //     LandingPage / CRMApp / PlanGate / signin. Nonces would work
    //     but require the same middleware. Deferred.
    // Everything else is locked:
    //   default-src 'self'
    //   img-src 'self' data: blob: https:
    //     data:/blob: for canvas + generated images. https: for the
    //     handful of remote images (logos, donor photos) the CRM
    //     already fetches.
    //   connect-src 'self' https://api.stripe.com https://api.anthropic.com
    //     https://api.perplexity.ai https://api.resend.com
    //     Only outbound XHR/fetch targets the CRM actually uses.
    //   frame-src https://js.stripe.com https://hooks.stripe.com
    //     Stripe Checkout + Elements load in an iframe.
    //   frame-ancestors 'none'
    //     Nobody can iframe ChaiRaise (also enforced by X-Frame-Options
    //     DENY as a fallback for older UAs).
    //   base-uri 'self' / form-action 'self' / object-src 'none'
    //     Belt-and-braces against injection.
    //   upgrade-insecure-requests
    //     Any accidental http:// URL in an ad or old email link auto-
    //     upgrades to https.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://api.stripe.com https://api.anthropic.com https://api.perplexity.ai https://api.resend.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

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
          { key: "Content-Security-Policy", value: csp },
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

import type { NextConfig } from "next";

// Bank-grade security headers. CSP is in Report-Only mode for the first
// production week — flip to enforcing after monitoring /api/csp-report.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), browsing-topics=(), fullscreen=(self)",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // credentialless lets us still load Supabase/Upstash without breaking
  // when COEP wants opt-in; require-corp would break those.
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
];

// Static CSP (no nonces yet — would need middleware + layout integration).
// Lists every host the app talks to. Tailwind v4 ships static CSS so no
// 'unsafe-inline' needed for styles. Server Actions need 'unsafe-eval'
// allowance currently disabled — verify nothing breaks before tightening.
const supabaseProject =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "") ??
  "*.supabase.co";

const csp = [
  `default-src 'self'`,
  // Next.js 16 prod uses static JS, no eval — but framework chunks ship
  // inline scripts on hydration. Use 'unsafe-inline' temporarily; revisit
  // with nonce-based CSP after a sprint.
  `script-src 'self' 'unsafe-inline'`,
  // Tailwind builds to a static stylesheet; allow inline for any minor
  // RSC-injected styles. Tighten with nonces later.
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `connect-src 'self' https://${supabaseProject} wss://${supabaseProject} https://*.upstash.io https://api.resend.com https://efaktura.mfin.gov.rs https://demoefaktura.mfin.gov.rs https://kjs.trezor.gov.rs`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          // Report-Only for the first week. Flip to enforcing after
          // monitoring violations (no reporter endpoint yet — browser
          // console only).
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
      // Auth surfaces must never be cached by browser / CDN
      {
        source: "/login",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/register",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/forgot-password",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/auth/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;

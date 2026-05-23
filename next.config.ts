import type { NextConfig } from "next";

// Bank-grade security headers. CSP is emitted per-request from proxy.ts
// with a fresh nonce so we can use 'strict-dynamic' instead of
// 'unsafe-inline' — see proxy.ts buildCsp() for the policy.
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

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders],
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

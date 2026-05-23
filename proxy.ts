import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/fakture",
  "/klijenti",
  "/podesavanja",
  "/admin",
  "/sef",
  "/knjige",
  "/banka",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

// Supabase host extracted for connect-src.
const SUPABASE_HOST =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "") ??
  "*.supabase.co";

// Per-request CSP. We split into two profiles:
//
//  - STRICT (nonce + strict-dynamic): for routes that render user data.
//    Requires the layout to be dynamic so Next can inject the nonce into
//    its inline RSC scripts.
//  - STATIC (script-src 'self' + 'unsafe-inline'): for public landing pages
//    that are static-prerendered. Next emits known-good inline hydration
//    scripts at build time; allowing 'unsafe-inline' here is acceptable
//    because no user data is rendered (XSS risk is bounded), and it lets
//    the marketing pages stay edge-cached.
//
// XSS surface area: static pages render server-controlled marketing copy
// only; no path parameters or query strings are echoed, no user input is
// reflected. The protected pages (where any XSS would be catastrophic)
// keep the strict nonce policy.
const COMMON_DIRECTIVES = [
  `default-src 'self'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://*.upstash.io https://api.resend.com https://efaktura.mfin.gov.rs https://demoefaktura.mfin.gov.rs https://kjs.trezor.gov.rs`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  `upgrade-insecure-requests`,
  `report-uri /api/csp-report`,
  `report-to csp-endpoint`,
];

function buildStrictCsp(nonce: string, isDev: boolean): string {
  return [
    ...COMMON_DIRECTIVES,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
  ].join("; ");
}

function buildStaticCsp(isDev: boolean): string {
  return [
    ...COMMON_DIRECTIVES,
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  ].join("; ");
}

// Public paths that get the relaxed (static-friendly) CSP. Everything else
// — /dashboard, /fakture, /klijenti, etc. — gets the strict nonce CSP.
const PUBLIC_STATIC_PATHS = new Set([
  "/",
  "/login",
  "/login/2fa",
  "/register",
  "/register/check-email",
  "/forgot-password",
  "/auth/reset-password",
  "/uslovi",
  "/privatnost",
  "/podrska",
  "/hvala",
  "/offline",
]);

function isStaticPublicPath(pathname: string): boolean {
  return PUBLIC_STATIC_PATHS.has(pathname);
}

function generateNonce(): string {
  // 16 bytes → 22 base64 chars. crypto.getRandomValues is available on the
  // edge runtime; Buffer is not, so we hand-roll base64.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa exists in the edge runtime.
  return btoa(binary).replace(/=+$/, "");
}

export async function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const pathname = request.nextUrl.pathname;
  const useStrict = !isStaticPublicPath(pathname);
  const nonce = useStrict ? generateNonce() : "";
  const csp = useStrict
    ? buildStrictCsp(nonce, isDev)
    : buildStaticCsp(isDev);

  // Only inject the nonce request header when strict CSP is active. Reading
  // headers() in the root layout opts the route into dynamic rendering, so
  // public static pages must not see the header.
  const requestHeaders = new Headers(request.headers);
  if (useStrict) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // If Supabase env vars are missing (e.g. preview without secrets) we still
  // want the CSP/security headers on the response, but we cannot evaluate
  // auth. Skip the auth check rather than 500-ing the whole site.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    applySecurityHeaders(supabaseResponse, csp);
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirect = NextResponse.redirect(url);
    applySecurityHeaders(redirect, csp);
    return redirect;
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirect = NextResponse.redirect(url);
    applySecurityHeaders(redirect, csp);
    return redirect;
  }

  // 2FA enforcement: if the user has an enrolled factor (nextLevel === aal2)
  // but the session is still aal1, gate every protected route behind the MFA
  // challenge page. The /login/2fa route itself must be reachable to break
  // the loop.
  if (user && isProtectedPath(pathname) && pathname !== "/login/2fa") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
      const url = request.nextUrl.clone();
      url.pathname = "/login/2fa";
      const redirect = NextResponse.redirect(url);
      applySecurityHeaders(redirect, csp);
      return redirect;
    }
  }

  applySecurityHeaders(supabaseResponse, csp);
  return supabaseResponse;
}

function applySecurityHeaders(response: NextResponse, csp: string): void {
  response.headers.set("Content-Security-Policy", csp);
  // Modern reporting API alongside the legacy report-uri directive above.
  response.headers.set(
    "Reporting-Endpoints",
    'csp-endpoint="/api/csp-report"',
  );
}

export const config = {
  // Run on every HTML request so the nonce + CSP land on every page. We skip
  // _next static chunks (they're already covered by script-src 'self' +
  // strict-dynamic via the parent document's nonce), Next image optimiser,
  // /api routes (csp-report etc. — they don't render HTML and would only add
  // overhead), the SW, the favicon, and the manifest.
  matcher: [
    // Broad matcher so CSP nonce lands on every HTML response, including
    // /login/2fa. Excludes static/asset/api/SW paths.
    {
      source:
        "/((?!api|_next/static|_next/image|_next/data|favicon\\.ico|manifest\\.webmanifest|sw\\.js|robots\\.txt|sitemap\\.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

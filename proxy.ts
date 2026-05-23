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

// Per-request CSP with a fresh nonce. 'strict-dynamic' tells the browser to
// trust any script that the nonce-allowed scripts load — letting Next.js's
// framework chunks chain without us needing to whitelist every static file.
// Next.js auto-injects this nonce on its <script> tags when it sees the
// Content-Security-Policy header on the incoming request (it reads the
// 'nonce-<value>' token).
function buildCsp(nonce: string, isDev: boolean): string {
  return [
    `default-src 'self'`,
    // 'unsafe-eval' is required in dev because React's dev runtime uses eval
    // for better stack traces. Stripped in production.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Stylesheets must carry the nonce. Tailwind builds to a static .css
    // file under /_next/static which 'self' already covers.
    `style-src 'self' 'nonce-${nonce}'`,
    // Inline style="..." attributes (e.g. error pages, dynamic widths on
    // progress bars) are not script-injection vectors. Allowing the attr
    // sink does NOT loosen script-src.
    `style-src-attr 'unsafe-inline'`,
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
  ].join("; ");
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
  const nonce = generateNonce();
  const csp = buildCsp(nonce, isDev);

  // Propagate the nonce into the request headers so the root layout (and any
  // server component) can read it via headers().get('x-nonce'). Next.js also
  // parses the Content-Security-Policy request header and auto-applies the
  // nonce to its own framework scripts during SSR.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

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

  const pathname = request.nextUrl.pathname;

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

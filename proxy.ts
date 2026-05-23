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

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
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
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 2FA enforcement: if the user has an enrolled factor (nextLevel === aal2)
  // but the session is still aal1, gate every protected route behind the MFA
  // challenge page. The /login/2fa route itself must be reachable to break
  // the loop, and we don't bother gating the bare /login path either since
  // the post-login redirect handles it.
  if (
    user &&
    isProtectedPath(pathname) &&
    pathname !== "/login/2fa"
  ) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
      const url = request.nextUrl.clone();
      url.pathname = "/login/2fa";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/fakture",
    "/fakture/:path*",
    "/klijenti",
    "/klijenti/:path*",
    "/podesavanja",
    "/podesavanja/:path*",
    "/admin",
    "/admin/:path*",
    "/sef",
    "/sef/:path*",
    "/knjige",
    "/knjige/:path*",
    "/banka",
    "/banka/:path*",
    "/login",
    "/login/2fa",
    "/register",
  ],
};

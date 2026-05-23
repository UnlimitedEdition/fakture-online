// Supabase Auth callback — handles email confirmation, magic link, and
// password-reset code exchange. Always redirects to a safe path; never
// echoes the `next` param verbatim to avoid open-redirect.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SAFE_REDIRECTS = new Set([
  "/dashboard",
  "/auth/reset-password",
  "/login",
]);

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const requestedNext = req.nextUrl.searchParams.get("next") ?? "/dashboard";
  const next = SAFE_REDIRECTS.has(requestedNext) ? requestedNext : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth.callback]", { code: error.code, message: error.message });
    return NextResponse.redirect(new URL("/login?error=callback_failed", req.url));
  }

  return NextResponse.redirect(new URL(next, req.url));
}

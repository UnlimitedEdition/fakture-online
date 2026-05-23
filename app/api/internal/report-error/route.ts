import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestMeta } from "@/lib/request-meta";

// Lightweight client-side error sink. Receives a minimal payload from
// app/error.tsx and app/global-error.tsx, persists into fo_client_errors
// (table created in migration 0017) for admin review, and optionally fires
// an email to NOTIFICATION_EMAIL if configured.
//
// IMPORTANT: no PII — only error digest, message, path, UA, fatal flag.
export async function POST(req: NextRequest) {
  const meta = await getRequestMeta();
  const ipKey = meta.ip ?? "unknown";

  const limit = await checkRateLimit("errorReport", `ip:${ipKey}`);
  if (!limit.allowed) {
    return NextResponse.json({ ok: true });
  }

  let body: {
    digest?: string | null;
    message?: string;
    path?: string;
    ua?: string;
    fatal?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const digest = (body.digest ?? "").toString().slice(0, 64) || null;
  const message = (body.message ?? "").toString().slice(0, 200);
  const path = (body.path ?? "").toString().slice(0, 256);
  const ua = (body.ua ?? "").toString().slice(0, 256);
  const fatal = body.fatal === true;

  // Server log so it shows up in Vercel runtime logs.
  console.error("[client.error]", { digest, message, path, ua, fatal, ip: ipKey });

  // Best-effort: write to fo_client_errors via service-role client (no user
  // context required — table is service-role only). Skip if env missing.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await admin.from("fo_client_errors").insert({
        digest,
        message,
        path,
        user_agent: ua,
        ip: ipKey === "unknown" ? null : ipKey,
        fatal,
      });
    } catch (err) {
      console.error("[client.error.persist]", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Best-effort email alert on FATAL only — avoid noise from every
  // recoverable boundary error.
  if (fatal) {
    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.NOTIFICATION_EMAIL;
    if (resendKey && notifyEmail) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "FaktureOnline Alerts <onboarding@resend.dev>",
            to: notifyEmail,
            subject: `[FATAL] FaktureOnline error ${digest ?? ""}`,
            text: `Path: ${path}\nDigest: ${digest}\nMessage: ${message}\nUA: ${ua}\nIP: ${ipKey}\n`,
          }),
        });
      } catch (err) {
        console.error("[client.error.email]", {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

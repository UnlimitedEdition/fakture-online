// Daily cron: generate invoices from due recurring schedules.
// Trigger: Vercel cron at 04:00 UTC. Auth: X-Cron-Secret.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeEqual } from "@/lib/security/safe-equal";

export const dynamic = "force-dynamic";

function authOk(req: NextRequest): boolean {
  const expected = process.env.SEF_CRON_SECRET;
  if (!expected) return false;
  return safeEqual(req.headers.get("x-cron-secret"), expected);
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Cron requires SUPABASE_SERVICE_ROLE_KEY.");
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const svc = serviceClient();
  const { data, error } = await svc.rpc("fo_recurring_generate_due");
  if (error) {
    console.error("[cron.recurring-generator]", { code: error.code, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...(data as Record<string, unknown>) });
}

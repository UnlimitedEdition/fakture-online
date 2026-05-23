// SEF webhook callback receiver.
// Authentication via X-Callback-Secret HEADER only (not query param —
// secrets in URLs leak into access logs and CDN/proxy caches).

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { mapSefRemoteStatus } from "@/lib/sef/types";
import { safeEqual } from "@/lib/security/safe-equal";
import { checkRateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/uuid";

export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Callback requires SUPABASE_SERVICE_ROLE_KEY.");
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;

  // Validate userId is a UUID before any DB call (prevents enumeration via
  // distinct error timings between "user exists" vs "syntactically invalid").
  if (!isUuid(userId)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Rate-limit: 30 req/min per IP+userId (callback is a public endpoint with
  // only header-secret as auth — must throttle to prevent brute-force).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit("sefCallback", `${ip}:${userId}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const providedSecret = req.headers.get("x-callback-secret") ?? "";

  if (!providedSecret || providedSecret.length < 32) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const svc = serviceClient();

  const { data: profile } = await svc
    .from("fo_profiles")
    .select("id, sef_callback_secret, sef_demo_mode")
    .eq("id", userId)
    .maybeSingle();

  // Hash the incoming secret and constant-time-compare against stored hash.
  // If no profile, still do a dummy compare to mask timing oracle.
  const incomingHash = await (async () => {
    const { sha256Hex } = await import("@/lib/sef/key-encryption");
    return sha256Hex(providedSecret);
  })();
  const storedHash = profile?.sef_callback_secret ?? "x".repeat(64);
  if (!safeEqual(incomingHash, storedHash) || !profile) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // accept empty/non-JSON bodies as ping
  }

  const sefId =
    (typeof body.SalesInvoiceId === "string" && body.SalesInvoiceId) ||
    (typeof body.InvoiceId === "string" && body.InvoiceId) ||
    (typeof body.PurchaseInvoiceId === "string" && body.PurchaseInvoiceId) ||
    null;
  const statusRaw =
    (typeof body.Status === "string" && body.Status) ||
    (typeof body.NewStatus === "string" && body.NewStatus) ||
    null;
  const newStatus = mapSefRemoteStatus(statusRaw);

  if (sefId && newStatus) {
    await svc
      .from("fo_invoices")
      .update({
        sef_status: newStatus,
        sef_status_updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("sef_document_id", sefId);
  }

  return NextResponse.json({ ok: true, accepted: !!(sefId && newStatus) });
}

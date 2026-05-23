// SEF webhook callback receiver.
// Authentication via X-Callback-Secret HEADER only (not query param —
// secrets in URLs leak into access logs and CDN/proxy caches).

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { mapSefRemoteStatus } from "@/lib/sef/types";

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
  const providedSecret = req.headers.get("x-callback-secret") ?? "";

  if (!providedSecret || providedSecret.length < 32) {
    return NextResponse.json({ error: "missing or invalid secret" }, { status: 401 });
  }

  const svc = serviceClient();

  const { data: profile } = await svc
    .from("fo_profiles")
    .select("id, sef_callback_secret, sef_demo_mode")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.sef_callback_secret !== providedSecret) {
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

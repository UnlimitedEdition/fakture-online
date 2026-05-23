// Daily cron: poll SEF for status changes on outbound invoices (yesterday's date).
// Trigger: Vercel cron at 06:00 UTC. Auth via X-Cron-Secret header.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { loadSefCredentials } from "@/lib/sef/credentials";
import {
  sefListSalesChanges,
  unwrapChanges,
} from "@/lib/sef/api/list-changes";
import { sefGetInvoice, parseStatusResponse } from "@/lib/sef/api/get-status";
import { sefGetSignedXml } from "@/lib/sef/api/get-xml";
import { mapSefRemoteStatus, type SefStatus } from "@/lib/sef/types";

export const dynamic = "force-dynamic";

function authOk(req: NextRequest): boolean {
  const expected = process.env.SEF_CRON_SECRET;
  if (!expected) return false;
  const got = req.headers.get("x-cron-secret");
  return got === expected;
}

// Build a service-role Supabase client (bypasses RLS for cron sweep).
// Uses NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (separate from old SUPABASE_SERVICE_KEY).
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Cron requires SUPABASE_SERVICE_ROLE_KEY to be set.");
  }
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const svc = serviceClient();

  // Find all users with an active SEF key.
  const { data: profiles, error: pErr } = await svc
    .from("fo_profiles")
    .select("id, sef_demo_mode")
    .not("sef_api_key_encrypted", "is", null);

  if (pErr) {
    return NextResponse.json({ error: "profiles fetch failed", details: pErr.message }, { status: 500 });
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFrom = `${yesterday.toISOString().slice(0, 10)}T00:00:00`;
  const dateTo = `${yesterday.toISOString().slice(0, 10)}T23:59:59`;

  let processed = 0;
  let updated = 0;
  let errors = 0;

  for (const profile of profiles ?? []) {
    try {
      const creds = await loadSefCredentials(profile.id);
      if (!creds) continue;

      const changesRes = await sefListSalesChanges({ creds, dateFrom, dateTo });
      if (!changesRes.ok) {
        errors++;
        console.error("[cron.sef-poll-status]", {
          user_id: profile.id,
          status: changesRes.httpStatus,
          message: changesRes.errorMessage,
        });
        continue;
      }

      const changes = unwrapChanges(changesRes.data);
      for (const ch of changes) {
        processed++;
        const sefId = ch.SalesInvoiceId ?? ch.InvoiceId;
        if (!sefId) continue;
        const newStatus: SefStatus | null = mapSefRemoteStatus(ch.Status);
        if (!newStatus) continue;

        // Find local invoice by sef_document_id.
        const { data: invoice } = await svc
          .from("fo_invoices")
          .select("id, sef_status, sef_signed_archive_path")
          .eq("user_id", profile.id)
          .eq("sef_document_id", sefId)
          .maybeSingle();

        if (!invoice) continue;
        if (invoice.sef_status === newStatus) continue;

        await svc
          .from("fo_invoices")
          .update({
            sef_status: newStatus,
            sef_status_updated_at: new Date().toISOString(),
          })
          .eq("id", invoice.id);
        updated++;

        // For terminal statuses, fetch + archive the signed XML if we don't have it yet.
        if (
          !invoice.sef_signed_archive_path &&
          ["odobreno", "odbijeno", "storniran"].includes(newStatus)
        ) {
          const sig = await sefGetSignedXml({ creds, salesInvoiceId: sefId });
          if (sig.ok && sig.raw) {
            try {
              // Note: archiveXml uses request-scoped Supabase client (cookies).
              // We skip archive here in cron — handled on next user-initiated checkSefStatus.
              // (Alternative: pass service client into archive — left as future cleanup.)
            } catch {
              // ignore
            }
          }
        }

        // Optional: confirm by GETting full invoice (more reliable than /changes).
        const detail = await sefGetInvoice({ creds, salesInvoiceId: sefId });
        const parsed = parseStatusResponse(detail);
        if (parsed.status && parsed.status !== newStatus) {
          await svc
            .from("fo_invoices")
            .update({
              sef_status: parsed.status,
              sef_status_updated_at: new Date().toISOString(),
              sef_error_message: parsed.errorMessage,
            })
            .eq("id", invoice.id);
        }
      }
    } catch (err) {
      errors++;
      console.error("[cron.sef-poll-status.user]", {
        user_id: profile.id,
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    users_checked: profiles?.length ?? 0,
    changes_processed: processed,
    invoices_updated: updated,
    errors,
    period: { from: dateFrom, to: dateTo },
  });
}

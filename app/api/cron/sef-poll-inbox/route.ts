// Daily cron: fetch new inbox documents from SEF for each user with credentials.
// Trigger: Vercel cron at 07:00 UTC. Auth via X-Cron-Secret header.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { loadSefCredentials } from "@/lib/sef/credentials";
import { sefListInbox } from "@/lib/sef/api/inbox-list";
import { sefGetInboxXml } from "@/lib/sef/api/inbox-get";
import { parseInboxInvoice } from "@/lib/sef/ubl/parse/inbox-invoice";
import { mapSefRemoteStatus } from "@/lib/sef/types";

export const dynamic = "force-dynamic";

function authOk(req: NextRequest): boolean {
  const expected = process.env.SEF_CRON_SECRET;
  if (!expected) return false;
  return req.headers.get("x-cron-secret") === expected;
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

  const { data: profiles, error: pErr } = await svc
    .from("fo_profiles")
    .select("id, sef_demo_mode")
    .not("sef_api_key_encrypted", "is", null);

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFrom = `${yesterday.toISOString().slice(0, 10)}T00:00:00`;
  const dateTo = `${yesterday.toISOString().slice(0, 10)}T23:59:59`;

  let totalNew = 0;
  let errors = 0;

  for (const profile of profiles ?? []) {
    try {
      const creds = await loadSefCredentials(profile.id);
      if (!creds) continue;

      const listRes = await sefListInbox({
        creds,
        dateFrom,
        dateTo,
        pageSize: 500,
      });
      if (!listRes.ok) {
        errors++;
        console.error("[cron.sef-poll-inbox]", {
          user_id: profile.id,
          status: listRes.httpStatus,
          message: listRes.errorMessage,
        });
        continue;
      }

      const rows = Array.isArray(listRes.data)
        ? listRes.data
        : (listRes.data?.Items ?? listRes.data?.Result ?? []);

      for (const row of rows) {
        const sefId = row.PurchaseInvoiceId ?? row.InvoiceId;
        if (!sefId) continue;

        // Skip if already in our inbox.
        const { data: existing } = await svc
          .from("fo_sef_inbox")
          .select("id")
          .eq("user_id", profile.id)
          .eq("sef_document_id", sefId)
          .maybeSingle();
        if (existing) continue;

        // Fetch XML to extract details.
        const xmlRes = await sefGetInboxXml({ creds, purchaseInvoiceId: sefId });
        if (!xmlRes.ok || !xmlRes.raw) continue;

        let parsed: ReturnType<typeof parseInboxInvoice> | null = null;
        try {
          parsed = parseInboxInvoice(xmlRes.raw);
        } catch (err) {
          console.error("[cron.sef-poll-inbox.parse]", {
            sef_id: sefId,
            message: err instanceof Error ? err.message : "unknown",
          });
        }

        const status = mapSefRemoteStatus(row.Status) ?? "poslato";

        await svc.from("fo_sef_inbox").insert({
          user_id: profile.id,
          sef_document_id: sefId,
          invoice_number: parsed?.invoiceNumber ?? row.InvoiceNumber ?? null,
          document_type: parsed?.rootKind === "CreditNote" ? "credit_note" : "invoice",
          supplier_pib: parsed?.supplierPib ?? row.ContractorPib ?? null,
          supplier_name: parsed?.supplierName ?? row.ContractorName ?? null,
          issue_date: parsed?.issueDate ?? null,
          due_date: parsed?.dueDate ?? null,
          currency: parsed?.currencyCode ?? row.CurrencyCode ?? "RSD",
          total_amount: parsed?.totalAmount ?? row.Amount ?? null,
          tax_amount: parsed?.taxAmount ?? null,
          sef_status: status,
          raw_xml_excerpt: xmlRes.raw.slice(0, 4000),
          is_demo: creds.isDemo,
        });
        totalNew++;
      }
    } catch (err) {
      errors++;
      console.error("[cron.sef-poll-inbox.user]", {
        user_id: profile.id,
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    users_checked: profiles?.length ?? 0,
    new_inbox_rows: totalNew,
    errors,
  });
}

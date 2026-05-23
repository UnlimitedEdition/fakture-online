// Daily cron: send overdue-invoice reminder emails on a 3-step cadence
// (D+1 gentle, D+7 firm, D+14 final). Idempotent — fo_overdue_reminders has
// a unique (invoice_id, level) constraint and fo_record_reminder uses
// ON CONFLICT DO NOTHING.
//
// Trigger: Vercel cron at 09:00 UTC (10:00/11:00 Belgrade per DST).
// Auth: X-Cron-Secret header, timing-safe compared against SEF_CRON_SECRET.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeEqual } from "@/lib/security/safe-equal";
import { escapeHtml, sanitizeEmailHeader } from "@/lib/html-escape";

export const dynamic = "force-dynamic";

type ReminderRow = {
  invoice_id: string;
  user_id: string;
  client_id: string;
  level: 1 | 2 | 3;
  days_overdue: number;
};

function authOk(req: NextRequest): boolean {
  const expected = process.env.SEF_CRON_SECRET;
  if (!expected) return false;
  return safeEqual(req.headers.get("x-cron-secret"), expected);
}

// Service-role Supabase client — bypasses RLS for cron sweep.
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

function formatRsdDate(d: Date): string {
  // dd.mm.yyyy. — standard Serbian short date.
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}.`;
}

function addDaysUTC(base: Date, days: number): Date {
  const out = new Date(base.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function formatAmount(total: number, currency: string): string {
  return `${Number(total).toLocaleString("sr-RS")} ${currency}`;
}

type EmailContent = { subject: string; html: string; text: string };

function buildEmail(args: {
  level: 1 | 2 | 3;
  clientName: string;
  invoiceNumber: string;
  dueDate: Date;
  totalLabel: string;
  senderCompany: string;
  contactLine: string;
}): EmailContent {
  const { level, clientName, invoiceNumber, dueDate, totalLabel, senderCompany, contactLine } = args;
  const dueStr = formatRsdDate(dueDate);
  const safeClient = escapeHtml(clientName || "klijente");
  const safeInvoice = escapeHtml(invoiceNumber);
  const safeDue = escapeHtml(dueStr);
  const safeAmount = escapeHtml(totalLabel);
  const safeSender = escapeHtml(senderCompany);
  const safeContact = escapeHtml(contactLine);

  let subject: string;
  let intro: string;
  let body: string;
  let textBody: string;

  if (level === 1) {
    // D+1 — Gentle reminder
    subject = `Podsetnik: faktura ${invoiceNumber} je dospela`;
    intro = `Pozdrav ${safeClient},`;
    body = `podsećamo Vas da je faktura br. <strong>${safeInvoice}</strong> dospela ${safeDue}. Iznos za uplatu: <strong>${safeAmount}</strong>.<br/><br/>Ako ste uplatu već izvršili, molimo Vas da zanemarite ovaj email. Hvala unapred.`;
    textBody =
      `Pozdrav ${clientName || "klijente"},\n\n` +
      `podsećamo Vas da je faktura br. ${invoiceNumber} dospela ${dueStr}. ` +
      `Iznos za uplatu: ${totalLabel}.\n\n` +
      `Ako ste uplatu već izvršili, molimo Vas da zanemarite ovaj email. Hvala unapred.\n\n` +
      `${senderCompany}`;
  } else if (level === 2) {
    // D+7 — Firm
    const deadline = addDaysUTC(new Date(), 3);
    const deadlineStr = formatRsdDate(deadline);
    const safeDeadline = escapeHtml(deadlineStr);
    subject = `Kašnjenje uplate: faktura ${invoiceNumber} (7 dana)`;
    intro = `Poštovani ${safeClient},`;
    body = `Faktura br. <strong>${safeInvoice}</strong> (iznos <strong>${safeAmount}</strong>) je 7 dana u kašnjenju (dospeće: ${safeDue}). Molimo Vas da uplatu izvršite do <strong>${safeDeadline}</strong>.<br/><br/>Ukoliko postoji bilo kakav problem sa fakturom, kontaktirajte nas.`;
    textBody =
      `Poštovani ${clientName || "klijente"},\n\n` +
      `Faktura br. ${invoiceNumber} (iznos ${totalLabel}) je 7 dana u kašnjenju ` +
      `(dospeće: ${dueStr}). Molimo Vas da uplatu izvršite do ${deadlineStr}.\n\n` +
      `Ukoliko postoji bilo kakav problem sa fakturom, kontaktirajte nas.\n\n` +
      `${senderCompany}`;
  } else {
    // D+14 — Final
    const deadline = addDaysUTC(new Date(), 7);
    const deadlineStr = formatRsdDate(deadline);
    const safeDeadline = escapeHtml(deadlineStr);
    subject = `POSLEDNJI PODSETNIK: faktura ${invoiceNumber} (14+ dana)`;
    intro = `Poštovani ${safeClient},`;
    body = `Faktura br. <strong>${safeInvoice}</strong> (iznos <strong>${safeAmount}</strong>, dospeće ${safeDue}) je 14+ dana neplaćena.<br/><br/>Ako uplata ne stigne do <strong>${safeDeadline}</strong>, biti ćemo prinuđeni da pristupimo daljim koracima naplate.<br/><br/>Molimo Vas da regulisete obavezu u najkraćem roku ili nas kontaktirate radi dogovora.`;
    textBody =
      `Poštovani ${clientName || "klijente"},\n\n` +
      `Faktura br. ${invoiceNumber} (iznos ${totalLabel}, dospeće ${dueStr}) je 14+ dana neplaćena.\n\n` +
      `Ako uplata ne stigne do ${deadlineStr}, biti ćemo prinuđeni da pristupimo daljim koracima naplate.\n\n` +
      `Molimo Vas da regulisete obavezu u najkraćem roku ili nas kontaktirate radi dogovora.\n\n` +
      `${senderCompany}`;
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0D9488;">Podsetnik za neplaćenu fakturu</h2>
      <p>${intro}</p>
      <p>${body}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="margin: 4px 0;"><strong>${safeSender}</strong></p>
      ${safeContact ? `<p style="margin: 4px 0; color: #475569;">${safeContact}</p>` : ""}
      <p style="color: #94A3B8; font-size: 12px;">Poslato putem FaktureOnline</p>
    </div>
  `;

  return { subject, html, text: textBody };
}

async function sendResendEmail(args: {
  to: string;
  fromName: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; status: number; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 0, error: "missing_resend_api_key" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `${args.fromName} <noreply@resend.dev>`,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `resend_http_${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "network_error",
    };
  }
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const svc = serviceClient();

  const { data: candidates, error: rpcError } = await svc.rpc(
    "fo_invoices_needing_reminder",
  );
  if (rpcError) {
    console.error("[cron.overdue-reminders.rpc]", {
      code: rpcError.code,
      message: rpcError.message,
    });
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const rows = (candidates ?? []) as ReminderRow[];

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      // Fetch invoice + client + sender profile in parallel.
      const [invoiceRes, clientRes, profileRes] = await Promise.all([
        svc
          .from("fo_invoices")
          .select("id, invoice_number, due_date, total, currency, status")
          .eq("id", row.invoice_id)
          .maybeSingle(),
        svc
          .from("fo_clients")
          .select("id, company_name, contact_name, email")
          .eq("id", row.client_id)
          .maybeSingle(),
        svc
          .from("fo_profiles")
          .select("company_name, email, phone")
          .eq("id", row.user_id)
          .maybeSingle(),
      ]);

      const invoice = invoiceRes.data;
      const client = clientRes.data;
      const profile = profileRes.data;

      if (!invoice || !client) {
        skipped++;
        continue;
      }
      const clientEmail = (client.email || "").trim();
      if (!clientEmail) {
        skipped++;
        continue;
      }

      const dueDate = invoice.due_date
        ? new Date(`${invoice.due_date}T00:00:00Z`)
        : new Date();
      const totalLabel = formatAmount(
        Number(invoice.total ?? 0),
        invoice.currency || "RSD",
      );
      const senderCompany = sanitizeEmailHeader(
        profile?.company_name || "FaktureOnline",
      );
      const clientName = client.contact_name || client.company_name || "";
      const contactLine = profile?.email || profile?.phone || "";

      const email = buildEmail({
        level: row.level,
        clientName,
        invoiceNumber: invoice.invoice_number,
        dueDate,
        totalLabel,
        senderCompany,
        contactLine,
      });

      const result = await sendResendEmail({
        to: clientEmail,
        fromName: senderCompany,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });

      if (!result.ok) {
        errors++;
        console.error("[cron.overdue-reminders.send]", {
          invoice_id: row.invoice_id,
          level: row.level,
          status: result.status,
          error: result.error,
        });
        continue;
      }

      // Log the send — idempotent via unique (invoice_id, level).
      const { error: recordError } = await svc.rpc("fo_record_reminder", {
        p_invoice_id: row.invoice_id,
        p_level: row.level,
        p_email: clientEmail,
      });
      if (recordError) {
        // Email already went out; surface but don't fail the loop.
        errors++;
        console.error("[cron.overdue-reminders.record]", {
          invoice_id: row.invoice_id,
          level: row.level,
          code: recordError.code,
          message: recordError.message,
        });
        continue;
      }

      // Flip status to 'overdue' if still 'sent' (best-effort).
      if (invoice.status === "sent") {
        await svc
          .from("fo_invoices")
          .update({ status: "overdue" })
          .eq("id", row.invoice_id)
          .eq("status", "sent");
      }

      sent++;
    } catch (err) {
      errors++;
      console.error("[cron.overdue-reminders.exception]", {
        invoice_id: row.invoice_id,
        level: row.level,
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: rows.length,
    sent,
    skipped,
    errors,
    ran_at: new Date().toISOString(),
  });
}

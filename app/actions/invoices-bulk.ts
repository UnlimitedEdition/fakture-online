"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { escapeHtml, sanitizeEmailHeader } from "@/lib/html-escape";
import { isUuid } from "@/lib/uuid";

const MAX_BULK = 50;

export async function bulkMarkPaid(invoiceIds: string[]) {
  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return { error: "Nije odabrana nijedna faktura." };
  }
  if (invoiceIds.length > MAX_BULK) {
    return { error: `Maksimalno ${MAX_BULK} faktura po pozivu.` };
  }
  if (!invoiceIds.every((id) => isUuid(id))) {
    return { error: "Neispravan ID fakture u listi." };
  }

  const { supabase, user } = await requireUser();

  const rl = await checkRateLimit("bulk", `user:${user.id}`);
  if (!rl.allowed) {
    return { error: "Previše masovnih akcija u kratkom roku. Sačekajte." };
  }

  const nowIso = new Date().toISOString();
  const { error, count } = await supabase
    .from("fo_invoices")
    .update(
      { status: "paid", paid_at: nowIso },
      { count: "exact" },
    )
    .in("id", invoiceIds)
    .eq("user_id", user.id);

  if (error) {
    console.error("[invoices.bulkMarkPaid]", {
      user_id: user.id,
      count_requested: invoiceIds.length,
      code: error.code,
      message: error.message,
    });
    await logAudit({
      action: "invoice.status_changed",
      resourceType: "invoice_bulk",
      success: false,
      metadata: {
        operation: "bulk_mark_paid",
        count: invoiceIds.length,
        code: error.code,
      },
    });
    return { error: "Greška pri masovnom označavanju kao plaćeno." };
  }

  const updated = count ?? 0;
  await logAudit({
    action: "invoice.status_changed",
    resourceType: "invoice_bulk",
    metadata: {
      operation: "bulk_mark_paid",
      count: updated,
      requested: invoiceIds.length,
      status: "paid",
    },
  });

  revalidatePath("/fakture");
  revalidatePath("/dashboard");
  return { success: true, updated };
}

export async function bulkSendEmails(invoiceIds: string[]) {
  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return { error: "Nije odabrana nijedna faktura." };
  }
  if (invoiceIds.length > MAX_BULK) {
    return { error: `Maksimalno ${MAX_BULK} faktura po pozivu.` };
  }
  if (!invoiceIds.every((id) => isUuid(id))) {
    return { error: "Neispravan ID fakture u listi." };
  }

  const { supabase, user } = await requireUser();

  const rl = await checkRateLimit("bulk", `user:${user.id}`);
  if (!rl.allowed) {
    return { error: "Previše masovnih akcija u kratkom roku. Sačekajte." };
  }

  const { data: invoices, error: fetchError } = await supabase
    .from("fo_invoices")
    .select("*, client:fo_clients(*)")
    .in("id", invoiceIds)
    .eq("user_id", user.id);

  if (fetchError || !invoices) {
    console.error("[invoices.bulkSendEmails.fetch]", {
      user_id: user.id,
      count_requested: invoiceIds.length,
      message: fetchError?.message,
    });
    await logAudit({
      action: "invoice.email_sent",
      resourceType: "invoice_bulk",
      success: false,
      metadata: {
        operation: "bulk_send_emails",
        count: invoiceIds.length,
        code: fetchError?.code,
      },
    });
    return { error: "Greška pri učitavanju faktura." };
  }

  const { data: profile } = await supabase.rpc("fo_get_profile");
  const senderCompany = sanitizeEmailHeader(
    profile?.company_name || "FaktureOnline",
  );
  const contactLine = escapeHtml(profile?.email || profile?.phone || "");

  let sent = 0;
  let failed = 0;
  const sentIds: string[] = [];

  for (const invoice of invoices) {
    if (!invoice.client?.email) {
      failed++;
      continue;
    }

    const recipientName = escapeHtml(
      invoice.client.contact_name || invoice.client.company_name,
    );
    const invoiceNumber = escapeHtml(invoice.invoice_number);
    const issueDate = escapeHtml(invoice.issue_date);
    const dueDate = escapeHtml(invoice.due_date || "—");
    const totalLabel = `${Number(invoice.total).toLocaleString("sr-RS")} ${escapeHtml(invoice.currency)}`;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${senderCompany} <noreply@resend.dev>`,
          to: [invoice.client.email],
          subject: `Faktura ${invoice.invoice_number} — ${senderCompany}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0D9488;">Faktura ${invoiceNumber}</h2>
              <p>Poštovani ${recipientName},</p>
              <p>U prilogu se nalazi faktura <strong>${invoiceNumber}</strong> na iznos od <strong>${totalLabel}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #f8fafc;">
                  <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Broj fakture:</strong></td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Datum izdavanja:</strong></td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${issueDate}</td>
                </tr>
                <tr style="background: #f8fafc;">
                  <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Rok plaćanja:</strong></td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;">${dueDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Ukupno:</strong></td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #0D9488;">${totalLabel}</td>
                </tr>
              </table>
              <p>Za sva pitanja, kontaktirajte nas na ${contactLine}.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #94A3B8; font-size: 12px;">Poslato putem FaktureOnline</p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        failed++;
        console.error("[invoices.bulkSendEmails.resend]", {
          user_id: user.id,
          invoice_id: invoice.id,
          status: res.status,
        });
        await logAudit({
          action: "invoice.email_sent",
          resourceType: "invoice",
          resourceId: invoice.id,
          success: false,
          metadata: { bulk: true, resend_status: res.status },
        });
        continue;
      }

      sent++;
      sentIds.push(invoice.id);
      await logAudit({
        action: "invoice.email_sent",
        resourceType: "invoice",
        resourceId: invoice.id,
        metadata: { bulk: true },
      });
    } catch (err) {
      failed++;
      console.error("[invoices.bulkSendEmails.network]", {
        user_id: user.id,
        invoice_id: invoice.id,
        message: err instanceof Error ? err.message : String(err),
      });
      await logAudit({
        action: "invoice.email_sent",
        resourceType: "invoice",
        resourceId: invoice.id,
        success: false,
        metadata: { bulk: true, network_error: true },
      });
    }
  }

  // Best-effort: mark successfully sent invoices as "sent" (only those still in draft).
  if (sentIds.length > 0) {
    const nowIso = new Date().toISOString();
    const { error: statusError } = await supabase
      .from("fo_invoices")
      .update({ status: "sent", sent_at: nowIso })
      .in("id", sentIds)
      .eq("user_id", user.id)
      .eq("status", "draft");

    if (statusError) {
      console.error("[invoices.bulkSendEmails.statusUpdate]", {
        user_id: user.id,
        message: statusError.message,
      });
    }
  }

  // Count missing recipients (requested IDs that weren't fetched, e.g. wrong user_id).
  const notFound = invoiceIds.length - invoices.length;

  await logAudit({
    action: "invoice.status_changed",
    resourceType: "invoice_bulk",
    metadata: {
      operation: "bulk_send_emails",
      requested: invoiceIds.length,
      sent,
      failed,
      not_found: notFound,
    },
  });

  revalidatePath("/fakture");
  revalidatePath("/dashboard");
  return { success: true, sent, failed };
}

"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { escapeHtml, sanitizeEmailHeader } from "@/lib/html-escape";

interface InvoiceItemInput {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

interface InvoicePayload {
  client_id: string;
  issue_date: string;
  due_date: string;
  tax_rate: number;
  notes: string;
  payment_method: string;
  items: InvoiceItemInput[];
}

export async function createInvoice(data: InvoicePayload) {
  const { supabase, user } = await requireUser();

  const { data: allowed } = await supabase.rpc("fo_can_create_invoice");
  if (allowed === false) {
    return { error: "Mesečni limit faktura je dostignut. Nadogradite plan." };
  }

  const { data: invoiceId, error } = await supabase.rpc("fo_create_invoice", {
    p_data: data as unknown as Record<string, unknown>,
  });

  if (error || !invoiceId) {
    console.error("[invoices.create]", {
      user_id: user.id,
      code: error?.code,
      message: error?.message,
    });
    await logAudit({
      action: "invoice.created",
      success: false,
      metadata: { code: error?.code },
    });
    return { error: friendlyInvoiceError(error?.code) };
  }

  await logAudit({
    action: "invoice.created",
    resourceType: "invoice",
    resourceId: invoiceId,
  });

  revalidatePath("/fakture");
  revalidatePath("/dashboard");
  redirect(`/fakture/${invoiceId}`);
}

export async function updateInvoice(invoiceId: string, data: InvoicePayload) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.rpc("fo_update_invoice", {
    p_invoice_id: invoiceId,
    p_data: data as unknown as Record<string, unknown>,
  });

  if (error) {
    console.error("[invoices.update]", {
      user_id: user.id,
      invoice_id: invoiceId,
      code: error.code,
      message: error.message,
    });
    await logAudit({
      action: "invoice.updated",
      resourceType: "invoice",
      resourceId: invoiceId,
      success: false,
      metadata: { code: error.code },
    });
    return { error: friendlyInvoiceError(error.code) };
  }

  await logAudit({
    action: "invoice.updated",
    resourceType: "invoice",
    resourceId: invoiceId,
  });

  revalidatePath("/fakture");
  revalidatePath("/dashboard");
  redirect(`/fakture/${invoiceId}`);
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const { supabase, user } = await requireUser();

  const allowed = ["draft", "sent", "paid", "overdue", "cancelled"];
  if (!allowed.includes(status)) {
    return { error: "Nevažeći status." };
  }

  const updateData: Record<string, unknown> = { status };
  if (status === "paid") updateData.paid_at = new Date().toISOString();
  if (status === "sent") updateData.sent_at = new Date().toISOString();

  const { error, count } = await supabase
    .from("fo_invoices")
    .update(updateData, { count: "exact" })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error || count === 0) {
    console.error("[invoices.status]", {
      user_id: user.id,
      invoice_id: invoiceId,
      code: error?.code,
      message: error?.message,
    });
    await logAudit({
      action: "invoice.status_changed",
      resourceType: "invoice",
      resourceId: invoiceId,
      success: false,
      metadata: { status, code: error?.code },
    });
    return { error: "Greška pri ažuriranju statusa." };
  }

  await logAudit({
    action: "invoice.status_changed",
    resourceType: "invoice",
    resourceId: invoiceId,
    metadata: { status },
  });

  revalidatePath("/fakture");
  revalidatePath("/dashboard");
  revalidatePath(`/fakture/${invoiceId}`);
  return { success: true };
}

export async function deleteInvoice(invoiceId: string) {
  const { supabase, user } = await requireUser();

  const { error, count } = await supabase
    .from("fo_invoices")
    .delete({ count: "exact" })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error || count === 0) {
    console.error("[invoices.delete]", {
      user_id: user.id,
      invoice_id: invoiceId,
      code: error?.code,
      message: error?.message,
    });
    await logAudit({
      action: "invoice.deleted",
      resourceType: "invoice",
      resourceId: invoiceId,
      success: false,
      metadata: { code: error?.code },
    });
    return { error: "Greška pri brisanju fakture." };
  }

  await logAudit({
    action: "invoice.deleted",
    resourceType: "invoice",
    resourceId: invoiceId,
  });

  revalidatePath("/fakture");
  revalidatePath("/dashboard");
  redirect("/fakture");
}

export async function sendInvoiceEmail(invoiceId: string) {
  const { supabase, user } = await requireUser();

  const rl = await checkRateLimit("email", `user:${user.id}`);
  if (!rl.allowed) {
    return { error: "Previše emailova u kratkom roku. Sačekajte sat vremena." };
  }

  const { data: invoice, error: fetchError } = await supabase
    .from("fo_invoices")
    .select("*, client:fo_clients(*)")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !invoice) {
    console.error("[invoices.sendEmail.fetch]", {
      user_id: user.id,
      invoice_id: invoiceId,
      message: fetchError?.message,
    });
    return { error: "Faktura nije pronađena." };
  }

  if (!invoice.client?.email) {
    return { error: "Klijent nema email adresu." };
  }

  const { data: profile, error: profileError } = await supabase.rpc("fo_get_profile");
  if (profileError) {
    console.error("[invoices.sendEmail.profile]", {
      user_id: user.id,
      message: profileError.message,
    });
  }

  const senderCompany = sanitizeEmailHeader(
    profile?.company_name || "FaktureOnline",
  );
  const recipientName = escapeHtml(
    invoice.client.contact_name || invoice.client.company_name,
  );
  const invoiceNumber = escapeHtml(invoice.invoice_number);
  const issueDate = escapeHtml(invoice.issue_date);
  const dueDate = escapeHtml(invoice.due_date || "—");
  const totalLabel = `${Number(invoice.total).toLocaleString("sr-RS")} ${escapeHtml(invoice.currency)}`;
  const contactLine = escapeHtml(profile?.email || profile?.phone || "");

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
      console.error("[invoices.sendEmail.resend]", { status: res.status });
      await logAudit({
        action: "invoice.email_sent",
        resourceType: "invoice",
        resourceId: invoiceId,
        success: false,
        metadata: { resend_status: res.status },
      });
      return { error: "Greška pri slanju emaila." };
    }
  } catch (err) {
    console.error("[invoices.sendEmail.network]", {
      message: err instanceof Error ? err.message : String(err),
    });
    return { error: "Greška pri slanju emaila." };
  }

  const { error: statusError, count } = await supabase
    .from("fo_invoices")
    .update(
      { status: "sent", sent_at: new Date().toISOString() },
      { count: "exact" },
    )
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (statusError || count === 0) {
    console.error("[invoices.sendEmail.statusUpdate]", {
      user_id: user.id,
      invoice_id: invoiceId,
      message: statusError?.message,
    });
    // Email already went out, status update is best-effort. Still surface error.
    await logAudit({
      action: "invoice.email_sent",
      resourceType: "invoice",
      resourceId: invoiceId,
      success: true,
      metadata: { status_update_failed: true },
    });
    return { success: true, warning: "Email poslat, ali status nije ažuriran." };
  }

  await logAudit({
    action: "invoice.email_sent",
    resourceType: "invoice",
    resourceId: invoiceId,
  });

  revalidatePath("/fakture");
  revalidatePath(`/fakture/${invoiceId}`);
  return { success: true };
}

function friendlyInvoiceError(code: string | undefined): string {
  switch (code) {
    case "42501":
      return "Nemate dozvolu za ovu akciju.";
    case "22023":
      return "Nedostaju obavezni podaci.";
    default:
      return "Greška pri obradi fakture.";
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface InvoiceItemInput {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

export async function createInvoice(data: {
  client_id: string;
  issue_date: string;
  due_date: string;
  tax_rate: number;
  notes: string;
  payment_method: string;
  items: InvoiceItemInput[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invoiceNum } = await supabase.rpc(
    "fo_get_next_invoice_number",
    { p_user_id: user.id }
  );

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const tax_amount = Math.round(subtotal * data.tax_rate) / 100;
  const total = subtotal + tax_amount;

  const { data: invoice, error } = await supabase
    .from("fo_invoices")
    .insert({
      user_id: user.id,
      client_id: data.client_id,
      invoice_number: invoiceNum,
      issue_date: data.issue_date,
      due_date: data.due_date || null,
      tax_rate: data.tax_rate,
      subtotal,
      tax_amount,
      total,
      notes: data.notes,
      payment_method: data.payment_method,
    })
    .select()
    .single();

  if (error || !invoice) {
    return { error: "Greška pri kreiranju fakture." };
  }

  if (data.items.length > 0) {
    const itemsToInsert = data.items.map((item, index) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from("fo_invoice_items")
      .insert(itemsToInsert);

    if (itemsError) {
      return { error: "Faktura kreirana ali stavke nisu sačuvane." };
    }
  }

  revalidatePath("/fakture");
  revalidatePath("/dashboard");
  redirect(`/fakture/${invoice.id}`);
}

export async function updateInvoice(
  invoiceId: string,
  data: {
    client_id: string;
    issue_date: string;
    due_date: string;
    tax_rate: number;
    notes: string;
    payment_method: string;
    items: InvoiceItemInput[];
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const tax_amount = Math.round(subtotal * data.tax_rate) / 100;
  const total = subtotal + tax_amount;

  const { error } = await supabase
    .from("fo_invoices")
    .update({
      client_id: data.client_id,
      issue_date: data.issue_date,
      due_date: data.due_date || null,
      tax_rate: data.tax_rate,
      subtotal,
      tax_amount,
      total,
      notes: data.notes,
      payment_method: data.payment_method,
    })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Greška pri ažuriranju fakture." };
  }

  // Replace items
  await supabase
    .from("fo_invoice_items")
    .delete()
    .eq("invoice_id", invoiceId);

  if (data.items.length > 0) {
    const itemsToInsert = data.items.map((item, index) => ({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
      sort_order: index,
    }));

    await supabase.from("fo_invoice_items").insert(itemsToInsert);
  }

  revalidatePath("/fakture");
  revalidatePath("/dashboard");
  redirect(`/fakture/${invoiceId}`);
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updateData: Record<string, unknown> = { status };
  if (status === "paid") updateData.paid_at = new Date().toISOString();
  if (status === "sent") updateData.sent_at = new Date().toISOString();

  const { error } = await supabase
    .from("fo_invoices")
    .update(updateData)
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Greška pri ažuriranju statusa." };
  }

  revalidatePath("/fakture");
  revalidatePath("/dashboard");
  revalidatePath(`/fakture/${invoiceId}`);
  return { success: true };
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("fo_invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Greška pri brisanju fakture." };
  }

  revalidatePath("/fakture");
  revalidatePath("/dashboard");
  redirect("/fakture");
}

export async function sendInvoiceEmail(invoiceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get invoice with client
  const { data: invoice } = await supabase
    .from("fo_invoices")
    .select("*, client:fo_clients(*)")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (!invoice || !invoice.client?.email) {
    return { error: "Klijent nema email adresu." };
  }

  // Get profile
  const { data: profile } = await supabase
    .from("fo_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const companyName = profile?.company_name || "FaktureOnline";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${companyName} <noreply@resend.dev>`,
        to: [invoice.client.email],
        subject: `Faktura ${invoice.invoice_number} — ${companyName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0D9488;">Faktura ${invoice.invoice_number}</h2>
            <p>Poštovani ${invoice.client.contact_name || invoice.client.company_name},</p>
            <p>U prilogu se nalazi faktura <strong>${invoice.invoice_number}</strong> na iznos od <strong>${Number(invoice.total).toLocaleString("sr-RS")} ${invoice.currency}</strong>.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #f8fafc;">
                <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Broj fakture:</strong></td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${invoice.invoice_number}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Datum izdavanja:</strong></td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${invoice.issue_date}</td>
              </tr>
              <tr style="background: #f8fafc;">
                <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Rok plaćanja:</strong></td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${invoice.due_date || "—"}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Ukupno:</strong></td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #0D9488;">${Number(invoice.total).toLocaleString("sr-RS")} ${invoice.currency}</td>
              </tr>
            </table>
            <p>Za sva pitanja, kontaktirajte nas na ${profile?.email || profile?.phone || ""}.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94A3B8; font-size: 12px;">Poslato putem FaktureOnline</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      return { error: "Greška pri slanju emaila." };
    }
  } catch {
    return { error: "Greška pri slanju emaila." };
  }

  // Update status to sent
  await supabase
    .from("fo_invoices")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  revalidatePath("/fakture");
  revalidatePath(`/fakture/${invoiceId}`);
  return { success: true };
}

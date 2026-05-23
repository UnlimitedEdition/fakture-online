import { requireUser } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { InvoiceForm } from "../../invoice-form";

export default async function IzmeniFakturuPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { supabase, user } = await requireUser();

  const [invoiceRes, itemsRes, clientsRes] = await Promise.all([
    supabase
      .from("fo_invoices")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("fo_invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order"),
    supabase
      .from("fo_clients")
      .select("*")
      .eq("user_id", user.id)
      .order("company_name"),
  ]);

  if (invoiceRes.error || !invoiceRes.data) {
    if (invoiceRes.error?.code !== "PGRST116") {
      console.error("[fakture.izmeni]", {
        user_id: user.id,
        invoice_id: id,
        code: invoiceRes.error?.code,
        message: invoiceRes.error?.message,
      });
    }
    notFound();
  }
  const invoice = invoiceRes.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Izmeni fakturu {invoice.invoice_number}
        </h1>
        <p className="text-slate-500 text-sm mt-1">Izmenite podatke fakture</p>
      </div>
      <InvoiceForm
        clients={clientsRes.data || []}
        invoiceId={id}
        initialData={{
          client_id: invoice.client_id,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date || "",
          tax_rate: Number(invoice.tax_rate),
          notes: invoice.notes || "",
          payment_method: invoice.payment_method || "",
          items: itemsRes.data || [],
        }}
      />
    </div>
  );
}

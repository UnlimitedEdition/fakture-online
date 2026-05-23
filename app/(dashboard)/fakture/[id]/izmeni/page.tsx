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

  if (itemsRes.error || clientsRes.error) {
    console.error("[fakture.izmeni.dependencies]", {
      user_id: user.id,
      invoice_id: id,
      items_code: itemsRes.error?.code,
      clients_code: clientsRes.error?.code,
    });
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          Greška pri učitavanju podataka za izmenu fakture. Pokušajte ponovo.
        </div>
      </div>
    );
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

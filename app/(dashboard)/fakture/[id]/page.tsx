import { requireUser } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getInvoiceStatus } from "@/lib/invoice-status";
import { InvoiceActions } from "./invoice-actions";

export default async function FakturaDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { supabase, user } = await requireUser();

  const [invoiceRes, itemsRes, profileRes] = await Promise.all([
    supabase
      .from("fo_invoices")
      .select("*, client:fo_clients(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("fo_invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order"),
    supabase.rpc("fo_get_profile"),
  ]);

  if (invoiceRes.error || !invoiceRes.data) {
    if (invoiceRes.error?.code !== "PGRST116") {
      console.error("[fakture.detail]", {
        user_id: user.id,
        invoice_id: id,
        code: invoiceRes.error?.code,
        message: invoiceRes.error?.message,
      });
    }
    notFound();
  }
  const invoice = invoiceRes.data;
  const items = itemsRes.data;
  const profile = profileRes.data;

  const s = getInvoiceStatus(invoice.status);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{invoice.invoice_number}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>
              {s.label}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">{invoice.client?.company_name}</p>
        </div>
        <InvoiceActions invoiceId={id} status={invoice.status} hasClientEmail={!!invoice.client?.email} />
      </div>

      {/* Invoice card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-10 print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-6 mb-8 pb-8 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-teal-700">{profile?.company_name || "FaktureOnline"}</h2>
            {profile?.address && <p className="text-sm text-slate-500">{profile.address}</p>}
            {profile?.city && (
              <p className="text-sm text-slate-500">
                {profile.zip_code ? `${profile.zip_code} ` : ""}
                {profile.city}
              </p>
            )}
            {profile?.pib && <p className="text-sm text-slate-500">PIB: {profile.pib}</p>}
            {profile?.maticni_broj && (
              <p className="text-sm text-slate-500">MB: {profile.maticni_broj}</p>
            )}
            {profile?.bank_account && (
              <p className="text-sm text-slate-500">Račun: {profile.bank_account}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-800">FAKTURA</p>
            <p className="text-lg text-teal-600 font-mono mt-1">{invoice.invoice_number}</p>
            <div className="mt-3 space-y-1 text-sm text-slate-500">
              <p>Datum: {invoice.issue_date}</p>
              {invoice.due_date && <p>Rok: {invoice.due_date}</p>}
            </div>
          </div>
        </div>

        {/* Client info */}
        <div className="mb-8">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Klijent</p>
          <p className="font-semibold text-slate-800">{invoice.client?.company_name}</p>
          {invoice.client?.contact_name && (
            <p className="text-sm text-slate-500">{invoice.client.contact_name}</p>
          )}
          {invoice.client?.address && (
            <p className="text-sm text-slate-500">{invoice.client.address}</p>
          )}
          {invoice.client?.city && (
            <p className="text-sm text-slate-500">
              {invoice.client.zip_code ? `${invoice.client.zip_code} ` : ""}
              {invoice.client.city}
            </p>
          )}
          {invoice.client?.pib && (
            <p className="text-sm text-slate-500">PIB: {invoice.client.pib}</p>
          )}
        </div>

        {/* Items table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 pr-4">
                  Opis
                </th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-4">
                  Kol.
                </th>
                <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-4">
                  Jed.
                </th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-4">
                  Cena
                </th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider py-3 pl-4">
                  Ukupno
                </th>
              </tr>
            </thead>
            <tbody>
              {(items || []).map((item) => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="py-3 pr-4 text-sm text-slate-800">{item.description}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 text-right">{Number(item.quantity)}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 text-center">{item.unit}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 text-right">
                    {Number(item.unit_price).toLocaleString("sr-RS")}
                  </td>
                  <td className="py-3 pl-4 text-sm font-medium text-slate-800 text-right">
                    {Number(item.total).toLocaleString("sr-RS")} RSD
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Osnovica:</span>
              <span className="text-slate-800">{Number(invoice.subtotal).toLocaleString("sr-RS")} RSD</span>
            </div>
            {Number(invoice.tax_rate) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">PDV ({Number(invoice.tax_rate)}%):</span>
                <span className="text-slate-800">
                  {Number(invoice.tax_amount).toLocaleString("sr-RS")} RSD
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
              <span className="text-slate-800">Ukupno:</span>
              <span className="text-teal-600">
                {Number(invoice.total).toLocaleString("sr-RS")} {invoice.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Napomena</p>
            <p className="text-sm text-slate-600">{invoice.notes}</p>
          </div>
        )}

        {invoice.payment_method && (
          <div className="mt-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Način plaćanja</p>
            <p className="text-sm text-slate-600">{invoice.payment_method}</p>
          </div>
        )}
      </div>

      {/* Back link */}
      <div>
        <Link href="/fakture" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
          &larr; Nazad na listu faktura
        </Link>
      </div>
    </div>
  );
}

import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { getInvoiceStatus } from "@/lib/invoice-status";

export default async function FakturePage() {
  const { supabase, user } = await requireUser();

  const { data: invoices, error } = await supabase
    .from("fo_invoices")
    .select("*, client:fo_clients(company_name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fakture.list]", {
      user_id: user.id,
      code: error.code,
      message: error.message,
    });
  }

  const list = invoices || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fakture</h1>
          <p className="text-slate-500 text-sm mt-1">
            {list.length} {list.length === 1 ? "faktura" : "faktura ukupno"}
          </p>
        </div>
        <Link
          href="/fakture/nova"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nova faktura
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Nemate još faktura</h3>
          <p className="text-slate-400 text-sm mb-6">Kreirajte prvu fakturu za samo 30 sekundi.</p>
          <Link
            href="/fakture/nova"
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Kreiraj fakturu
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Broj</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Klijent</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Datum</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Iznos</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((inv) => {
                  const s = getInvoiceStatus(inv.status);
                  return (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/fakture/${inv.id}`} className="text-sm font-medium text-teal-600 hover:text-teal-700">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {inv.client?.company_name || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{inv.issue_date}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">
                        {Number(inv.total).toLocaleString("sr-RS")} {inv.currency}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/fakture/${inv.id}`}
                          className="text-sm text-slate-400 hover:text-teal-600 transition-colors"
                        >
                          Pogledaj
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {list.map((inv) => {
              const s = getInvoiceStatus(inv.status);
              return (
                <Link key={inv.id} href={`/fakture/${inv.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-teal-600">{inv.invoice_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">{inv.client?.company_name || "—"}</span>
                    <span className="text-sm font-medium text-slate-800">
                      {Number(inv.total).toLocaleString("sr-RS")} RSD
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

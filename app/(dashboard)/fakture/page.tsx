import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { InvoiceListClient } from "./invoice-list-client";

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
        <InvoiceListClient invoices={list} />
      )}
    </div>
  );
}

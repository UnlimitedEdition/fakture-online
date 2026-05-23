import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { BankActions } from "./bank-actions";

const STATUS_LABEL: Record<string, string> = {
  unmatched: "Neuparen",
  matched: "Upareno",
  manual_match: "Ručno upareno",
  ignored: "Ignorisano",
};

const STATUS_COLOR: Record<string, string> = {
  unmatched: "bg-amber-100 text-amber-700",
  matched: "bg-emerald-100 text-emerald-700",
  manual_match: "bg-teal-100 text-teal-700",
  ignored: "bg-gray-100 text-gray-500",
};

export default async function BankaPage() {
  const { supabase, user } = await requireUser();

  const [importsRes, txnsRes, invoicesRes] = await Promise.all([
    supabase
      .from("fo_bank_imports")
      .select("*")
      .eq("user_id", user.id)
      .order("imported_at", { ascending: false })
      .limit(10),
    supabase
      .from("fo_bank_transactions")
      .select("*, matched_invoice:fo_invoices(invoice_number)")
      .eq("user_id", user.id)
      .order("txn_date", { ascending: false })
      .limit(200),
    supabase
      .from("fo_invoices")
      .select("id, invoice_number, total, currency, status")
      .eq("user_id", user.id)
      .in("status", ["sent", "overdue", "draft"])
      .order("created_at", { ascending: false }),
  ]);

  const imports = importsRes.data ?? [];
  const txns = txnsRes.data ?? [];
  const openInvoices = invoicesRes.data ?? [];
  const unmatched = txns.filter((t) => t.match_status === "unmatched").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Banka — uparivanje uplata</h1>
          <p className="text-slate-500 text-sm mt-1">
            Uvezite izvod iz banke (CSV), sistem automatski upoređuje uplate sa
            otvorenim fakturama po pozivu na broj i iznosu.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-2xl font-bold text-slate-800">{txns.length}</p>
          <p className="text-xs text-slate-500 mt-1">Ukupno transakcija (last 200)</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-2xl font-bold text-amber-800">{unmatched}</p>
          <p className="text-xs text-amber-700 mt-1">Neuparenih</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-2xl font-bold text-emerald-800">
            {txns.filter((t) => t.match_status === "matched" || t.match_status === "manual_match").length}
          </p>
          <p className="text-xs text-emerald-700 mt-1">Upareno</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-2xl font-bold text-slate-800">{openInvoices.length}</p>
          <p className="text-xs text-slate-500 mt-1">Otvorene fakture</p>
        </div>
      </div>

      <BankActions openInvoices={openInvoices} />

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {txns.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Nema importovanih transakcija</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Uvezite izvod iz banke (CSV) — Intesa, NLB, Raiffeisen, OTP, ProCredit, AIK.
              Sistem će automatski upariti uplate sa otvorenim fakturama po pozivu na broj.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <Th>Datum</Th>
                  <Th>Iznos</Th>
                  <Th>Poziv na broj</Th>
                  <Th>Uplatilac</Th>
                  <Th>Status</Th>
                  <Th>Faktura</Th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-sm text-slate-500">{t.txn_date}</td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">
                      {Number(t.amount).toLocaleString("sr-RS")} {t.currency}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 font-mono">
                      {t.reference || "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {t.counterparty_name || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[t.match_status]}`}>
                        {STATUS_LABEL[t.match_status]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {t.matched_invoice?.invoice_number ? (
                        <Link
                          href={`/fakture`}
                          className="text-sm font-medium text-teal-600 hover:text-teal-700 font-mono"
                        >
                          {t.matched_invoice.invoice_number}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {imports.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-3">Skorašnji importi</h2>
          <ul className="space-y-2 text-sm">
            {imports.map((imp) => (
              <li key={imp.id} className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-slate-700">
                  {imp.filename || "(bez imena)"} · {imp.format}
                </span>
                <span className="text-slate-400 text-xs">
                  {imp.total_transactions} txn · {imp.matched_count} uparenih ·{" "}
                  {new Date(imp.imported_at).toLocaleDateString("sr-RS")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
      {children}
    </th>
  );
}

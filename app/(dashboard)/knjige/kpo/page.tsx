import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { KpoYearPicker } from "./year-picker";

type KpoRow = {
  redni_broj: number;
  issue_date: string;
  invoice_number: string;
  client_name: string;
  client_pib: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Nacrt",
  sent: "Poslato",
  paid: "Plaćeno",
  overdue: "Kasni",
  cancelled: "Otkazano",
};

export default async function KpoPage(props: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { year: yearParam } = await props.searchParams;
  const currentYear = new Date().getFullYear();
  const year = Number(yearParam) || currentYear;

  const { data: rows, error } = await supabase.rpc("fo_kpo_book", { p_year: year });
  if (error) {
    console.error("[knjige.kpo]", {
      user_id: user.id,
      code: error.code,
      message: error.message,
    });
  }

  const list = (rows as KpoRow[] | null) ?? [];
  const total = list.reduce((s, r) => s + Number(r.amount), 0);
  const paidTotal = list
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">KPO knjiga {year}</h1>
          <p className="text-slate-500 text-sm mt-1">
            Knjiga o ostvarenom prometu paušalca. Automatski iz vaših faktura.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <KpoYearPicker currentYear={year} />
          <a
            href={`/api/knjige/kpo.csv?year=${year}`}
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Export CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-2xl font-bold text-slate-800">
            {total.toLocaleString("sr-RS")} RSD
          </p>
          <p className="text-xs text-slate-500 mt-1">Ukupan promet {year}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-2xl font-bold text-emerald-700">
            {paidTotal.toLocaleString("sr-RS")} RSD
          </p>
          <p className="text-xs text-slate-500 mt-1">Naplaćeno</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-2xl font-bold text-slate-800">{list.length}</p>
          <p className="text-xs text-slate-500 mt-1">Broj faktura</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {list.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">
            Nema faktura izdatih u {year}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <Th>RB</Th>
                  <Th>Datum</Th>
                  <Th>Broj fakture</Th>
                  <Th>Klijent</Th>
                  <Th>PIB</Th>
                  <Th className="text-right">Iznos</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.redni_broj} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-sm text-slate-500">{row.redni_broj}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{row.issue_date}</td>
                    <td className="px-5 py-3 text-sm font-medium">
                      <Link
                        href={`/fakture`}
                        className="text-teal-600 hover:text-teal-700 font-mono"
                      >
                        {row.invoice_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">{row.client_name || "—"}</td>
                    <td className="px-5 py-3 text-xs text-slate-400 font-mono">{row.client_pib || "—"}</td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-800 text-right">
                      {Number(row.amount).toLocaleString("sr-RS")} {row.currency}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          row.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : row.status === "overdue"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-semibold">
                  <td colSpan={5} className="px-5 py-3 text-right text-slate-600 text-sm">
                    UKUPNO
                  </td>
                  <td className="px-5 py-3 text-right text-slate-900 text-sm">
                    {total.toLocaleString("sr-RS")} RSD
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Po Pravilniku o sadržini KPO knjige (Zakon o PDV, čl. 47), promet se evidentira u trenutku izdavanja fakture, bez obzira na status naplate.
      </p>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3 ${className}`}>
      {children}
    </th>
  );
}

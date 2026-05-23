import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { SEF_STATUS_LABEL, SEF_STATUS_COLOR, type SefStatus } from "@/lib/sef/types";

export default async function SefSentPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { status: statusFilter } = await props.searchParams;

  let query = supabase
    .from("fo_invoices")
    .select("*, client:fo_clients(company_name)")
    .eq("user_id", user.id)
    .not("sef_status", "is", null)
    .order("sef_sent_at", { ascending: false, nullsFirst: false });

  if (statusFilter) {
    query = query.eq("sef_status", statusFilter);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error("[sef.sent]", { code: error.code, message: error.message });
  }
  const list = rows ?? [];

  const statuses: SefStatus[] = [
    "slanje", "poslato", "odobreno", "odbijeno",
    "storniran", "otkazan", "greska",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Poslate SEF fakture</h1>
          <p className="text-slate-500 text-sm mt-1">{list.length} dokumenata</p>
        </div>
        <Link href="/sef" className="text-sm text-teal-600 hover:text-teal-700">
          &larr; Nazad
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/sef/sent"
          className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
            !statusFilter
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-600 border-gray-200 hover:border-slate-300"
          }`}
        >
          Sve ({list.length})
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/sef/sent?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
              statusFilter === s
                ? "bg-slate-800 text-white border-slate-800"
                : `${SEF_STATUS_COLOR[s]} border-transparent`
            }`}
          >
            {SEF_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {list.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">Nema fakture za prikaz.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <Th>Broj</Th>
                  <Th>Klijent</Th>
                  <Th>Datum</Th>
                  <Th>Iznos</Th>
                  <Th>Status</Th>
                  <Th>SEF ID</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((inv) => {
                  const s = inv.sef_status as SefStatus;
                  return (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <Link href={`/fakture/${inv.id}`} className="text-sm font-medium text-teal-600 hover:text-teal-700">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {inv.client?.company_name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">{inv.issue_date}</td>
                      <td className="px-5 py-3 text-sm font-medium text-slate-800">
                        {Number(inv.total).toLocaleString("sr-RS")} {inv.currency}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEF_STATUS_COLOR[s]}`}>
                          {SEF_STATUS_LABEL[s]}
                        </span>
                        {inv.sef_error_message && (
                          <p className="text-xs text-red-500 mt-0.5">{inv.sef_error_message.slice(0, 80)}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400 font-mono">
                        {inv.sef_document_id?.slice(0, 8) ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
      {children}
    </th>
  );
}

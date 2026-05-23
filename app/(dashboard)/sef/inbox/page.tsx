import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";

const ACTION_LABEL: Record<string, string> = {
  pending: "Čeka",
  accepted: "Prihvaćeno",
  rejected: "Odbijeno",
};

const ACTION_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default async function InboxPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { status: filter } = await props.searchParams;

  let query = supabase
    .from("fo_sef_inbox")
    .select("id, invoice_number, supplier_name, supplier_pib, issue_date, total_amount, currency, inbox_action, fetched_at")
    .eq("user_id", user.id)
    .order("fetched_at", { ascending: false });

  if (filter && ["pending", "accepted", "rejected"].includes(filter)) {
    query = query.eq("inbox_action", filter);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error("[sef.inbox]", { code: error.code, message: error.message });
  }
  const list = rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">SEF Inbox</h1>
          <p className="text-slate-500 text-sm mt-1">
            Fakture primljene od dobavljača preko SEF-a.
          </p>
        </div>
        <Link href="/sef" className="text-sm text-teal-600 hover:text-teal-700">
          &larr; Nazad
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["", "pending", "accepted", "rejected"] as const).map((a) => (
          <Link
            key={a || "all"}
            href={a ? `/sef/inbox?status=${a}` : "/sef/inbox"}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
              (filter ?? "") === a
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-gray-200 hover:border-slate-300"
            }`}
          >
            {a ? ACTION_LABEL[a] : "Sve"}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {list.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">Nema primljenih faktura.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <Th>Broj</Th>
                  <Th>Dobavljač</Th>
                  <Th>PIB</Th>
                  <Th>Datum</Th>
                  <Th>Iznos</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/sef/inbox/${row.id}`}
                        className="text-sm font-medium text-teal-600 hover:text-teal-700"
                      >
                        {row.invoice_number ?? "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {row.supplier_name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 font-mono">
                      {row.supplier_pib ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {row.issue_date ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">
                      {row.total_amount != null
                        ? `${Number(row.total_amount).toLocaleString("sr-RS")} ${row.currency}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLOR[row.inbox_action] ?? "bg-gray-100 text-gray-500"}`}
                      >
                        {ACTION_LABEL[row.inbox_action] ?? row.inbox_action}
                      </span>
                    </td>
                  </tr>
                ))}
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

import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { getInvoiceStatus } from "@/lib/invoice-status";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const [invoicesRes, clientsRes, recentRes] = await Promise.all([
    supabase.from("fo_invoices").select("status, total").eq("user_id", user.id),
    supabase
      .from("fo_clients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("fo_invoices")
      .select("*, client:fo_clients(company_name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (invoicesRes.error || clientsRes.error || recentRes.error) {
    console.error("[dashboard.fetch]", {
      user_id: user.id,
      invoices: invoicesRes.error?.code,
      clients: clientsRes.error?.code,
      recent: recentRes.error?.code,
    });
  }

  const invoices = invoicesRes.data || [];
  const totalClients = clientsRes.count || 0;
  const recentInvoices = recentRes.data || [];

  const stats = {
    total: invoices.length,
    revenue: invoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + Number(i.total), 0),
    paid: invoices.filter((i) => i.status === "paid").length,
    pending: invoices.filter((i) => i.status === "sent" || i.status === "draft").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
    clients: totalClients,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pregled</h1>
          <p className="text-slate-500 text-sm mt-1">Dobrodošli nazad</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ukupno faktura" value={stats.total.toString()} icon="doc" />
        <StatCard
          label="Ukupan prihod"
          value={`${stats.revenue.toLocaleString("sr-RS")} RSD`}
          icon="money"
        />
        <StatCard label="Plaćeno" value={stats.paid.toString()} icon="check" color="emerald" />
        <StatCard label="Čeka / Kasni" value={`${stats.pending} / ${stats.overdue}`} icon="clock" color={stats.overdue > 0 ? "red" : "amber"} />
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Poslednje fakture</h2>
            <Link href="/fakture" className="text-sm text-teal-600 hover:text-teal-700">
              Vidi sve
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">
              Nemate još faktura.{" "}
              <Link href="/fakture/nova" className="text-teal-600 hover:underline">
                Kreirajte prvu
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((inv) => {
                const s = getInvoiceStatus(inv.status);
                return (
                  <Link
                    key={inv.id}
                    href={`/fakture/${inv.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {inv.invoice_number}
                      </p>
                      <p className="text-xs text-slate-400">
                        {inv.client?.company_name || "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-800">
                        {Number(inv.total).toLocaleString("sr-RS")} RSD
                      </p>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${s.color}`}>
                        {s.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Brze akcije</h2>
          <div className="space-y-3">
            <Link
              href="/fakture/nova"
              className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 hover:bg-teal-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Nova faktura</p>
                <p className="text-xs text-slate-400">Kreirajte novu fakturu</p>
              </div>
            </Link>
            <Link
              href="/klijenti/novi"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Dodaj klijenta</p>
                <p className="text-xs text-slate-400">Dodajte novog klijenta</p>
              </div>
            </Link>
            <Link
              href="/podesavanja"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Podešavanja</p>
                <p className="text-xs text-slate-400">Podaci o firmi</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color = "teal",
}: {
  label: string;
  value: string;
  icon: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    teal: "bg-teal-50 text-teal-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };

  const iconPaths: Record<string, string> = {
    doc: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
    money:
      "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
    check: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    clock: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[icon]} />
          </svg>
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}

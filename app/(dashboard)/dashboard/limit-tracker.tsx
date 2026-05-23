import { createClient } from "@/lib/supabase/server";

type Stats = {
  year: number;
  ytd_revenue: number;
  current_month_revenue: number;
  avg_monthly_revenue: number;
  months_completed: number;
  limit_rsd: number;
  limit_enabled: boolean;
  predicted_hit_date: string | null;
  percent_used: number;
};

function formatDateSr(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("sr-RS", { day: "numeric", month: "long", year: "numeric" });
}

export async function LimitTracker() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fo_revenue_stats");
  if (error || !data) return null;

  const s = data as Stats;
  if (!s.limit_enabled) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">Paušal limit</p>
          <a
            href="/podesavanja"
            className="text-xs text-teal-600 hover:text-teal-700"
          >
            Uključi praćenje →
          </a>
        </div>
        <p className="text-xs text-slate-400">
          Ako ste paušalac, aktivirajte praćenje limita (6M ili 8M RSD) — sistem
          će vas upozoriti kada se približite ulasku u PDV.
        </p>
      </div>
    );
  }

  const percent = Number(s.percent_used);
  const barColor =
    percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-700">
          Paušal limit {s.year}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          percent >= 90 ? "bg-red-100 text-red-700"
            : percent >= 70 ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700"
        }`}>
          {percent.toFixed(1)}%
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{Number(s.ytd_revenue).toLocaleString("sr-RS")} RSD</span>
          <span>{Number(s.limit_rsd).toLocaleString("sr-RS")} RSD</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-slate-400">Trenutni mesec</p>
          <p className="font-semibold text-slate-700">
            {Number(s.current_month_revenue).toLocaleString("sr-RS")} RSD
          </p>
        </div>
        <div>
          <p className="text-slate-400">Mesečni prosek</p>
          <p className="font-semibold text-slate-700">
            {Number(s.avg_monthly_revenue).toLocaleString("sr-RS")} RSD
          </p>
        </div>
      </div>

      {s.predicted_hit_date && (
        <div className={`mt-4 p-3 rounded-xl text-xs ${
          percent >= 70 ? "bg-amber-50 text-amber-800 border border-amber-100"
            : "bg-stone-50 text-slate-600"
        }`}>
          ⚠️ Po trenutnom tempu, dostižete limit oko{" "}
          <strong>{formatDateSr(s.predicted_hit_date)}</strong>.
          {percent >= 70 && (
            <> Razmislite o prelasku na PDV / ličnu zaradu pre roka.</>
          )}
        </div>
      )}
    </div>
  );
}

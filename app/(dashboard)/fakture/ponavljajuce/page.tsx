import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { ScheduleActions } from "./schedule-actions";

const FREQUENCY_LABEL: Record<string, string> = {
  weekly: "Nedeljno",
  monthly: "Mesečno",
  quarterly: "Kvartalno",
  yearly: "Godišnje",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktivno",
  paused: "Pauzirano",
  ended: "Završeno",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  ended: "bg-gray-100 text-gray-500",
};

export default async function PonavljajucePage() {
  const { supabase, user } = await requireUser();

  const { data: schedules, error } = await supabase
    .from("fo_recurring_schedules")
    .select("*, client:fo_clients(company_name)")
    .eq("user_id", user.id)
    .order("status")
    .order("next_run_date");

  if (error) {
    console.error("[ponavljajuce.list]", { user_id: user.id, code: error.code });
  }

  const list = schedules ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ponavljajuće fakture</h1>
          <p className="text-slate-500 text-sm mt-1">
            Mesečni retaineri, godišnje pretplate — sistem ih automatski izdaje.
          </p>
        </div>
        <Link
          href="/fakture/ponavljajuce/nova"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nova ponavljajuća šema
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Nema ponavljajućih šema</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Ako svakog 1. u mesecu šaljete istom klijentu istu fakturu (retainer, pretplata, mesečno održavanje) — postavite šemu jednom, sistem dalje sve sam.
            </p>
            <Link
              href="/fakture/ponavljajuce/nova"
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl"
            >
              Postavi prvu šemu
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <Th>Naziv</Th>
                  <Th>Klijent</Th>
                  <Th>Frekvencija</Th>
                  <Th>Sledeća</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">{s.name}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{s.client?.company_name ?? "—"}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{FREQUENCY_LABEL[s.frequency]}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{s.next_run_date}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ScheduleActions id={s.id} status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Šeme se proveravaju jednom dnevno u 05:00 UTC. Generisana faktura ide u <Link href="/fakture" className="underline">fakture</Link> u statusu <em>Nacrt</em> — možete je tada poslati klijentu ili na SEF.
      </p>
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

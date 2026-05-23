import { requireUser } from "@/lib/supabase/server";
import Link from "next/link";
import { SEF_STATUS_LABEL, SEF_STATUS_COLOR, type SefStatus } from "@/lib/sef/types";

export default async function SefOverviewPage() {
  const { supabase, user } = await requireUser();

  const [profileRes, sentRes, inboxRes, recentRes] = await Promise.all([
    supabase
      .from("fo_profiles")
      .select("sef_api_key_encrypted, sef_demo_mode")
      .eq("id", user.id)
      .single(),
    supabase
      .from("fo_invoices")
      .select("sef_status")
      .eq("user_id", user.id)
      .not("sef_status", "is", null),
    supabase
      .from("fo_sef_inbox")
      .select("inbox_action", { count: "exact", head: false })
      .eq("user_id", user.id),
    supabase
      .from("fo_invoices")
      .select("id, invoice_number, sef_status, sef_status_updated_at, total, currency")
      .eq("user_id", user.id)
      .not("sef_status", "is", null)
      .order("sef_status_updated_at", { ascending: false, nullsFirst: false })
      .limit(10),
  ]);

  const hasKey = !!profileRes.data?.sef_api_key_encrypted;
  const sent = sentRes.data ?? [];
  const inbox = inboxRes.data ?? [];

  const statusCounts: Record<SefStatus, number> = {
    nacrt: 0, slanje: 0, poslato: 0, odobreno: 0,
    odbijeno: 0, storniran: 0, otkazan: 0, greska: 0,
  };
  for (const inv of sent) {
    const s = inv.sef_status as SefStatus | null;
    if (s && statusCounts[s] !== undefined) statusCounts[s]++;
  }

  const inboxPending = inbox.filter((i) => i.inbox_action === "pending").length;
  const inboxAccepted = inbox.filter((i) => i.inbox_action === "accepted").length;
  const inboxRejected = inbox.filter((i) => i.inbox_action === "rejected").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">E-Fakture (SEF)</h1>
          <p className="text-slate-500 text-sm mt-1">
            Pregled svih SEF transakcija, izdate i primljene fakture.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!hasKey && (
            <Link
              href="/podesavanja/sef"
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
            >
              Podesi SEF
            </Link>
          )}
          {hasKey && (
            <Link
              href="/podesavanja/sef"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Podešavanja
            </Link>
          )}
        </div>
      </div>

      {!hasKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
          SEF nije aktivan — postavite API ključ u podešavanjima da biste mogli da šaljete i primate elektronske fakture.
        </div>
      )}

      {hasKey && profileRes.data?.sef_demo_mode && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
          ⚠️ Aktivan je <strong>demo mod</strong> — fakture se šalju na test okruženje (demoefaktura.mfin.gov.rs).
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Poslate fakture" value={sent.length.toString()} color="teal" />
        <StatCard
          label="Čeka odgovor"
          value={(statusCounts.poslato + statusCounts.slanje).toString()}
          color="amber"
        />
        <StatCard
          label="Odbijeno / Greška"
          value={(statusCounts.odbijeno + statusCounts.greska).toString()}
          color={statusCounts.odbijeno + statusCounts.greska > 0 ? "red" : "slate"}
        />
        <StatCard
          label="Inbox (čeka pregled)"
          value={inboxPending.toString()}
          color={inboxPending > 0 ? "amber" : "slate"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Status izdatih</h2>
          <div className="space-y-2">
            {Object.entries(statusCounts)
              .filter(([, c]) => c > 0)
              .map(([status, count]) => {
                const s = status as SefStatus;
                return (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${SEF_STATUS_COLOR[s]}`}>
                      {SEF_STATUS_LABEL[s]}
                    </span>
                    <span className="font-medium text-slate-700">{count}</span>
                  </div>
                );
              })}
            {sent.length === 0 && (
              <p className="text-sm text-slate-400">Nema poslatih SEF faktura.</p>
            )}
          </div>
          <Link
            href="/sef/sent"
            className="inline-block mt-4 text-sm text-teal-600 hover:text-teal-700"
          >
            Vidi sve izdate &rarr;
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Inbox</h2>
          <div className="space-y-2 text-sm">
            <Row label="Čeka pregled" value={inboxPending} />
            <Row label="Prihvaćeno" value={inboxAccepted} />
            <Row label="Odbijeno" value={inboxRejected} />
          </div>
          <Link
            href="/sef/inbox"
            className="inline-block mt-4 text-sm text-teal-600 hover:text-teal-700"
          >
            Otvori inbox &rarr;
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-slate-800">Poslednje promene statusa</h2>
        </div>
        {(recentRes.data ?? []).length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">Još nema SEF aktivnosti.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {(recentRes.data ?? []).map((inv) => {
              const s = inv.sef_status as SefStatus | null;
              return (
                <Link
                  key={inv.id}
                  href={`/fakture/${inv.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-teal-600">{inv.invoice_number}</p>
                    <p className="text-xs text-slate-400">
                      {inv.sef_status_updated_at
                        ? new Date(inv.sef_status_updated_at).toLocaleString("sr-RS")
                        : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-700">
                      {Number(inv.total).toLocaleString("sr-RS")} {inv.currency}
                    </span>
                    {s && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEF_STATUS_COLOR[s]}`}>
                        {SEF_STATUS_LABEL[s]}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    teal: "border-teal-200 bg-teal-50",
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50",
    slate: "border-gray-100 bg-white",
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color] || colors.slate}`}>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

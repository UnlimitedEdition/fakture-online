import { requireUser } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./change-password-form";
import { DangerZone } from "./danger-zone";

export default async function NalogPage() {
  const { user } = await requireUser();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nalog i bezbednost</h1>
        <p className="text-slate-500 text-sm mt-1">
          Lozinka, podaci, brisanje naloga.
        </p>
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Promena lozinke</h2>
        <p className="text-xs text-slate-500">
          Najmanje 12 karaktera, slova + brojevi + simbol. Posle promene
          ostali uređaji se automatski odjavljuju.
        </p>
        <ChangePasswordForm />
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Eksport podataka (GDPR)</h2>
        <p className="text-xs text-slate-500">
          Preuzmite sve svoje podatke u JSON formatu — profil, klijenti,
          fakture sa stavkama, SEF istorija, audit log. Možete eksportovati
          jednom dnevno.
        </p>
        <a
          href="/api/account/export"
          download
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Preuzmi moje podatke (JSON)
        </a>
      </section>

      <section className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-red-800">Opasna zona</h2>
        <p className="text-xs text-red-700">
          Brisanje naloga je <strong>trajno</strong>. Klijenti i fakture koje
          nisu poslate na SEF biće trajno obrisane. Fakture koje su poslate
          SEF-u moraju se po zakonu čuvati 10 godina pa će biti anonimizovane
          (vaše ime/firma se zamenjuje sa &quot;[redacted]&quot;).
        </p>
        <DangerZone accountEmail={user.email ?? ""} />
      </section>
    </div>
  );
}

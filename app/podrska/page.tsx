import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Podrška — FaktureOnline",
  description: "Kontakt podrške, FAQ i prijava problema.",
};

export default function PodrskaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-amber-50 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-teal-600 hover:text-teal-700 text-sm font-medium">
          ← Početna
        </Link>

        <h1 className="text-3xl font-bold text-slate-800 mt-6">Podrška</h1>
        <p className="text-slate-500 mt-2">
          Naišli ste na problem ili Vam treba pomoć? Tu smo.
        </p>

        <div className="grid gap-4 mt-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-slate-800">Email podrška</h2>
                <p className="text-slate-500 text-sm mb-3">
                  Najbrži način. Odgovaramo u toku radnog dana (pon-pet 9–17h).
                </p>
                <a
                  href="mailto:podrska@faktureonline.rs"
                  className="text-teal-600 hover:text-teal-700 font-medium text-sm"
                >
                  podrska@faktureonline.rs
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-slate-800">Hitno (sistem ne radi)</h2>
                <p className="text-slate-500 text-sm mb-3">
                  Ako je sistem nedostupan ili nemate pristup nalogu, javite na
                  hitnu adresu — gledamo i van radnog vremena.
                </p>
                <a
                  href="mailto:hitno@faktureonline.rs?subject=HITNO%20-%20"
                  className="text-red-600 hover:text-red-700 font-medium text-sm"
                >
                  hitno@faktureonline.rs
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-slate-800 mb-3">Šta da pošaljete?</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2"><span className="text-teal-600">•</span> Kratak opis šta ste pokušavali da uradite</li>
              <li className="flex gap-2"><span className="text-teal-600">•</span> Broj fakture / kupca ako je relevantan</li>
              <li className="flex gap-2"><span className="text-teal-600">•</span> ID greške ako Vam je sistem prikazao</li>
              <li className="flex gap-2"><span className="text-teal-600">•</span> Screenshot (ako možete)</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-slate-800 mb-3">SEF (Sistem Elektronskih Faktura)</h2>
            <p className="text-sm text-slate-600 mb-3">
              Za probleme sa SEF-om (registracija, API ključ, status fakture) prvo proverite{" "}
              <Link href="/podesavanja/sef" className="text-teal-600 hover:text-teal-700 font-medium">
                Podešavanja → SEF
              </Link>
              . Ako greška i dalje postoji, pošaljite nam JBKJS, PIB i tip
              dokumenta — bez API ključa.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center mt-8">
          Status sistema: <Link href="/api/health" className="underline">/api/health</Link>
        </p>
      </div>
    </div>
  );
}

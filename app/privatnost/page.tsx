import Link from "next/link";

export const metadata = {
  title: "Politika privatnosti — FaktureOnline",
  description: "Kako FaktureOnline obrađuje i čuva vaše podatke u skladu sa Zakonom o zaštiti podataka o ličnosti (ZZPL) i GDPR-om.",
};

export default function PrivatnostPage() {
  return (
    <div className="bg-white min-h-screen">
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-teal-600">FaktureOnline</Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-teal-600">Prijavite se</Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-4 py-12 prose prose-slate">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Politika privatnosti</h1>
        <p className="text-slate-400 text-sm mb-8">Poslednja izmena: 23. maj 2026.</p>

        <div className="space-y-6 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Rukovalac podacima</h2>
            <p>
              Rukovalac vaših ličnih podataka je vlasnik servisa FaktureOnline
              (kontakt email u podešavanjima naloga). FaktureOnline je SaaS
              platforma za fakturisanje namenjena freelancerima, paušalcima i
              malim firmama u Srbiji.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Koje podatke obrađujemo</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Podaci o nalogu</strong>: email, ime, lozinka (hash-ovana bcrypt-om)</li>
              <li><strong>Podaci o firmi</strong>: PIB, matični broj, adresa, tekući račun, JBKJS</li>
              <li><strong>Podaci o klijentima</strong>: kontakti vaših kupaca koje vi unosite</li>
              <li><strong>Fakture i stavke</strong>: brojevi, iznosi, opisi</li>
              <li><strong>SEF integracija</strong>: API ključ (AES-GCM enkripcija), evidencija slanja, primljene fakture</li>
              <li><strong>Tehnički podaci</strong>: IP adresa, browser (samo za bezbednosni audit log)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Pravna osnova</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Izvršenje ugovora (čl. 12. st. 1. tač. 2. ZZPL): pružanje servisa</li>
              <li>Zakonska obaveza (čl. 12. st. 1. tač. 3.): SEF (Zakon o elektronskom fakturisanju), čuvanje faktura 10 godina (Zakon o računovodstvu, Zakon o PDV)</li>
              <li>Legitimni interes (čl. 12. st. 1. tač. 6.): bezbednosni audit log, prevencija zloupotrebe</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Kome predajemo podatke</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Supabase</strong> (EU region) — baza i autentifikacija</li>
              <li><strong>Vercel</strong> — hosting aplikacije</li>
              <li><strong>Upstash</strong> — rate limiting</li>
              <li><strong>Resend</strong> — slanje email-ova (transakcioni)</li>
              <li><strong>Ministarstvo finansija RS (SEF)</strong> — za fakture koje šaljete preko sistema elektronskih faktura</li>
              <li><strong>Narodna banka Srbije / banke</strong> — preko poziva na broj na fakturi (ne mi šaljemo)</li>
            </ul>
            <p>Ne prodajemo podatke trećim stranama. Ne koristimo ih za marketing van naših servisa.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Bezbednost</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>TLS 1.2+ za sav saobraćaj, HSTS 2 godine</li>
              <li>SEF API ključevi enkriptovani AES-GCM 256</li>
              <li>Row Level Security (RLS) na nivou baze — svaki korisnik vidi samo svoje podatke</li>
              <li>Audit log svake bitne radnje sa IP adresom i user-agent-om</li>
              <li>Rate limiting na auth flow-u (Upstash Redis)</li>
              <li>Honeypot + 12-karakterska lozinka + bcrypt</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Vaša prava (ZZPL / GDPR)</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Pristup</strong>: vidite sve svoje podatke u dashboard-u</li>
              <li><strong>Ispravka</strong>: izmenite u podešavanjima i kod klijenata</li>
              <li><strong>Brisanje</strong> (čl. 30 ZZPL): zahtev preko podešavanja → trajno brisanje 30 dana po zahtevu, osim faktura koje smo zakonski obavezni da čuvamo 10 godina (te se anonimizuju)</li>
              <li><strong>Prenos podataka</strong> (čl. 36 ZZPL): export JSON-a iz podešavanja</li>
              <li><strong>Prigovor</strong>: pišite na email u podešavanjima</li>
              <li><strong>Pritužba Povereniku</strong>: https://www.poverenik.rs/</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Period čuvanja</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Podaci naloga: dok je nalog aktivan + 30 dana posle deaktivacije</li>
              <li>Fakture: 10 godina (Zakon o računovodstvu)</li>
              <li>SEF arhiva XML: 10 godina (Zakon o elektronskom fakturisanju)</li>
              <li>Audit log: 180 dana (osim admin pristupa: 2 godine)</li>
              <li>Lead signups (landing): 90 dana ako se ne pretvore u nalog</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Cookies</h2>
            <p>
              Koristimo samo nužne cookies za održavanje sesije (Supabase Auth).
              Nemamo tracking, nemamo reklamne cookies, nemamo analytics treće strane.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Izmene politike</h2>
            <p>
              Ažuriramo ovu stranicu po potrebi. Materijalne izmene
              komuniciramo email-om barem 30 dana unapred.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-100">
          <Link href="/" className="text-sm text-teal-600 hover:text-teal-700">
            ← Nazad
          </Link>
        </div>
      </article>
    </div>
  );
}

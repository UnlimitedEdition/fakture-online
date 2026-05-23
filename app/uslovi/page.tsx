import Link from "next/link";

export const metadata = {
  title: "Uslovi korišćenja — FaktureOnline",
  description: "Uslovi korišćenja servisa FaktureOnline.",
};

export default function UsloviPage() {
  return (
    <div className="bg-white min-h-screen">
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-teal-600">FaktureOnline</Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-teal-600">Prijavite se</Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Uslovi korišćenja</h1>
        <p className="text-slate-400 text-sm mb-8">Poslednja izmena: 23. maj 2026.</p>

        <div className="space-y-6 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Šta je FaktureOnline</h2>
            <p>
              FaktureOnline je SaaS platforma za izdavanje, slanje i čuvanje
              faktura, sa integracijom za Sistem elektronskih faktura (SEF)
              Republike Srbije. Korišćenjem servisa prihvatate ove uslove.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Nalog i odgovornost</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Jedan nalog po fizičkom/pravnom licu. Lozinka je vaša odgovornost.</li>
              <li>Odgovorni ste za tačnost podataka koje unosite (PIB, MB, adrese).</li>
              <li>SEF API ključ koji unosite koristimo isključivo za slanje vaših faktura u vaše ime.</li>
              <li>Korisnik je odgovoran za sadržaj faktura i komunikaciju sa klijentima.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Pretplata i naplata</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Free plan: 5 faktura mesečno, bez ugovora.</li>
              <li>Pro plan: pretplata na mesečnom nivou. Otkažete kad god — bez naknade za otkazivanje.</li>
              <li>Vraćanje sredstava: pro-rata za neiskorišćeni deo perioda na osnovu pisanog zahteva.</li>
              <li>Cene su izražene u dinarima sa uračunatim PDV-om.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Šta NE smete</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Da koristite servis za fakturisanje protivzakonitih usluga/proizvoda.</li>
              <li>Da pokušavate da pristupite tuđim podacima ili da zaobiđete sigurnosne mehanizme.</li>
              <li>Da automatizujete masovne zahteve van rate-limit-a (reverse-engineering, scraping).</li>
              <li>Da preprodajete pristup vašem nalogu trećim licima.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Dostupnost i SLA</h2>
            <p>
              Ciljana dostupnost servisa je 99.5% mesečno. Planirane održavanje
              najavljujemo unapred. Nismo odgovorni za prekide kod trećih
              strana (SEF, Supabase, Vercel, banka) ali ćemo dokumentovati svaku
              takvu epizodu na status stranici.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Intelektualna svojina</h2>
            <p>
              Sav kod, dizajn i sadržaj servisa je vlasništvo FaktureOnline-a.
              Vaše fakture, klijenti i podaci ostaju u vašem vlasništvu — mi smo
              samo obrađivač (data processor).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Ograničenje odgovornosti</h2>
            <p>
              Servis se pruža &quot;as is&quot;. Ne preuzimamo odgovornost za posledice
              netačno unetih podataka u fakture, odbijanje SEF-a iz razloga
              koji nisu posledica greške u našem kodu, ili indirektne štete.
              Maksimalna naša odgovornost prema bilo kom korisniku je iznos
              koji je taj korisnik platio u poslednjih 12 meseci.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Raskid</h2>
            <p>
              Možete obrisati nalog bilo kad u podešavanjima. Mi možemo
              raskinuti pružanje servisa uz 30 dana otkaznog roka, ili odmah
              u slučaju kršenja ovih uslova.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Merodavno pravo</h2>
            <p>
              Ovi uslovi se tumače po zakonima Republike Srbije. Nadležan je
              sud u Beogradu, sem ako zakon ne predviđa drugačije.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-100">
          <Link href="/" className="text-sm text-teal-600 hover:text-teal-700">
            ← Nazad
          </Link>
          <span className="mx-3 text-slate-300">·</span>
          <Link href="/privatnost" className="text-sm text-teal-600 hover:text-teal-700">
            Politika privatnosti
          </Link>
        </div>
      </article>
    </div>
  );
}

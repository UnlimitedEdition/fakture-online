const problems = [
  {
    icon: "\u{1F4C4}",
    title: "Pravite fakture u Wordu?",
    desc: "Copy-paste \u0161ablon, menjate podatke ru\u010Dno, gubite 15 minuta po fakturi.",
  },
  {
    icon: "\u{1F937}",
    title: "Ne znate ko je platio?",
    desc: "Email, Viber, poziv \u2014 pitanje \u201Ejesi li platio?\u201C je neprijatno.",
  },
  {
    icon: "\u{1F4C1}",
    title: "Fakture svuda razbacane?",
    desc: "Na desktopu, u mejlu, na telefonu. Kad treba za poresku \u2014 haos.",
  },
];

const features = [
  {
    icon: "\u26A1",
    title: "Faktura za 30 sekundi",
    desc: "Popunite podatke, kliknite dugme \u2014 faktura je gotova.",
  },
  {
    icon: "\u{1F4E7}",
    title: "Po\u0161aljite klijentu jednim klikom",
    desc: "PDF faktura direktno na email klijenta, bez preuzimanja.",
  },
  {
    icon: "\u{1F4B0}",
    title: "Pratite ko je platio",
    desc: "Ozna\u010Dite fakturu kao pla\u0107enu. Uvek znate ko duguje.",
  },
  {
    icon: "\u{1F4CA}",
    title: "Mese\u010Dni pregled prihoda",
    desc: "Vidite koliko ste fakturisali i naplatili ovog meseca.",
  },
  {
    icon: "\u{1F3E2}",
    title: "Vi\u0161e klijenata, jedna baza",
    desc: "Svi klijenti na jednom mestu. Slede\u0107i put \u2014 dva klika.",
  },
  {
    icon: "\u{1F4F1}",
    title: "Radi na telefonu",
    desc: "Bez instalacije. Kreirajte fakturu sa bilo kog ure\u0111aja.",
  },
];

const steps = [
  { num: "1", title: "Registrujte se", desc: "Popunite formu ispod \u2014 traje 30 sekundi." },
  { num: "2", title: "Unesite podatke firme", desc: "Naziv, PIB, \u017Eiro ra\u010Dun \u2014 jednom za svagda." },
  { num: "3", title: "Kreirajte prvu fakturu", desc: "Izaberite klijenta, unesite stavke, po\u0161aljite." },
];

const faqs = [
  {
    q: "Koliko ko\u0161ta?",
    a: "Starter plan je besplatan zauvek (5 faktura/mesec). Pro je 1.500 din/mesec.",
  },
  {
    q: "Da li je pravno validna faktura?",
    a: "Da, sadr\u017Ei sve obavezne elemente po zakonu.",
  },
  {
    q: "Mogu li da dodam logo firme?",
    a: "Da, va\u0161 logo se automatski dodaje na svaku fakturu.",
  },
  {
    q: "Kako klijent dobija fakturu?",
    a: "Po\u0161aljete mu PDF putem emaila direktno iz sistema.",
  },
  {
    q: "Da li radi za pau\u0161alce?",
    a: "Da! Posebno dizajnirano za pau\u0161alce i freelancere.",
  },
];

const planFeatures = [
  "PDF export",
  "Email slanje",
  "Pra\u0107enje naplate",
  "Podr\u0161ka",
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-600 to-violet-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Faktura za 30 sekundi
          </h1>
          <p className="text-lg md:text-xl text-violet-100 max-w-2xl mx-auto mb-10">
            Bez Excela, bez Word \u0161ablona. Profesionalna faktura &rarr; po\u0161aljete
            klijentu &rarr; pratite ko je platio.
          </p>
          <a
            href="#prijava"
            className="inline-block bg-white text-violet-700 font-semibold px-8 py-4 rounded-xl text-lg hover:bg-violet-50 transition-colors shadow-lg"
          >
            Po\u010Dnite besplatno &rarr;
          </a>
          <p className="mt-4 text-violet-200 text-sm">
            5 faktura mese\u010Dno besplatno. Zauvek.
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Poznato vam?</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            Svaki dan isti problemi koji vam oduzimaju vreme i \u017Eivce.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {problems.map((p) => (
              <div key={p.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-4xl mb-4">{p.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{p.title}</h3>
                <p className="text-gray-600">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funkcije */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Sve \u0161to vam treba</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            Jednostavan alat koji zamenjuje Excel, Word i bele\u0161ke na telefonu.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="text-center p-6">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cena */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Jednostavna cena</h2>
          <p className="text-gray-500 text-center mb-12">Bez skrivenih tro\u0161kova. Bez ugovora.</p>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Starter */}
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
              <p className="text-gray-500 mb-2 font-medium">Starter</p>
              <p className="text-5xl font-bold text-gray-900 mb-1">
                0 <span className="text-xl font-normal text-gray-500">din</span>
              </p>
              <p className="text-gray-400 text-sm mb-6">zauvek besplatno</p>
              <p className="text-violet-600 font-semibold mb-6">5 faktura / mesec</p>
              <ul className="text-left space-y-3 mb-8">
                {planFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-gray-700">
                    <span className="text-green-500 font-bold">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#prijava"
                className="block text-center bg-gray-100 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Po\u010Dnite besplatno &rarr;
              </a>
            </div>

            {/* Pro */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-violet-600">
              <p className="text-violet-600 mb-2 font-medium">Pro</p>
              <p className="text-5xl font-bold text-violet-600 mb-1">
                1.500 <span className="text-xl font-normal text-gray-500">din</span>
              </p>
              <p className="text-gray-400 text-sm mb-6">bez ugovora</p>
              <p className="text-violet-600 font-semibold mb-6">Neograni\u010Deno faktura</p>
              <ul className="text-left space-y-3 mb-8">
                {planFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-gray-700">
                    <span className="text-green-500 font-bold">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#prijava"
                className="block text-center bg-violet-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-violet-700 transition-colors"
              >
                Izaberite Pro &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Koraci */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Kako da po\u010Dnete?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-14 h-14 bg-violet-600 text-white text-2xl font-bold rounded-full flex items-center justify-center mx-auto mb-4">
                  {s.num}
                </div>
                <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                <p className="text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">\u010Cesta pitanja</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Forma */}
      <section id="prijava" className="py-16 md:py-20">
        <div className="max-w-lg mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Prijavite se</h2>
          <p className="text-gray-500 text-center mb-8">
            Popunite formu i javi\u0107emo vam se u roku od 24h.
          </p>
          <form action="/api/signup" method="POST" className="space-y-4">
            <input type="hidden" name="niche" value="fakture" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naziv firme / va\u0161e ime *</label>
              <input type="text" name="business_name" required className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="npr. Marko Markovi\u0107 PR" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Va\u0161e ime *</label>
              <input type="text" name="contact_name" required className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="npr. Marko Markovi\u0107" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
              <input type="tel" name="phone" required className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="npr. 065 123 4567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="npr. marko@gmail.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grad</label>
              <input type="text" name="city" className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="npr. Beograd" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poruka (opciono)</label>
              <textarea name="message" rows={3} className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Recite nam ne\u0161to o va\u0161em biznisu..." />
            </div>
            <button type="submit" className="w-full bg-violet-600 text-white font-semibold py-4 rounded-xl hover:bg-violet-700 transition-colors text-lg">
              Po\u0161aljite prijavu &rarr;
            </button>
            <p className="text-center text-gray-400 text-xs">Nema obaveze. Javi\u0107emo vam se u roku od 24h.</p>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="font-semibold text-white text-lg mb-2">FaktureOnline</p>
          <p className="text-sm mb-4">Online fakture za freelancere i pau\u0161alce u Srbiji.</p>
          <p className="text-sm">
            Kontakt:{" "}
            <a href="mailto:REDACTED_EMAIL" className="text-violet-400 hover:underline">
              REDACTED_EMAIL
            </a>
          </p>
          <p className="text-xs mt-6">&copy; 2026 FaktureOnline. Sva prava zadr\u017Eana.</p>
        </div>
      </footer>
    </main>
  );
}

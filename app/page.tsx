"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ── Count-up hook ─────────────────────────────────────── */
function useCountUp(end: number, suffix: string, duration = 1600) {
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            const val = Math.round(ease * end);
            el.textContent = val.toLocaleString("sr") + suffix;
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, suffix, duration]);

  return ref;
}

/* ── Scroll-reveal hook ────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const children = el.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);

  return ref;
}

/* ── SVG Icons (inline, no deps) ───────────────────────── */
const icons = {
  clock: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
    </svg>
  ),
  question: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01" />
    </svg>
  ),
  folder: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  ),
  zap: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  mail: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  chart: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  users: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  repeat: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
    </svg>
  ),
  phone: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  star: (
    <svg className="w-5 h-5 fill-amber-400 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
};

/* ── Page ──────────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const [formState, setFormState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  /* Scroll-reveal refs */
  const problemRef = useReveal();
  const solutionRef = useReveal();
  const howRef = useReveal();
  const featuresRef = useReveal();
  const pricingRef = useReveal();
  const testimonialsRef = useReveal();
  const faqRef = useReveal();

  /* Count-up refs */
  const stat1 = useCountUp(500, "+");
  const stat2 = useCountUp(10000, "+");
  const stat3 = useCountUp(30, "s");
  const stat4 = useCountUp(98, "%");

  /* Form handler */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("loading");
    setErrorMsg("");
    try {
      const form = e.currentTarget;
      const data = new FormData(form);
      const res = await fetch("/api/signup", { method: "POST", body: data });
      if (res.redirected) {
        router.push(res.url);
        return;
      }
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greška pri slanju.");
      }
      router.push("/hvala");
    } catch (err) {
      setFormState("error");
      setErrorMsg(err instanceof Error ? err.message : "Greška pri slanju. Pokušajte ponovo.");
    }
  }

  return (
    <main>
      {/* ─── Navbar ─────────────────────────────────── */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="#" className="text-xl font-bold text-teal-600 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            FaktureOnline
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors"
            >
              Prijavite se
            </a>
            <a
              href="/register"
              className="bg-amber-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
            >
              Probajte besplatno
            </a>
          </div>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────── */}
      <section className="bg-gradient-to-br from-teal-50 via-white to-amber-50/30 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-teal-100 text-teal-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
                5 faktura mesečno besplatno — zauvek
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-slate-800">
                Fakturišite <span className="text-teal-600">brže</span>.{" "}
                <br className="hidden sm:block" />
                Naplatite <span className="text-teal-600">pre</span>.
              </h1>
              <p className="text-lg md:text-xl text-slate-500 mb-8 leading-relaxed">
                Profesionalna faktura za 30 sekundi — pošaljite klijentu,
                pratite naplatu. Bez Excela, bez muke.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="/register"
                  className="inline-block bg-amber-500 text-white font-bold px-8 py-4 rounded-xl text-lg hover:bg-amber-600 transition-colors shadow-lg text-center"
                >
                  Počnite besplatno →
                </a>
                <a
                  href="#kako-radi"
                  className="inline-block text-teal-600 font-semibold px-8 py-4 rounded-xl text-lg hover:bg-teal-50 transition-colors text-center"
                >
                  Pogledajte kako radi ↓
                </a>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Faktura</p>
                    <p className="font-bold text-lg text-slate-800">#2026-0042</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    {icons.check} PLAĆENO
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Klijent:</span>
                    <span className="font-medium text-slate-700">TechStart d.o.o.</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Datum:</span>
                    <span className="text-slate-700">01.04.2026.</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Rok plaćanja:</span>
                    <span className="text-slate-700">15.04.2026.</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 mt-3 pt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Izrada web sajta</span>
                    <span className="text-slate-700">80.000 din</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Održavanje (mesečno)</span>
                    <span className="text-slate-700">15.000 din</span>
                  </div>
                  <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
                    <span className="text-slate-800">UKUPNO:</span>
                    <span className="text-teal-600">95.000 din</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 bg-teal-600 text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-teal-700 transition-colors">
                    Pošalji klijentu
                  </button>
                  <button className="flex-1 bg-gray-100 text-slate-700 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-200 transition-colors">
                    Preuzmi PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social Proof Strip ─────────────────────── */}
      <section className="bg-slate-900 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { ref: stat1, label: "korisnika" },
              { ref: stat2, label: "faktura kreirano" },
              { ref: stat3, label: "za kreiranje" },
              { ref: stat4, label: "zadovoljnih" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl md:text-4xl font-bold text-white">
                  <span ref={s.ref}>0</span>
                </p>
                <p className="text-slate-400 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Problem ────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-4">Prepoznajete li ovo?</h2>
          <p className="text-slate-500 text-center mb-12 max-w-2xl mx-auto">
            Većina freelancera i preduzetnika u Srbiji gubi sate na fakturisanje.
          </p>
          <div ref={problemRef} className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: icons.clock,
                title: "Gubite vreme na Word i Excel",
                desc: "Otvorite šablon, copy-paste, promenite podatke, konvertujte u PDF... 15 minuta po fakturi. Imate ih 10 mesečno — to su 2-3 sata bačenog vremena.",
              },
              {
                icon: icons.question,
                title: "Ne znate ko duguje",
                desc: "Proveravate izvod, tražite uplate, upoređujete sa fakturama. Neko duguje 2 meseca, ali ste zaboravili da ga podsetite.",
              },
              {
                icon: icons.folder,
                title: "Fakture razbacane svuda",
                desc: "Desktop, email, Google Drive... Kad poreska traži pregled za celu godinu — panika. Nema sistema, nema reda.",
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className={`reveal bg-red-50 border border-red-100 rounded-2xl p-8 ${i === 1 ? "delay-100" : i === 2 ? "delay-200" : ""}`}
              >
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-red-900 mb-3">{item.title}</h3>
                <p className="text-red-800/70 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Solution ───────────────────────────────── */}
      <section className="py-16 md:py-24 bg-stone-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-12">Sa FaktureOnline</h2>
          <div ref={solutionRef} className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Faktura za 30 sekundi",
                desc: "Izaberite klijenta, dodajte stavke, kliknite Kreiraj. Sistem generiše profesionalan PDF sa svim obaveznim elementima.",
              },
              {
                title: "Dashboard pokazuje sve",
                desc: "Zeleno = plaćeno, žuto = čeka, crveno = kasni. Jednim pogledom vidite status svake fakture.",
              },
              {
                title: "Sve na jednom mestu",
                desc: "Pretraživo, filtrirano, export za poresku jednim klikom. Nikad više ne tražite fakturu po folderima.",
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className={`reveal bg-emerald-50 border border-emerald-100 rounded-2xl p-8 ${i === 1 ? "delay-100" : i === 2 ? "delay-200" : ""}`}
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                  {icons.check}
                </div>
                <h3 className="text-lg font-bold text-emerald-900 mb-3">{item.title}</h3>
                <p className="text-emerald-800/70 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Kako radi ──────────────────────────────── */}
      <section id="kako-radi" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-4">Kako funkcioniše?</h2>
          <p className="text-slate-500 text-center mb-16 max-w-2xl mx-auto">
            Od prijave do prve fakture — za manje od 5 minuta.
          </p>

          <div ref={howRef} className="space-y-16">
            {/* Korak 1 */}
            <div className="reveal grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 font-bold px-4 py-2 rounded-full text-sm mb-4">
                  <span className="bg-teal-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs">1</span>
                  UNESITE PODATKE FIRME
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Jednom unesite — koristi se na svakoj fakturi</h3>
                <p className="text-slate-500 leading-relaxed mb-4">
                  Prilikom prvog korišćenja unosite podatke vaše firme. Ovi podaci se automatski pojavljuju na svakoj fakturi.
                </p>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start gap-2"><span className="text-teal-600 mt-1">→</span> <strong>Naziv firme</strong> i pravna forma (PR, D.O.O.)</li>
                  <li className="flex items-start gap-2"><span className="text-teal-600 mt-1">→</span> <strong>PIB i matični broj</strong></li>
                  <li className="flex items-start gap-2"><span className="text-teal-600 mt-1">→</span> <strong>Adresa i tekući račun</strong></li>
                  <li className="flex items-start gap-2"><span className="text-teal-600 mt-1">→</span> <strong>Logo firme</strong> (opciono)</li>
                </ul>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="text-xs text-slate-400 ml-2">Podešavanja → Podaci firme</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Naziv</p>
                    <p className="font-semibold text-sm text-slate-700">Milan Tošić PR Programiranje</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">PIB</p>
                      <p className="font-semibold text-sm text-slate-700">112345678</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Matični broj</p>
                      <p className="font-semibold text-sm text-slate-700">66778899</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Tekući račun</p>
                    <p className="font-semibold text-sm text-slate-700">265-1234567890123-45</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center text-xs text-emerald-700 font-medium flex items-center justify-center gap-1">
                    {icons.check} Podaci sačuvani — pojavljuju se na svakoj fakturi
                  </div>
                </div>
              </div>
            </div>

            {/* Korak 2 */}
            <div className="reveal delay-100 grid md:grid-cols-2 gap-10 items-center">
              <div className="order-2 md:order-1 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="text-xs text-slate-400 ml-2">Nova faktura</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <span className="text-sm text-slate-400">Broj fakture:</span>
                    <span className="font-bold text-sm text-teal-600">#2026-0043 (automatski)</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Klijent</p>
                    <p className="font-semibold text-sm text-slate-700">TechStart d.o.o. — PIB: 998877665</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-3 bg-gray-100 p-2 text-xs font-bold text-slate-500">
                      <span>Stavka</span>
                      <span className="text-center">Količina</span>
                      <span className="text-right">Iznos</span>
                    </div>
                    <div className="grid grid-cols-3 p-2 text-sm border-t border-gray-100">
                      <span className="text-slate-600">Izrada web sajta</span>
                      <span className="text-center text-slate-600">1</span>
                      <span className="text-right text-slate-700">80.000</span>
                    </div>
                    <div className="grid grid-cols-3 p-2 text-sm border-t border-gray-100">
                      <span className="text-slate-600">Održavanje</span>
                      <span className="text-center text-slate-600">1</span>
                      <span className="text-right text-slate-700">15.000</span>
                    </div>
                    <div className="grid grid-cols-3 p-2 text-sm border-t-2 border-gray-300 font-bold">
                      <span className="text-slate-800">UKUPNO</span>
                      <span></span>
                      <span className="text-right text-teal-600">95.000 din</span>
                    </div>
                  </div>
                  <button className="w-full bg-amber-500 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-amber-600 transition-colors">
                    Kreiraj fakturu →
                  </button>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 font-bold px-4 py-2 rounded-full text-sm mb-4">
                  <span className="bg-teal-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs">2</span>
                  KREIRAJTE FAKTURU
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Izaberite klijenta, unesite stavke — gotovo</h3>
                <p className="text-slate-500 leading-relaxed mb-4">
                  Klijente čuvate u bazi — jednom unesete, koristite zauvek. Za novu fakturu samo izaberete
                  klijenta, dodate stavke sa cenama i kliknete &quot;Kreiraj&quot;. Sistem automatski:
                </p>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start gap-2"><span className="text-teal-600 mt-1">→</span> <strong>Dodaje redni broj</strong> — automatski, sekvencijalno</li>
                  <li className="flex items-start gap-2"><span className="text-teal-600 mt-1">→</span> <strong>Računa ukupan iznos</strong> — sa ili bez PDV-a</li>
                  <li className="flex items-start gap-2"><span className="text-teal-600 mt-1">→</span> <strong>Generiše PDF</strong> — profesionalan dizajn sa vašim logom</li>
                  <li className="flex items-start gap-2"><span className="text-teal-600 mt-1">→</span> <strong>Postavlja rok plaćanja</strong> — 15 dana podrazumevano</li>
                </ul>
              </div>
            </div>

            {/* Korak 3 */}
            <div className="reveal delay-200 grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 font-bold px-4 py-2 rounded-full text-sm mb-4">
                  <span className="bg-teal-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs">3</span>
                  POŠALJITE I PRATITE
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Pošaljite klijentu i pratite da li je platio</h3>
                <p className="text-slate-500 leading-relaxed mb-4">
                  Jednim klikom pošaljete fakturu klijentu na email — sa profesionalnom porukom i PDF-om u prilogu.
                  Posle toga, dashboard vam pokazuje status svake fakture:
                </p>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-start gap-2"><span className="text-emerald-500 mt-1 font-bold">●</span> <strong>Plaćeno</strong> — klijent je uplatio, označite jednim klikom</li>
                  <li className="flex items-start gap-2"><span className="text-amber-500 mt-1 font-bold">●</span> <strong>Čeka</strong> — faktura je poslata, rok nije istekao</li>
                  <li className="flex items-start gap-2"><span className="text-red-500 mt-1 font-bold">●</span> <strong>Kasni</strong> — rok je prošao, pošaljite podsetnik</li>
                </ul>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="text-xs text-slate-400 ml-2">Dashboard — April 2026</span>
                </div>
                <div className="space-y-3">
                  {[
                    { num: "#0043", client: "TechStart d.o.o.", amount: "95.000", status: "Plaćeno", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                    { num: "#0042", client: "DesignHub", amount: "45.000", status: "Čeka (8 dana)", color: "bg-amber-50 text-amber-700 border-amber-200" },
                    { num: "#0041", client: "MarketPro", amount: "30.000", status: "Kasni 5 dana!", color: "bg-red-50 text-red-700 border-red-200" },
                    { num: "#0040", client: "WebFlow d.o.o.", amount: "120.000", status: "Plaćeno", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                  ].map((f) => (
                    <div key={f.num} className={`rounded-lg p-3 border ${f.color}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-mono">{f.num}</span>
                          <p className="font-semibold text-sm">{f.client}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{f.amount} din</p>
                          <p className="text-xs">{f.status}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-3 flex justify-between text-sm font-bold text-slate-800">
                    <span>Ukupno ovog meseca:</span>
                    <span className="text-teal-600">290.000 din</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ──────────────────────────── */}
      <section className="py-16 md:py-24 bg-stone-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-4">Šta sve dobijate?</h2>
          <p className="text-slate-500 text-center mb-16 max-w-2xl mx-auto">
            Kompletno rešenje za fakturisanje — od kreiranja do naplate.
          </p>
          <div ref={featuresRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: icons.zap, title: "Faktura za 30 sekundi", desc: "Izaberite klijenta, dodajte stavke, PDF se generiše automatski. Brže nego da otvorite Word." },
              { icon: icons.mail, title: "Slanje jednim klikom", desc: "Klijent dobija email sa profesionalnom porukom i PDF fakturom u prilogu." },
              { icon: icons.chart, title: "Praćenje naplate", desc: "Plaćeno, čeka, kasni — sve na jednom dashboard-u. Podsetnik za kašnjenje jednim klikom." },
              { icon: icons.users, title: "Baza klijenata", desc: "Jednom unesite klijenta — koristite ga na svakoj sledećoj fakturi bez ponovnog unosa." },
              { icon: icons.repeat, title: "Šabloni za ponavljajuće", desc: "Mesečna faktura jednim klikom — sa ažuriranim datumom i rednim brojem." },
              { icon: icons.phone, title: "Radi na telefonu", desc: "Napravite i pošaljite fakturu sa telefona — na gradilištu, kod klijenta, bilo gde." },
            ].map((f, i) => (
              <div
                key={f.title}
                className={`reveal bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-teal-200 transition-all duration-300 ${i % 3 === 1 ? "delay-100" : i % 3 === 2 ? "delay-200" : ""}`}
              >
                <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 mb-4">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-3">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Cenovnik ───────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-4">Izaberite plan</h2>
          <p className="text-slate-500 text-center mb-12">Počnite besplatno — nadogradite kad budete spremni.</p>
          <div ref={pricingRef} className="grid md:grid-cols-2 gap-8">
            {/* Starter */}
            <div className="reveal bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <p className="text-teal-600 font-bold text-sm mb-2">STARTER</p>
              <p className="text-4xl font-bold text-slate-800 mb-1">
                0 <span className="text-lg font-normal text-slate-400">din/mesec</span>
              </p>
              <p className="text-slate-400 text-sm mb-6">Zauvek besplatno</p>
              <ul className="space-y-3 mb-8">
                {[
                  "5 faktura mesečno",
                  "PDF generisanje",
                  "Email slanje",
                  "1 korisnik",
                  "Baza klijenata (do 10)",
                  "Osnovni dizajn fakture",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-600 text-sm">
                    <span className="text-emerald-500">{icons.check}</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="/register"
                className="block text-center border-2 border-teal-600 text-teal-600 font-bold px-6 py-3 rounded-xl hover:bg-teal-50 transition-colors"
              >
                Počni besplatno →
              </a>
            </div>

            {/* Pro */}
            <div className="reveal delay-100 bg-white rounded-2xl shadow-xl p-8 border-2 border-teal-500 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-sm font-bold px-4 py-1 rounded-full">
                PREPORUČENO
              </div>
              <p className="text-teal-600 font-bold text-sm mb-2 mt-2">PRO</p>
              <p className="text-4xl font-bold text-slate-800 mb-1">
                1.500 <span className="text-lg font-normal text-slate-400">din/mesec</span>
              </p>
              <p className="text-slate-400 text-sm mb-6">Bez ugovora — otkažite kad hoćete</p>
              <ul className="space-y-3 mb-8">
                {[
                  "Neograničen broj faktura",
                  "PDF sa vašim logom",
                  "Email slanje + podsetnici za kašnjenje",
                  "Neograničen broj klijenata",
                  "Praćenje naplate",
                  "Mesečni pregled prihoda",
                  "Šabloni za ponavljajuće fakture",
                  "Automatsko numerisanje",
                  "Export za poresku",
                  "Podrška putem Viber-a",
                  "Prvih 7 dana besplatno",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-600 text-sm">
                    <span className="text-emerald-500">{icons.check}</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="/register"
                className="block text-center bg-amber-500 text-white font-bold px-6 py-4 rounded-xl hover:bg-amber-600 transition-colors text-lg shadow-md"
              >
                Započni besplatni period →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ───────────────────────────── */}
      <section className="py-16 md:py-24 bg-stone-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-12">Šta kažu naši korisnici</h2>
          <div ref={testimonialsRef} className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "FaktureOnline mi je uštedeo bar 3 sata mesečno. Više ne otvaram Excel za fakture.",
                name: "Marko P.",
                role: "Freelance programer, Beograd",
              },
              {
                quote: "Konačno znam ko mi duguje bez da proveravam izvod. Dashboard je genijalnost.",
                name: "Ana S.",
                role: "Grafički dizajner, Novi Sad",
              },
              {
                quote: "Klijent mi je rekao da mu je ovo najprofesionalnija faktura koju je ikad dobio.",
                name: "Stefan D.",
                role: "PR agencija, Niš",
              },
            ].map((t, i) => (
              <div
                key={t.name}
                className={`reveal bg-white rounded-2xl p-8 shadow-sm border border-gray-100 ${i === 1 ? "delay-100" : i === 2 ? "delay-200" : ""}`}
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s}>{icons.star}</span>
                  ))}
                </div>
                <p className="text-slate-600 italic leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="font-bold text-slate-800">{t.name}</p>
                  <p className="text-slate-400 text-sm">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-4">Česta pitanja</h2>
          <p className="text-slate-500 text-center mb-12">Sve što vas zanima pre nego što počnete.</p>
          <div ref={faqRef} className="space-y-4">
            {[
              {
                q: "Koliko košta?",
                a: "Starter plan je besplatan zauvek — 5 faktura mesečno. Pro plan je 1.500 din/mesec za neograničen broj faktura, bez ugovora.",
              },
              {
                q: "Da li je faktura pravno validna?",
                a: "Da. Sadrži sve obavezne elemente po Zakonu o računovodstvu: redni broj, datum, podatke izdavaoca i primaoca, opis usluge, iznos i rok plaćanja.",
              },
              {
                q: "Mogu li da dodam logo firme?",
                a: "Da! Vaš logo se automatski dodaje na svaku fakturu. Izgleda profesionalno i prepoznatljivo.",
              },
              {
                q: "Kako klijent dobija fakturu?",
                a: "Kliknete 'Pošalji' — klijent dobija email sa PDF-om u prilogu. Možete i da preuzmete PDF i pošaljete sami.",
              },
              {
                q: "Da li radi za paušalce?",
                a: "Da! Posebno dizajnirano za paušalce i freelancere. Faktura sadrži sve što vam treba — bez PDV-a za paušalce koji nisu u PDV sistemu.",
              },
              {
                q: "Mogu li da imam ponavljajuću fakturu?",
                a: "Da, u Pro planu. Sačuvajte fakturu kao šablon i svaki mesec je kreirate jednim klikom — sa ažuriranim datumom i rednim brojem.",
              },
              {
                q: "Šta ako mi treba više od 5 faktura mesečno?",
                a: "Nadogradite na Pro plan za 1.500 din/mesec — neograničen broj faktura, praćenje naplate, šabloni i sve ostale funkcije.",
              },
              {
                q: "Da li mogu da exportujem podatke?",
                a: "Da! Export svih faktura u CSV ili PDF format — idealno za knjigovođu ili poresku evidenciju. Jednim klikom za celu godinu.",
              },
            ].map((faq, i) => (
              <details
                key={faq.q}
                className={`reveal bg-white rounded-xl shadow-sm border border-gray-100 group ${i % 2 === 1 ? "delay-100" : ""}`}
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer font-semibold text-lg text-slate-800 hover:text-teal-600 transition-colors">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform duration-200 text-xl ml-4 shrink-0">▼</span>
                </summary>
                <p className="px-6 pb-6 text-slate-500 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────── */}
      <section className="bg-gradient-to-r from-teal-600 to-teal-700 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Spremni da olakšate fakturisanje?</h2>
          <p className="text-teal-100 text-lg mb-8">
            Profesionalna faktura za 30 sekundi — 5 mesečno besplatno, zauvek. Počnite danas.
          </p>
          <a
            href="/register"
            className="inline-block bg-amber-500 text-white font-bold px-8 py-4 rounded-xl text-lg hover:bg-amber-600 transition-colors shadow-lg"
          >
            Prijavite se sada →
          </a>
        </div>
      </section>

      {/* ─── Forma ──────────────────────────────────── */}
      <section id="prijava" className="py-16 md:py-24">
        <div className="max-w-lg mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-4">Prijavite se — besplatno</h2>
          <p className="text-slate-500 text-center mb-8">
            Počnite sa Starter planom (besplatno) ili isprobajte Pro 7 dana bez obaveze.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <input type="hidden" name="niche" value="fakture" />
            <div>
              <label htmlFor="business_name" className="block text-sm font-semibold text-slate-700 mb-1.5">Naziv firme / vaše ime *</label>
              <input
                type="text"
                id="business_name"
                name="business_name"
                required
                autoComplete="organization"
                className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800 placeholder:text-slate-400"
                placeholder="npr. Milan Tošić PR"
              />
            </div>
            <div>
              <label htmlFor="contact_name" className="block text-sm font-semibold text-slate-700 mb-1.5">Vaše ime i prezime *</label>
              <input
                type="text"
                id="contact_name"
                name="contact_name"
                required
                autoComplete="name"
                className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800 placeholder:text-slate-400"
                placeholder="npr. Milan Tošić"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1.5">Telefon *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                autoComplete="tel"
                className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800 placeholder:text-slate-400"
                placeholder="npr. 065 123 4567"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800 placeholder:text-slate-400"
                placeholder="npr. milan@gmail.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-semibold text-slate-700 mb-1.5">Grad</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  autoComplete="address-level2"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800 placeholder:text-slate-400"
                  placeholder="npr. Beograd"
                />
              </div>
              <div>
                <label htmlFor="business_type" className="block text-sm font-semibold text-slate-700 mb-1.5">Tip</label>
                <select
                  id="business_type"
                  name="business_type"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-800"
                >
                  <option value="">Izaberite...</option>
                  <option value="freelancer">Freelancer</option>
                  <option value="pausalac">Paušalac (PR)</option>
                  <option value="doo">D.O.O.</option>
                  <option value="zanatstvo">Zanatlija</option>
                  <option value="drugo">Drugo</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-1.5">Koliko faktura izdajete mesečno? (opciono)</label>
              <input
                type="text"
                id="message"
                name="message"
                className="w-full border border-gray-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800 placeholder:text-slate-400"
                placeholder="npr. 5-10 mesečno"
              />
            </div>
            {formState === "error" && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {errorMsg}
              </div>
            )}
            <button
              type="submit"
              disabled={formState === "loading"}
              className="w-full bg-amber-500 text-white font-bold py-4 rounded-xl hover:bg-amber-600 transition-colors text-lg shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {formState === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Slanje...
                </span>
              ) : (
                "Pošaljite prijavu →"
              )}
            </button>
            <p className="text-center text-slate-400 text-xs">
              Starter: 5 faktura besplatno zauvek. Pro: 7 dana besplatno, bez kartice.
            </p>
          </form>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <p className="font-bold text-white text-lg mb-3">FaktureOnline</p>
              <p className="text-sm leading-relaxed">
                Online fakture za freelancere, paušalce i male firme u Srbiji.
                Profesionalno, brzo, pristupačno.
              </p>
            </div>
            <div>
              <p className="font-bold text-white mb-3">Kontakt</p>
              <p className="text-sm">mtosic0450@gmail.com</p>
              <p className="text-sm mt-1">Viber podrška dostupna</p>
            </div>
            <div>
              <p className="font-bold text-white mb-3">Linkovi</p>
              <a href="#kako-radi" className="text-sm hover:text-white transition-colors block mb-1">Kako radi</a>
              <a href="/register" className="text-sm hover:text-white transition-colors block mb-1">Prijavite se</a>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <p className="text-slate-500">&copy; 2026 <span className="text-white font-bold">FaktureOnline</span></p>
            <a
              href="https://toske-programer.web.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-500 hover:text-teal-400 transition-all group"
            >
              <span className="font-semibold">Development:</span>
              <span className="font-mono font-bold text-teal-400 group-hover:text-teal-300 transition-colors">&lt;Toške/&gt;</span>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

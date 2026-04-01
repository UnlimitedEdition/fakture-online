# FaktureOnline — Redesign Spec

**Datum:** 2026-04-01
**Status:** Approved
**Cilj:** World-class landing page za FaktureOnline — invoice SaaS za srpsko trziste

\---

## 1\. Brend i boje

|Element|Vrednost|Namena|
|-|-|-|
|Primary|`#0D9488` (teal-600)|Navbar, headings, linkovi, borderi|
|Primary dark|`#0F766E` (teal-700)|Hover states|
|Primary light|`#CCFBF1` (teal-50)|Section backgrounds, badges|
|Accent/CTA|`#F59E0B` (amber-500)|CTA dugmad, highlights, ikone|
|Accent dark|`#D97706` (amber-600)|CTA hover|
|Accent light|`#FEF3C7` (amber-50)|Accent backgrounds|
|Background|`#FAFAF9` (stone-50)|Page background|
|Card bg|`#FFFFFF`|Kartice, forme|
|Text primary|`#1E293B` (slate-800)|Headings, body|
|Text secondary|`#64748B` (slate-500)|Opisi, labels|
|Text muted|`#94A3B8` (slate-400)|Placeholders, hints|
|Success|`#10B981` (emerald-500)|Placeno status, checkmarks|
|Warning|`#F59E0B` (amber-500)|Ceka status|
|Danger|`#EF4444` (red-500)|Kasni status, errors|
|Footer bg|`#0F172A` (slate-900)|Footer|

**Font:** Geist Sans (vec u projektu) — sans-serif, moderan, citljiv.

\---

## 2\. Struktura stranice

```
1.  Navbar              — sticky, logo + CTA
2.  Hero                — headline + mockup + social proof strip
3.  Social proof strip  — 4 animated broja
4.  Problem             — 3 bol tacke (crvene kartice)
5.  Solution            — 3 resenja (zelene kartice, mirror problema)
6.  Kako radi           — 3 koraka sa mockup-ovima
7.  Features grid       — 6 karata (2x3)
8.  Cenovnik            — 2 plana (Starter free + Pro 1.500 din)
9.  Testimonials        — 3 citata sa imenom/firmom
10. FAQ                 — 8 pitanja, accordion
11. Final CTA           — teal gradient + amber dugme
12. Forma               — poboljsana sa validacijom i loading state
13. Footer              — kontakt + linkovi + <Toske/> brending
```

\---

## 3\. Sekcija: Navbar

* Sticky `top-0 z-50`, beli bg sa `border-b border-gray-100`
* Levo: logo `FaktureOnline` (teal boja, bez emoji-ja — cist text sa ikonicom fakture u SVG ili unicode)
* Desno: CTA dugme `Probajte besplatno` u amber boji (`bg-amber-500 hover:bg-amber-600 text-white`)
* Na mobile: isti layout, manji font

\---

## 4\. Sekcija: Hero

**Layout:** 2 kolone na desktop (text levo, mockup desno), stack na mobile

**Headline:**

```
Fakturisite brze.
Naplatite pre.
```

* `text-5xl md:text-6xl font-bold` u slate-800
* "brze" i "pre" vizuelno istaknut (teal underline ili accent)

**Sub-headline:**

```
Profesionalna faktura za 30 sekundi — posaljite klijentu,
pratite naplatu. Bez Excela, bez muke.
```

* `text-lg text-slate-500`

**CTA:**

* Primarni: `Pocnite besplatno →` — amber dugme, veliko (`px-8 py-4 text-lg rounded-xl shadow-lg`)
* Sekundarni: `Pogledajte kako radi ↓` — text link u teal boji

**Desna strana (mockup):**

* Faktura preview kartica (slicna sadasnjoj ali poboljsana)
* Bela kartica sa `shadow-2xl rounded-2xl`
* Header: broj fakture + status badge (PLACENO u zelenoj)
* Body: klijent, datum, stavke, ukupno
* Footer: 2 dugmeta (Posalji klijentu, Preuzmi PDF)
* Cela kartica ima subtle `rotate-1` ili `hover:rotate-0 transition` za dinamiku

**Background:** Svetli gradient `bg-gradient-to-br from-teal-50 via-white to-amber-50/30`

\---

## 5\. Sekcija: Social proof strip

Odmah ispod hero-a, teal-900 ili slate-900 background:

```
500+          10.000+          30s             98%
korisnika     faktura          za kreiranje    zadovoljnih
```

* Brojevi se animiraju (count-up) kad udju u viewport
* Implementacija: CSS `@property` counter ili lightweight JS (IntersectionObserver + requestAnimationFrame)
* Brojevi su placeholder — Milan ce azurirati kad bude imao realne podatke
* `text-3xl font-bold text-white` za brojeve, `text-sm text-slate-400` za labele

\---

## 6\. Sekcija: Problem

**Headline:** `Prepoznajete li ovo?`
**Sub:** `Vecina freelancera i preduzetnika u Srbiji gubi sate na fakturisanje.`

3 kartice u redu (stack na mobile):

|#|Ikonica|Naslov|Opis|
|-|-|-|-|
|1|(clock/timer)|Gubite vreme na Word i Excel|Otvorite sablon, copy-paste, promenite podatke, konvertujte u PDF... 15 minuta po fakturi.|
|2|(question)|Ne znate ko duguje|Proveravate izvod, trazite uplate, zaboravite da podsetite klijenta.|
|3|(folder)|Fakture razbacane svuda|Desktop, email, Drive... Kad poreska trazi pregled — panika.|

* Kartice: `bg-red-50 border border-red-100 rounded-2xl p-8`
* Bez emoji-ja za ikone — koristiti Unicode simbole ili SVG inline ikone (cleaner look)
* Svaka kartica ima `animate-fadeInUp` sa stagger delay

\---

## 7\. Sekcija: Solution

**Headline:** `Sa FaktureOnline`

3 kartice koje direktno odgovaraju na 3 problema iznad:

|#|Naslov|Opis|
|-|-|-|
|1|Faktura za 30 sekundi|Izaberite klijenta, dodajte stavke, kliknite Kreiraj. PDF gotov.|
|2|Dashboard pokazuje sve|Zeleno = placeno, zuto = ceka, crveno = kasni. Jedan pogled.|
|3|Sve na jednom mestu|Pretrazivo, filtrirano, export za poresku jednim klikom.|

* Kartice: `bg-emerald-50 border border-emerald-100 rounded-2xl p-8`
* Svaka kartica ima check ikonu u emerald boji

\---

## 8\. Sekcija: Kako radi

**Headline:** `Kako funkcionise?`
**Sub:** `Od prijave do prve fakture — za manje od 5 minuta.`

3 koraka sa naizmenicnim layout-om (text levo/mockup desno, pa obrnuto):

### Korak 1: Unesite podatke firme

* Text: Jednom unesite naziv, PIB, maticni, tekuci racun. Pojavljuje se na svakoj fakturi.
* Mockup: "Podesavanja" kartica sa popunjenim poljima (slicno sadasnjem)

### Korak 2: Kreirajte fakturu

* Text: Izaberite klijenta, dodajte stavke, kliknite Kreiraj. Automatski: redni broj, datum, PDF.
* Mockup: "Nova faktura" forma sa stavkama i ukupnim iznosom

### Korak 3: Posaljite i pratite

* Text: Jednim klikom posaljite na email. Dashboard prikazuje status svake fakture.
* Mockup: Dashboard lista sa zeleno/zuto/crveno statusima
* Korak badge: `bg-teal-100 text-teal-700` pill sa brojem u `bg-teal-600 text-white` krugu
* Mockup kartice: beli bg, `shadow-lg rounded-2xl border border-gray-100`
* Browser chrome dots na vrhu mockup-a (crvena/zuta/zelena tackice)

\---

## 9\. Sekcija: Features grid

**Headline:** `Sta sve dobijate?`
**Sub:** `Kompletno resenje za fakturisanje — od kreiranja do naplate.`

6 kartica u 3x2 gridu:

|Ikonica|Naslov|Opis|
|-|-|-|
|(zap)|Faktura za 30 sekundi|Izaberite klijenta, dodajte stavke, PDF se generise automatski.|
|(mail)|Slanje jednim klikom|Klijent dobija email sa PDF-om u prilogu.|
|(chart)|Pracenje naplate|Placeno, ceka, kasni — sve na jednom dashboard-u.|
|(users)|Baza klijenata|Jednom unesite, koristite zauvek.|
|(repeat)|Sabloni za ponavljajuce|Mesecna faktura jednim klikom.|
|(phone)|Radi na telefonu|Napravite fakturu sa telefona — bilo gde.|

* Kartice: `bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-teal-200 transition-all`
* Ikona: inline SVG ili Unicode u teal boji, `text-2xl`
* Na hover: border prelazi u teal — suptilna interakcija

\---

## 10\. Sekcija: Cenovnik

**Headline:** `Izaberite plan`
**Sub:** `Pocnite besplatno — nadogradite kad budete spremni.`

2 plana side-by-side:

### Starter (besplatan)

* Cena: `0 din/mesec` — "Zauvek besplatno"
* Features: 5 faktura mesecno, PDF, email slanje, 1 korisnik, baza (10 klijenata), osnovni dizajn
* CTA: `Pocni besplatno →` — outline dugme (teal border)

### Pro (preporucen)

* Badge: `PREPORUCENO` — amber pill na vrhu
* Cena: `1.500 din/mesec` — "Bez ugovora, otkazite kad hocete"
* Features: Neograniceno faktura, logo na fakturi, podsetnici za kasnjenje, neograniceno klijenata, pracenje naplate, mesecni pregled, sabloni, auto-numerisanje, export za poresku, Viber podrska, 7 dana besplatno
* CTA: `Zapocni besplatni period →` — amber dugme (popunjeno, veliko)
* Kartica ima `border-2 border-teal-500 shadow-xl` — vizuelno istaknut

\---

## 11\. Sekcija: Testimonials (NOVA)

**Headline:** `Sta kazu nasi korisnici`

3 kartice sa citatima:

```
Placeholder citati (Milan zamenjuje pravim kad skupi feedback):

1. "FaktureOnline mi je ustedeo bar 3 sata mesecno. 
    Vise ne otvaram Excel za fakture."
    — Marko P., freelance programer, Beograd

2. "Konacno znam ko mi duguje bez da proveravam izvod. 
    Dashboard je genijalnost."
    — Ana S., graficki dizajner, Novi Sad

3. "Klijent mi je rekao da mu je ovo najprofesionalnija 
    faktura koju je ikad dobio."
    — Stefan D., PR agencija, Nis
```

* Kartice: `bg-white rounded-2xl p-8 shadow-sm border border-gray-100`
* Citat u italic, ime/firma u bold ispod
* 5 zvezdica (amber) iznad citata
* Grid: `md:grid-cols-3`

\---

## 12\. Sekcija: FAQ

**Headline:** `Cesta pitanja`

8 pitanja u accordion-u (HTML `<details>/<summary>`):

1. Koliko kosta?
2. Da li je faktura pravno validna?
3. Mogu li da dodam logo firme?
4. Kako klijent dobija fakturu?
5. Da li radi za pausalce?
6. Mogu li da imam ponavljajucu fakturu?
7. Sta ako mi treba vise od 5 faktura mesecno?
8. Da li mogu da exportujem podatke?

Isti sadrzaj kao sadasnji — tekst je dobar.

* Kartice: `bg-white rounded-xl shadow-sm border border-gray-100`
* Chevron rotira na otvaranje (`group-open:rotate-180`)
* Hover na summary: `text-teal-600`

\---

## 13\. Sekcija: Final CTA

* Background: `bg-gradient-to-r from-teal-600 to-teal-700` + white text
* Headline: `Spremni da olaksate fakturisanje?`
* Sub: `Profesionalna faktura za 30 sekundi — 5 mesecno besplatno, zauvek.`
* CTA: `Prijavite se sada →` — amber dugme na tamnom bg-u (visok kontrast)

\---

## 14\. Sekcija: Forma

**Headline:** `Prijavite se — besplatno`
**Sub:** `Pocnite sa Starter planom ili isprobajte Pro 7 dana bez obaveze.`

Polja:

1. `business\\\_name` — Naziv firme / vase ime \* (autocomplete: organization)
2. `contact\\\_name` — Vase ime i prezime \* (autocomplete: name)
3. `phone` — Telefon \* (autocomplete: tel)
4. `email` — Email (autocomplete: email)
5. `city` + `business\\\_type` — 2 kolone (autocomplete: address-level2)
6. `message` — Koliko faktura izdajete mesecno?
7. Hidden: `niche=fakture`

**Poboljsanja:**

* Client-side validation pre submit-a (required polja)
* Submit dugme: `Posaljite prijavu →` u amber boji
* Loading state: dugme se disabluje, tekst se menja u "Slanje..." sa spinner-om
* Error state: crveni text ispod forme ako nesto ne radi
* Success: redirect na /hvala (vec postoji)
* Sva polja imaju `htmlFor/id` parove i `aria-label`

\---

## 15\. Sekcija: Footer

* `bg-slate-900 text-slate-400`
* 3 kolone: brend opis | kontakt (email, viber) | linkovi (kako radi, prijava)
* Bottom bar: copyright + `<Toske/>` developer credit
* Isti sadrzaj, osvezene boje (teal umesto violet)

\---

## 16\. Sekcija: Hvala stranica (/hvala)

* Osveziti boje na teal
* Checkmark u teal boji umesto generickog
* Dugme "Nazad" u teal boji

\---

## 17\. Animacije (CSS only, zero dependencies)

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

* Kartice: `fadeInUp` sa stagger delay (0ms, 100ms, 200ms)
* Trigger: `IntersectionObserver` dodaje `.animate` klasu kad element udje u viewport
* Brojevi u social proof strip-u: count-up animacija (JS, \~15 linija)
* Hover efekti: `transition-all duration-300` na karticama
* FAQ chevron: `transition-transform duration-200`
* Nema external animation biblioteka

\---

## 18\. SEO i Meta

```tsx
export const metadata: Metadata = {
  title: "FaktureOnline — Online fakture za freelancere i pausalce",
  description: "Kreirajte profesionalnu fakturu za 30 sekundi. Posaljite klijentu, pratite naplatu. Bez Excela. Besplatno za 5 faktura mesecno.",
  keywords: "fakture online, fakturisanje, invoice, freelancer, pausalac, Srbija",
  openGraph: {
    title: "FaktureOnline — Profesionalna faktura za 30 sekundi",
    description: "Bez Excela, bez muke. Kreirajte, posaljite, naplatite.",
    type: "website",
    locale: "sr\\\_RS",
  },
};
```

\---

## 19\. API route fix (route.ts)

1. Dodati `business\\\_type` u data objekat i Supabase INSERT
2. Prebaciti hardcoded email u `process.env.NOTIFICATION\\\_EMAIL || "REDACTED_EMAIL"`
3. Logovanje gresaka (console.error umesto silent fail)

\---

## 20\. Accessibility checklist

* \[x] Svako input polje ima `<label>` sa `htmlFor`
* \[x] Svako polje ima `autocomplete` atribut
* \[x] Kontrast: svi text/bg parovi WCAG AA (4.5:1 minimum)
* \[x] Focus ring: `focus:ring-2 focus:ring-teal-500`
* \[x] Semantic HTML: section, nav, main, footer, h1-h3, details/summary
* \[x] Dugmad: dovoljno velika touch target (min 44x44px)
* \[x] Responsive: testiran na 320px+

\---

## 21\. Fajlovi koji se menjaju

|Fajl|Akcija|
|-|-|
|`app/page.tsx`|Potpuno prepisati — nova struktura, boje, sadrzaj, animacije|
|`app/globals.css`|Nova tema (teal/amber), animacije, utility klase|
|`app/layout.tsx`|Azurirati metadata (SEO, OG)|
|`app/hvala/page.tsx`|Azurirati boje na teal|
|`app/api/signup/route.ts`|Fix: business\_type, email env var, error logging|

**Nijedan novi fajl se ne kreira.** Sve ostaje u istih 5 fajlova.


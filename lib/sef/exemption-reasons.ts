// PDV exemption reason codes from Pravilnik o e-fakturisanju.
// Format: PDV-RS-<article>-<paragraph>-<point>
// Source: https://www.efaktura.gov.rs/view_file.php?file_id=678&cache=sr

export interface ExemptionReason {
  code: string;
  label: string;
  category: "Z" | "E" | "R" | "AE" | "O" | "OE" | "K" | "N" | "SS";
  legalReference: string; // human-readable
}

export const EXEMPTION_REASONS: ExemptionReason[] = [
  // Z — Oslobođeno sa pravom odbitka (Zakon o PDV član 24)
  { code: "PDV-RS-24-1-2", label: "Izvoz dobara", category: "Z", legalReference: "Član 24. stav 1. tačka 2)" },
  { code: "PDV-RS-24-1-3", label: "Unos u slobodnu zonu", category: "Z", legalReference: "Član 24. stav 1. tačka 3)" },
  { code: "PDV-RS-24-1-5", label: "Usluge prevoza dobara pri izvozu", category: "Z", legalReference: "Član 24. stav 1. tačka 5)" },
  { code: "PDV-RS-24-1-6", label: "Promet diplomatskim predstavništvima", category: "Z", legalReference: "Član 24. stav 1. tačka 6)" },
  { code: "PDV-RS-24-1-7", label: "Promet međunarodnim organizacijama", category: "Z", legalReference: "Član 24. stav 1. tačka 7)" },
  { code: "PDV-RS-24-1-7a", label: "Promet EU stranama", category: "Z", legalReference: "Član 24. stav 1. tačka 7a)" },
  { code: "PDV-RS-24-1-12", label: "Promet zlata NBS", category: "Z", legalReference: "Član 24. stav 1. tačka 12)" },
  { code: "PDV-RS-24-1-16a", label: "Sekundarne sirovine", category: "Z", legalReference: "Član 24. stav 1. tačka 16a)" },
  { code: "PDV-RS-24-1-16d", label: "Promet stranim diplomatama", category: "Z", legalReference: "Član 24. stav 1. tačka 16d)" },
  { code: "PDV-RS-24-1-17", label: "Investicioni izvoz", category: "Z", legalReference: "Član 24. stav 1. tačka 17)" },

  // E — Oslobođeno bez prava odbitka (Zakon o PDV član 25)
  { code: "PDV-RS-25-1-1", label: "Promet preduzeća", category: "E", legalReference: "Član 25. stav 1. tačka 1)" },
  { code: "PDV-RS-25-1-2", label: "Promet dela imovine", category: "E", legalReference: "Član 25. stav 1. tačka 2)" },
  { code: "PDV-RS-25-1-3", label: "Promet u stečaju", category: "E", legalReference: "Član 25. stav 1. tačka 3)" },
  { code: "PDV-RS-25-2-1", label: "Bankarske i finansijske usluge", category: "E", legalReference: "Član 25. stav 2. tačka 1)" },
  { code: "PDV-RS-25-2-2", label: "Osiguranje i reosiguranje", category: "E", legalReference: "Član 25. stav 2. tačka 2)" },
  { code: "PDV-RS-25-2-3a", label: "Promet i zakup zemljišta", category: "E", legalReference: "Član 25. stav 2. tačka 3a)" },
  { code: "PDV-RS-25-2-3b", label: "Promet objekata i zakup stanova", category: "E", legalReference: "Član 25. stav 2. tačka 3b)" },
  { code: "PDV-RS-25-2-4", label: "Promet zlata NBS-u", category: "E", legalReference: "Član 25. stav 2. tačka 4)" },
  { code: "PDV-RS-25-2-5", label: "Promet poštanskih usluga", category: "E", legalReference: "Član 25. stav 2. tačka 5)" },
  { code: "PDV-RS-25-2-6", label: "Promet zdravstvenih usluga", category: "E", legalReference: "Član 25. stav 2. tačka 6)" },
  { code: "PDV-RS-25-2-7", label: "Promet obrazovnih usluga", category: "E", legalReference: "Član 25. stav 2. tačka 7)" },
  { code: "PDV-RS-25-2-8", label: "Promet socijalnih usluga", category: "E", legalReference: "Član 25. stav 2. tačka 8)" },
  { code: "PDV-RS-25-2-9", label: "Promet kulturnih usluga", category: "E", legalReference: "Član 25. stav 2. tačka 9)" },
  { code: "PDV-RS-25-2-10", label: "Promet religijskih usluga", category: "E", legalReference: "Član 25. stav 2. tačka 10)" },
  { code: "PDV-RS-25-2-11", label: "Promet RTV usluga", category: "E", legalReference: "Član 25. stav 2. tačka 11)" },
  { code: "PDV-RS-25-2-12", label: "Promet usluga priređivanja igara", category: "E", legalReference: "Član 25. stav 2. tačka 12)" },
  { code: "PDV-RS-25-2-13", label: "Promet od strane neoporezivih lica", category: "E", legalReference: "Član 25. stav 2. tačka 13)" },

  // AE — Reverse charge (Zakon o PDV član 10)
  { code: "PDV-RS-10-2-1", label: "Promet sekundarnih sirovina", category: "AE", legalReference: "Član 10. stav 2. tačka 1)" },
  { code: "PDV-RS-10-2-2", label: "Promet građevinskih objekata", category: "AE", legalReference: "Član 10. stav 2. tačka 2)" },
  { code: "PDV-RS-10-2-3", label: "Promet u oblasti građevinarstva", category: "AE", legalReference: "Član 10. stav 2. tačka 3)" },
  { code: "PDV-RS-10-2-4", label: "Promet električne energije i gasa", category: "AE", legalReference: "Član 10. stav 2. tačka 4)" },
  { code: "PDV-RS-10-2-5", label: "Otpremanje hipoteke", category: "AE", legalReference: "Član 10. stav 2. tačka 5)" },
  { code: "PDV-RS-10-1-3", label: "Promet stranog lica", category: "AE", legalReference: "Član 10. stav 1. tačka 3)" },

  // R — Nije predmet oporezivanja
  { code: "PDV-RS-6-1-1", label: "Naknada štete", category: "R", legalReference: "Član 6. stav 1. tačka 1)" },
  { code: "PDV-RS-6-1-2", label: "Promet bez naknade", category: "R", legalReference: "Član 6. stav 1. tačka 2)" },
  { code: "PDV-RS-6-1-3", label: "Promet ostalo", category: "R", legalReference: "Član 6. stav 1. tačka 3)" },
  { code: "PDV-RS-6a-1-1", label: "Razmena dobara", category: "R", legalReference: "Član 6a stav 1. tačka 1)" },

  // K — EU intra-community
  { code: "PDV-RS-EU-K", label: "Intra-EU isporuka oslobođena PDV-a", category: "K", legalReference: "EU intra-community supply" },

  // O / OE — Van delokruga
  { code: "PDV-RS-O", label: "Promet van delokruga primene zakona", category: "O", legalReference: "Van delokruga" },
  { code: "PDV-RS-OE", label: "Strana isporuka van delokruga", category: "OE", legalReference: "Van delokruga (strano)" },

  // N — Anulirano
  { code: "PDV-RS-N", label: "Anulirana stavka", category: "N", legalReference: "Anulirano" },

  // SS — Posebne šeme
  { code: "PDV-RS-36b", label: "Posebna šema turističke agencije", category: "SS", legalReference: "Član 36b" },
  { code: "PDV-RS-36", label: "Posebna šema polovnih dobara", category: "SS", legalReference: "Član 36" },
];

export const EXEMPTION_REASONS_BY_CATEGORY: Record<string, ExemptionReason[]> = (() => {
  const grouped: Record<string, ExemptionReason[]> = {};
  for (const r of EXEMPTION_REASONS) {
    (grouped[r.category] ??= []).push(r);
  }
  return grouped;
})();

export function findExemptionReason(code: string): ExemptionReason | null {
  return EXEMPTION_REASONS.find((r) => r.code === code) ?? null;
}

export function isValidExemptionCode(code: string): boolean {
  return EXEMPTION_REASONS.some((r) => r.code === code);
}

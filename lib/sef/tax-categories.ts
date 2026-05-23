import type { TaxCategoryCode } from "./types";

export interface TaxCategoryMeta {
  code: TaxCategoryCode;
  label: string;
  description: string;
  defaultPercent: number;
  requiresExemptionReason: boolean;
  allowedPercents: number[];
}

export const TAX_CATEGORIES: Record<TaxCategoryCode, TaxCategoryMeta> = {
  S: {
    code: "S",
    label: "Standardna stopa",
    description: "Oporezivo PDV-om (20% ili 10%)",
    defaultPercent: 20,
    requiresExemptionReason: false,
    allowedPercents: [10, 20],
  },
  AE: {
    code: "AE",
    label: "Obrnuto zaduženje (opšte)",
    description: "Reverse charge — primalac obračunava PDV",
    defaultPercent: 0,
    requiresExemptionReason: true,
    allowedPercents: [0],
  },
  AE10: {
    code: "AE10",
    label: "Obrnuto zaduženje 10%",
    description: "Reverse charge sa preferencijalnom stopom",
    defaultPercent: 10,
    requiresExemptionReason: true,
    allowedPercents: [10],
  },
  AE20: {
    code: "AE20",
    label: "Obrnuto zaduženje 20%",
    description: "Reverse charge sa standardnom stopom",
    defaultPercent: 20,
    requiresExemptionReason: true,
    allowedPercents: [20],
  },
  O: {
    code: "O",
    label: "Van delokruga PDV-a",
    description: "Promet izvan delokruga primene Zakona o PDV",
    defaultPercent: 0,
    requiresExemptionReason: true,
    allowedPercents: [0],
  },
  OE: {
    code: "OE",
    label: "Van delokruga (strana isporuka)",
    description: "Strana isporuka van delokruga RS PDV-a",
    defaultPercent: 0,
    requiresExemptionReason: true,
    allowedPercents: [0],
  },
  E: {
    code: "E",
    label: "Oslobođeno bez prava odbitka",
    description: "PDV oslobođen, nema prava na odbitak prethodnog PDV-a",
    defaultPercent: 0,
    requiresExemptionReason: true,
    allowedPercents: [0],
  },
  R: {
    code: "R",
    label: "Nije predmet oporezivanja",
    description: "Avans i drugi promet koji nije predmet oporezivanja",
    defaultPercent: 0,
    requiresExemptionReason: true,
    allowedPercents: [0],
  },
  Z: {
    code: "Z",
    label: "Oslobođeno sa pravom odbitka",
    description: "Izvoz i druge isporuke sa pravom odbitka prethodnog PDV-a",
    defaultPercent: 0,
    requiresExemptionReason: true,
    allowedPercents: [0],
  },
  K: {
    code: "K",
    label: "EU intra-community isporuka",
    description: "Isporuka unutar EU oslobođena PDV-a",
    defaultPercent: 0,
    requiresExemptionReason: true,
    allowedPercents: [0],
  },
  N: {
    code: "N",
    label: "Anulirano",
    description: "Stavka anulirana / nije predmet",
    defaultPercent: 0,
    requiresExemptionReason: true,
    allowedPercents: [0],
  },
  SS: {
    code: "SS",
    label: "Posebna PDV šema",
    description: "Posebna šema oporezivanja",
    defaultPercent: 0,
    requiresExemptionReason: true,
    allowedPercents: [0],
  },
};

export const TAX_CATEGORY_CODES: TaxCategoryCode[] = Object.keys(
  TAX_CATEGORIES,
) as TaxCategoryCode[];

export function getTaxCategory(code: TaxCategoryCode): TaxCategoryMeta {
  return TAX_CATEGORIES[code];
}

export function isPercentValidForCategory(
  code: TaxCategoryCode,
  percent: number,
): boolean {
  return TAX_CATEGORIES[code].allowedPercents.includes(percent);
}

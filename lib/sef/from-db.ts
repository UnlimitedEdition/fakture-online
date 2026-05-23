// Build SefInvoiceInput from DB rows (fo_profiles + fo_clients + fo_invoices + fo_invoice_items).
// Centralised here so server actions, the cron, and any test fixtures share a single mapping.

import type { SefInvoiceInput, SefSupplier, SefCustomer, SefInvoiceLine, SefDocType, TaxCategoryCode } from "./types";
import { round2 } from "./rounding";

interface DbProfile {
  pib: string;
  maticni_broj: string;
  company_name: string;
  owner_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip_code: string;
  bank_account: string;
  jbkjs: string | null;
  is_budget_user: boolean;
}

interface DbClient {
  pib: string;
  maticni_broj: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip_code: string;
  jbkjs: string | null;
  is_budget_user: boolean;
  is_foreign: boolean;
  country_code: string;
}

interface DbInvoice {
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  notes: string;
  payment_method: string;
  sef_billing_reference_id: string | null;
  sef_prepayment_amount: number | string | null;
  tax_rate: number | string;
}

interface DbInvoiceItem {
  description: string;
  quantity: number | string;
  unit: string;
  unit_price: number | string;
  total: number | string;
  sort_order: number;
}

interface DbBillingReference {
  invoice_number: string;
  issue_date: string;
}

const SR_UNIT_MAP: Record<string, string> = {
  // map user-typed Serbian units to UN/ECE codes
  kom: "H87",
  "kom.": "H87",
  komad: "H87",
  h: "HUR",
  sat: "HUR",
  "sati": "HUR",
  d: "DAY",
  dan: "DAY",
  mesec: "MON",
  godina: "ANN",
  kg: "KGM",
  g: "GRM",
  t: "TNE",
  m: "MTR",
  m2: "MTK",
  "m²": "MTK",
  m3: "MTQ",
  "m³": "MTQ",
  l: "LTR",
  ml: "MLT",
  km: "KMT",
  kwh: "KWH",
};

export function normaliseUnitCode(input: string | null | undefined): string {
  if (!input) return "H87";
  const key = input.trim().toLowerCase();
  return SR_UNIT_MAP[key] ?? input.toUpperCase().slice(0, 3);
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function buildSefSupplier(profile: DbProfile): SefSupplier {
  return {
    pib: profile.pib,
    maticniBroj: profile.maticni_broj,
    registrationName: profile.company_name || profile.owner_name,
    streetName: profile.address,
    cityName: profile.city,
    postalZone: profile.zip_code,
    countryCode: "RS",
    email: profile.email || undefined,
    phone: profile.phone || undefined,
    bankAccount: profile.bank_account,
    jbkjs: profile.jbkjs ?? undefined,
    isBudgetUser: profile.is_budget_user,
  };
}

export function buildSefCustomer(client: DbClient): SefCustomer {
  return {
    pib: client.pib || undefined,
    maticniBroj: client.maticni_broj || undefined,
    registrationName: client.company_name,
    streetName: client.address || undefined,
    cityName: client.city || undefined,
    postalZone: client.zip_code || undefined,
    countryCode: client.country_code || "RS",
    email: client.email || undefined,
    phone: client.phone || undefined,
    jbkjs: client.jbkjs ?? undefined,
    isBudgetUser: client.is_budget_user,
    isForeign: client.is_foreign,
  };
}

// Pick the appropriate tax category for an item given the invoice tax_rate
// and customer flags. Default: S@20, S@10, or Z if foreign export.
export function inferTaxCategory(args: {
  taxPercent: number;
  isForeignCustomer: boolean;
}): { category: TaxCategoryCode; exemptionReasonCode?: string; exemptionReasonText?: string } {
  if (args.isForeignCustomer && args.taxPercent === 0) {
    return {
      category: "Z",
      exemptionReasonCode: "PDV-RS-24-1-2",
      exemptionReasonText: "Izvoz dobara — član 24. stav 1. tačka 2)",
    };
  }
  if (args.taxPercent > 0) return { category: "S" };
  // Local 0% — default to R (not subject) unless caller specifies otherwise
  return {
    category: "R",
    exemptionReasonCode: "PDV-RS-6-1-1",
    exemptionReasonText: "Nije predmet oporezivanja",
  };
}

export function buildSefLines(
  items: DbInvoiceItem[],
  args: { taxPercent: number; isForeignCustomer: boolean },
): SefInvoiceLine[] {
  const cat = inferTaxCategory(args);
  return items
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, idx) => {
      const quantity = num(item.quantity);
      const unitPrice = num(item.unit_price);
      const total = round2(quantity * unitPrice);
      return {
        id: String(idx + 1),
        description: item.description,
        name: item.description?.slice(0, 80),
        quantity,
        unitCode: normaliseUnitCode(item.unit),
        unitPrice,
        lineExtensionAmount: total,
        taxCategory: cat.category,
        taxPercent: args.taxPercent,
        exemptionReasonCode: cat.exemptionReasonCode,
        exemptionReasonText: cat.exemptionReasonText,
      };
    });
}

// Top-level mapper.
export function buildSefInvoiceInput(args: {
  documentType: SefDocType;
  profile: DbProfile;
  client: DbClient;
  invoice: DbInvoice;
  items: DbInvoiceItem[];
  billingReference?: DbBillingReference | null;
}): SefInvoiceInput {
  const taxPercent = num(args.invoice.tax_rate);
  const lines = buildSefLines(args.items, {
    taxPercent,
    isForeignCustomer: args.client.is_foreign,
  });

  return {
    documentType: args.documentType,
    invoiceNumber: args.invoice.invoice_number,
    issueDate: args.invoice.issue_date,
    dueDate: args.invoice.due_date ?? undefined,
    currencyCode: args.invoice.currency || "RSD",
    note: args.invoice.notes || undefined,
    deliveryDate: args.invoice.issue_date,
    paymentMeansCode: "30",
    paymentReference: undefined,
    supplier: buildSefSupplier(args.profile),
    customer: buildSefCustomer(args.client),
    lines,
    billingReference: args.billingReference
      ? {
          invoiceNumber: args.billingReference.invoice_number,
          issueDate: args.billingReference.issue_date,
        }
      : undefined,
  };
}

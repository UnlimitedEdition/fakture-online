// Type definitions for SEF integration.
// Mirrors DB enums in migrations/0005_sef_schema.sql.

export type SefStatus =
  | "nacrt"
  | "slanje"
  | "poslato"
  | "odobreno"
  | "odbijeno"
  | "storniran"
  | "otkazan"
  | "greska";

export type SefDocType =
  | "invoice"      // 380
  | "credit_note"  // 381
  | "debit_note"   // 383
  | "corrective"   // 384
  | "advance";     // 386

export type SefInboxAction = "pending" | "accepted" | "rejected";

export type SefApiCallKind =
  | "send_invoice"
  | "cancel"
  | "storno"
  | "get_status"
  | "get_xml"
  | "list_changes"
  | "check_company"
  | "list_companies"
  | "inbox_list"
  | "inbox_get"
  | "inbox_action"
  | "subscribe";

export const DOC_TYPE_CODE: Record<SefDocType, string> = {
  invoice: "380",
  credit_note: "381",
  debit_note: "383",
  corrective: "384",
  advance: "386",
};

export const SEF_STATUS_LABEL: Record<SefStatus, string> = {
  nacrt: "Nacrt",
  slanje: "Slanje u toku",
  poslato: "Poslato (čeka odgovor)",
  odobreno: "Odobreno",
  odbijeno: "Odbijeno",
  storniran: "Storniran",
  otkazan: "Otkazan",
  greska: "Greška",
};

export const SEF_STATUS_COLOR: Record<SefStatus, string> = {
  nacrt: "bg-slate-100 text-slate-600",
  slanje: "bg-blue-100 text-blue-700",
  poslato: "bg-amber-100 text-amber-700",
  odobreno: "bg-emerald-100 text-emerald-700",
  odbijeno: "bg-red-100 text-red-700",
  storniran: "bg-gray-100 text-gray-500",
  otkazan: "bg-gray-100 text-gray-500",
  greska: "bg-red-100 text-red-700",
};

// SEF API portal status strings (raw, as returned by /sales-invoice JSON).
// Normalised to our local SefStatus enum via mapSefRemoteStatus().
export const SEF_REMOTE_STATUS_MAP: Record<string, SefStatus> = {
  Nacrt: "nacrt",
  Slanje: "slanje",
  Poslato: "poslato",
  Odobreno: "odobreno",
  Prihvaceno: "odobreno",
  "Prihvaćeno": "odobreno",
  Odbijeno: "odbijeno",
  Storniran: "storniran",
  Otkazan: "otkazan",
  Greska: "greska",
  "Greška": "greska",
};

export function mapSefRemoteStatus(remote: string | null | undefined): SefStatus | null {
  if (!remote) return null;
  return SEF_REMOTE_STATUS_MAP[remote.trim()] ?? null;
}

// Common SEF API response shape (loose — fields differ per endpoint).
export interface SefApiResponse<T = unknown> {
  ok: boolean;
  httpStatus: number;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
  durationMs: number;
  raw?: string;
}

// Resolved credentials for a user (after decrypting from fo_profiles).
export interface SefCredentials {
  apiKey: string;
  isDemo: boolean;
  baseUrl: string;
}

// Builder input — what app passes to UBL builders.
export interface SefSupplier {
  pib: string;                 // 9-digit
  maticniBroj: string;         // 8-digit
  registrationName: string;    // legal name
  tradingName?: string;        // marketing name
  streetName: string;
  cityName: string;
  postalZone: string;
  countryCode: string;         // ISO 3166-1 alpha-2, "RS"
  email?: string;
  phone?: string;
  bankAccount: string;         // "160-0000000000000-78" format
  jbkjs?: string;              // if budget user
  isBudgetUser?: boolean;
}

export interface SefCustomer {
  pib?: string;                // optional for foreign clients
  maticniBroj?: string;
  registrationName: string;
  streetName?: string;
  cityName?: string;
  postalZone?: string;
  countryCode: string;
  email?: string;
  phone?: string;
  jbkjs?: string;
  isBudgetUser?: boolean;
  isForeign?: boolean;
}

export interface SefInvoiceLine {
  id: string;                  // line number "1", "2", ...
  description: string;
  name?: string;                // short item name
  sellerItemId?: string;        // SKU
  quantity: number;
  unitCode: string;             // UN/ECE Rec 20: "H87" (piece), "HUR" (hour), "KGM" (kg), ...
  unitPrice: number;            // per-unit (excl tax)
  lineExtensionAmount: number;  // = quantity * unitPrice - allowances (excl tax)
  taxCategory: TaxCategoryCode; // S, AE, E, R, Z, K, ...
  taxPercent: number;           // 20, 10, 0
  exemptionReasonCode?: string; // PDV-RS-N-N-N
  exemptionReasonText?: string;
  allowance?: {
    chargeIndicator: boolean;   // false = allowance (discount), true = charge
    amount: number;
    reason?: string;
  };
}

export interface SefInvoiceInput {
  documentType: SefDocType;
  invoiceNumber: string;        // already year-suffixed, e.g. "FAK-2026-000123"
  issueDate: string;            // YYYY-MM-DD — must be today on send
  dueDate?: string;             // YYYY-MM-DD
  currencyCode: string;         // "RSD" / "EUR"
  exchangeRate?: number;        // for non-RSD invoices: 1 EUR = X RSD
  note?: string;                // free text footer
  buyerReference?: string;
  orderReferenceId?: string;
  contractReferenceId?: string;
  deliveryDate?: string;        // YYYY-MM-DD (cac:Delivery/cbc:ActualDeliveryDate)
  paymentMeansCode?: string;    // default "30" (credit transfer)
  paymentReference?: string;    // poziv-na-broj
  supplier: SefSupplier;
  customer: SefCustomer;
  lines: SefInvoiceLine[];
  // Storno / credit / final-invoice referencing
  billingReference?: {
    invoiceNumber: string;
    issueDate: string;
  };
  // For final invoice consuming an advance
  prepayment?: {
    amount: number;             // gross prepaid amount
    advanceInvoiceNumber: string;
    advanceIssueDate: string;
    advanceTaxableAmount: number;
    advanceTaxAmount: number;
    advanceTaxRate: number;
    advanceTaxCategory: TaxCategoryCode;
  };
  payableRoundingAmount?: number;
}

export type TaxCategoryCode =
  | "S"     // standard rated (20% or 10%)
  | "AE"    // reverse charge (general 0%)
  | "AE10"  // reverse charge 10%
  | "AE20"  // reverse charge 20%
  | "O"     // out of scope (RS VAT)
  | "OE"    // out of scope, foreign supply
  | "E"     // exempt without right to deduct
  | "R"     // not a taxable supply (advance / non-taxable)
  | "Z"     // zero-rated with right to deduct (export)
  | "K"     // intra-community supply
  | "N"     // not subject / annulled
  | "SS";   // special VAT scheme

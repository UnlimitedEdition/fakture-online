// Parse an incoming UBL (sent by a supplier through SEF) into a flat
// summary suitable for fo_sef_inbox + preview UI. We do NOT round-trip
// the full UBL — only extract the user-facing fields.

import { XMLParser } from "fast-xml-parser";

export interface ParsedInboxInvoice {
  rootKind: "Invoice" | "CreditNote";
  invoiceNumber: string | null;
  documentTypeCode: string | null;     // 380, 381, 383, 386, ...
  issueDate: string | null;
  dueDate: string | null;
  currencyCode: string | null;
  supplierName: string | null;
  supplierPib: string | null;
  customerName: string | null;
  customerPib: string | null;
  totalAmount: number | null;          // PayableAmount
  taxAmount: number | null;
  netAmount: number | null;            // TaxExclusive
  note: string | null;
  billingReferenceId: string | null;
  lineCount: number;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,                // collapse cbc:/cac: prefixes — we work by local name
  parseTagValue: false,                // keep amounts as strings; we coerce later
  trimValues: true,
});

function pickFirst(node: unknown, ...keys: string[]): unknown {
  if (node === null || node === undefined || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  return null;
}

function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // fast-xml-parser may return objects with "#text" for elements that have attrs
  if (typeof v === "object" && v !== null) {
    const obj = v as Record<string, unknown>;
    if ("#text" in obj) return String(obj["#text"]);
  }
  return null;
}

function asNumber(v: unknown): number | null {
  const s = asString(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === null || v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

export function parseInboxInvoice(xml: string): ParsedInboxInvoice {
  const doc = parser.parse(xml);
  const root = doc?.Invoice ? "Invoice" : doc?.CreditNote ? "CreditNote" : null;
  if (!root) {
    throw new Error("Parsed XML is neither Invoice nor CreditNote");
  }
  const body = (doc as Record<string, Record<string, unknown>>)[root];

  const supplierParty = pickFirst(body.AccountingSupplierParty, "Party");
  const customerParty = pickFirst(body.AccountingCustomerParty, "Party");

  const supplierLegal = supplierParty
    ? pickFirst(supplierParty, "PartyLegalEntity")
    : null;
  const customerLegal = customerParty
    ? pickFirst(customerParty, "PartyLegalEntity")
    : null;

  const supplierTax = supplierParty
    ? pickFirst(supplierParty, "PartyTaxScheme")
    : null;
  const customerTax = customerParty
    ? pickFirst(customerParty, "PartyTaxScheme")
    : null;

  const total = (body as Record<string, unknown>).LegalMonetaryTotal as
    | Record<string, unknown>
    | undefined;
  const taxTotal = (body as Record<string, unknown>).TaxTotal as
    | Record<string, unknown>
    | undefined;

  const billingRef = pickFirst(body.BillingReference, "InvoiceDocumentReference");

  const lines =
    root === "Invoice"
      ? asArray((body as Record<string, unknown>).InvoiceLine)
      : asArray((body as Record<string, unknown>).CreditNoteLine);

  const supplierPibRaw =
    asString(pickFirst(supplierTax, "CompanyID")) ??
    asString(pickFirst(supplierParty, "EndpointID"));
  const customerPibRaw =
    asString(pickFirst(customerTax, "CompanyID")) ??
    asString(pickFirst(customerParty, "EndpointID"));

  return {
    rootKind: root,
    invoiceNumber: asString(body.ID),
    documentTypeCode: asString(body.InvoiceTypeCode ?? body.CreditNoteTypeCode),
    issueDate: asString(body.IssueDate),
    dueDate: asString(body.DueDate),
    currencyCode: asString(body.DocumentCurrencyCode),
    supplierName: asString(pickFirst(supplierLegal, "RegistrationName")),
    supplierPib: supplierPibRaw?.replace(/^RS/, "") ?? null,
    customerName: asString(pickFirst(customerLegal, "RegistrationName")),
    customerPib: customerPibRaw?.replace(/^RS/, "") ?? null,
    totalAmount: asNumber(total?.PayableAmount),
    taxAmount: asNumber(taxTotal?.TaxAmount),
    netAmount: asNumber(total?.TaxExclusiveAmount),
    note: asString(body.Note),
    billingReferenceId: asString(pickFirst(billingRef, "ID")),
    lineCount: lines.length,
  };
}

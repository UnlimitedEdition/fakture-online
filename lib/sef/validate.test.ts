import { describe, it, expect } from "vitest";
import { validateInvoiceInput } from "./validate";
import type { SefInvoiceInput } from "./types";

const today = new Date().toISOString().slice(0, 10);

const baseSupplier = {
  pib: "100002887",  // valid ISO 7064 MOD 11,10
  maticniBroj: "12345678",
  registrationName: "Acme d.o.o.",
  streetName: "Knez Mihailova 1",
  cityName: "Beograd",
  postalZone: "11000",
  countryCode: "RS",
  bankAccount: "160-0000000000000-78",
};

const baseCustomer = {
  pib: "123456788",  // valid ISO 7064 MOD 11,10
  maticniBroj: "87654321",
  registrationName: "Beta a.d.",
  countryCode: "RS",
};

const baseLine = {
  id: "1",
  description: "Konsalting",
  quantity: 10,
  unitCode: "HUR",
  unitPrice: 100,
  lineExtensionAmount: 1000,
  taxCategory: "S" as const,
  taxPercent: 20,
};

function valid(): SefInvoiceInput {
  return {
    documentType: "invoice",
    invoiceNumber: "FAK-2026-000001",
    issueDate: today,
    dueDate: today,
    currencyCode: "RSD",
    supplier: baseSupplier,
    customer: baseCustomer,
    lines: [baseLine],
  };
}

describe("validateInvoiceInput", () => {
  it("accepts a clean standard B2B invoice", () => {
    const r = validateInvoiceInput(valid());
    expect(r.ok).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it("flags missing invoice number", () => {
    const inp = valid();
    inp.invoiceNumber = "";
    const r = validateInvoiceInput(inp);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.field === "invoiceNumber")).toBe(true);
  });

  it("flags invoice number without year", () => {
    const inp = valid();
    inp.invoiceNumber = "FAK-001";
    const r = validateInvoiceInput(inp);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.field === "invoiceNumber")).toBe(true);
  });

  it("flags backdated invoice", () => {
    const inp = valid();
    inp.issueDate = "2024-01-01";
    const r = validateInvoiceInput(inp);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.field === "issueDate")).toBe(true);
  });

  it("allows backdating for credit notes", () => {
    const inp = valid();
    inp.documentType = "credit_note";
    inp.issueDate = "2024-01-01";
    inp.billingReference = { invoiceNumber: "FAK-2024-000001", issueDate: "2024-01-01" };
    const r = validateInvoiceInput(inp);
    const dateIssues = r.issues.filter((i) => i.field === "issueDate");
    expect(dateIssues).toHaveLength(0);
  });

  it("flags invalid PIB", () => {
    const inp = valid();
    inp.supplier = { ...inp.supplier, pib: "100002888" }; // bad checksum
    const r = validateInvoiceInput(inp);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.field === "supplier.pib")).toBe(true);
  });

  it("requires order/contract for budget user customer", () => {
    const inp = valid();
    inp.customer = { ...inp.customer, isBudgetUser: true, jbkjs: "12345" };
    const r = validateInvoiceInput(inp);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.field === "orderReferenceId")).toBe(true);
  });

  it("accepts budget user customer with order ref", () => {
    const inp = valid();
    inp.customer = { ...inp.customer, isBudgetUser: true, jbkjs: "12345" };
    inp.orderReferenceId = "PO-2025-7";
    const r = validateInvoiceInput(inp);
    expect(r.ok).toBe(true);
  });

  it("flags credit note without billing reference", () => {
    const inp = valid();
    inp.documentType = "credit_note";
    const r = validateInvoiceInput(inp);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.field === "billingReference")).toBe(true);
  });

  it("flags advance with wrong line count or qty != 1", () => {
    const inp = valid();
    inp.documentType = "advance";
    // baseLine has qty=10, so this should flag the qty issue
    const r1 = validateInvoiceInput(inp);
    expect(r1.ok).toBe(false);
    expect(r1.issues.some((i) => i.field.includes("quantity"))).toBe(true);

    inp.lines = [baseLine, { ...baseLine, id: "2" }];
    const r2 = validateInvoiceInput(inp);
    expect(r2.ok).toBe(false);
    expect(r2.issues.some((i) => i.field === "lines")).toBe(true);
  });

  it("accepts well-formed advance (1 line, qty=1, unit H87)", () => {
    const inp = valid();
    inp.documentType = "advance";
    inp.lines = [
      {
        id: "1",
        description: "Avans",
        quantity: 1,
        unitCode: "H87",
        unitPrice: 1000,
        lineExtensionAmount: 1000,
        taxCategory: "S",
        taxPercent: 20,
      },
    ];
    const r = validateInvoiceInput(inp);
    expect(r.ok).toBe(true);
  });

  it("flags tax percent inconsistent with category", () => {
    const inp = valid();
    inp.lines[0] = { ...inp.lines[0], taxPercent: 0 };
    const r = validateInvoiceInput(inp);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.field.endsWith("taxPercent"))).toBe(true);
  });

  it("requires exemption reason for non-S categories", () => {
    const inp = valid();
    inp.lines[0] = { ...inp.lines[0], taxCategory: "Z", taxPercent: 0 };
    const r = validateInvoiceInput(inp);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.field.endsWith("exemptionReasonCode"))).toBe(true);
  });

  it("accepts Z category with valid exemption code", () => {
    const inp = valid();
    inp.customer = { ...inp.customer, isForeign: true, countryCode: "DE" };
    inp.lines[0] = {
      ...inp.lines[0],
      taxCategory: "Z",
      taxPercent: 0,
      exemptionReasonCode: "PDV-RS-24-1-2",
    };
    const r = validateInvoiceInput(inp);
    expect(r.ok).toBe(true);
  });

  it("flags line extension math mismatch", () => {
    const inp = valid();
    inp.lines[0] = { ...inp.lines[0], lineExtensionAmount: 999 }; // should be 1000
    const r = validateInvoiceInput(inp);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.field.includes("lineExtensionAmount"))).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { buildSefXml } from "./index";
import type { SefInvoiceInput } from "../types";

const today = new Date().toISOString().slice(0, 10);

const supplier = {
  pib: "100002887",
  maticniBroj: "12345678",
  registrationName: "Acme d.o.o.",
  streetName: "Knez Mihailova 1",
  cityName: "Beograd",
  postalZone: "11000",
  countryCode: "RS",
  email: "billing@acme.rs",
  bankAccount: "160-0000000000000-78",
};

const customer = {
  pib: "123456788",
  maticniBroj: "87654321",
  registrationName: "Beta a.d.",
  streetName: "Bulevar oslobođenja 12",
  cityName: "Novi Sad",
  postalZone: "21000",
  countryCode: "RS",
};

function standardInvoice(): SefInvoiceInput {
  return {
    documentType: "invoice",
    invoiceNumber: "FAK-2026-000123",
    issueDate: today,
    dueDate: today,
    currencyCode: "RSD",
    supplier,
    customer,
    paymentReference: "(mod97) 000123/2025",
    lines: [
      {
        id: "1",
        description: "Konsalting",
        quantity: 10,
        unitCode: "HUR",
        unitPrice: 100,
        lineExtensionAmount: 1000,
        taxCategory: "S",
        taxPercent: 20,
      },
    ],
  };
}

describe("buildSefXml — Invoice (380)", () => {
  it("emits XML declaration and Invoice root", () => {
    const xml = buildSefXml(standardInvoice());
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(xml).toContain("<Invoice ");
    expect(xml).toContain("</Invoice>");
  });

  it("includes Serbian SEF CustomizationID 2022", () => {
    const xml = buildSefXml(standardInvoice());
    expect(xml).toContain(
      "<cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.rs:srbdt:2022</cbc:CustomizationID>",
    );
  });

  it("emits InvoiceTypeCode 380", () => {
    const xml = buildSefXml(standardInvoice());
    expect(xml).toContain("<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>");
  });

  it("PIB endpoint has schemeID=9948", () => {
    const xml = buildSefXml(standardInvoice());
    expect(xml).toContain('<cbc:EndpointID schemeID="9948">100002887</cbc:EndpointID>');
  });

  it("PartyTaxScheme/CompanyID has RS prefix", () => {
    const xml = buildSefXml(standardInvoice());
    expect(xml).toContain("<cbc:CompanyID>RS100002887</cbc:CompanyID>");
  });

  it("emits valid LegalMonetaryTotal math", () => {
    const xml = buildSefXml(standardInvoice());
    expect(xml).toContain('<cbc:LineExtensionAmount currencyID="RSD">1000.00</cbc:LineExtensionAmount>');
    expect(xml).toContain('<cbc:TaxExclusiveAmount currencyID="RSD">1000.00</cbc:TaxExclusiveAmount>');
    expect(xml).toContain('<cbc:TaxInclusiveAmount currencyID="RSD">1200.00</cbc:TaxInclusiveAmount>');
    expect(xml).toContain('<cbc:PayableAmount currencyID="RSD">1200.00</cbc:PayableAmount>');
  });

  it("emits TaxTotal with category S @ 20%", () => {
    const xml = buildSefXml(standardInvoice());
    expect(xml).toContain('<cbc:TaxAmount currencyID="RSD">200.00</cbc:TaxAmount>');
    expect(xml).toContain("<cbc:ID>S</cbc:ID>");
    expect(xml).toContain("<cbc:Percent>20</cbc:Percent>");
  });

  it("InvoiceLine uses unit code from input", () => {
    const xml = buildSefXml(standardInvoice());
    expect(xml).toContain('<cbc:InvoicedQuantity unitCode="HUR">10</cbc:InvoicedQuantity>');
  });

  it("escapes special chars in text", () => {
    const inp = standardInvoice();
    inp.note = "Pažnja & <oprez> \"navodnici\"";
    const xml = buildSefXml(inp);
    expect(xml).toContain("Pažnja &amp; &lt;oprez&gt;");
    expect(xml).not.toContain("Pažnja & <");
  });
});

describe("buildSefXml — CreditNote (381)", () => {
  it("emits CreditNote root and 381 type code", () => {
    const inp: SefInvoiceInput = {
      ...standardInvoice(),
      documentType: "credit_note",
      invoiceNumber: "STN-2026-000001",
      billingReference: { invoiceNumber: "FAK-2026-000123", issueDate: today },
    };
    const xml = buildSefXml(inp);
    expect(xml).toContain("<CreditNote ");
    expect(xml).toContain("</CreditNote>");
    expect(xml).toContain("<cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>");
  });

  it("CreditNoteLine uses CreditedQuantity not InvoicedQuantity", () => {
    const inp: SefInvoiceInput = {
      ...standardInvoice(),
      documentType: "credit_note",
      billingReference: { invoiceNumber: "FAK-2026-000123", issueDate: today },
    };
    const xml = buildSefXml(inp);
    expect(xml).toContain("<cbc:CreditedQuantity");
    expect(xml).not.toContain("<cbc:InvoicedQuantity");
  });

  it("includes BillingReference", () => {
    const inp: SefInvoiceInput = {
      ...standardInvoice(),
      documentType: "credit_note",
      billingReference: { invoiceNumber: "FAK-2026-000123", issueDate: today },
    };
    const xml = buildSefXml(inp);
    expect(xml).toContain("<cac:BillingReference>");
    expect(xml).toContain("<cbc:ID>FAK-2026-000123</cbc:ID>");
  });
});

describe("buildSefXml — Advance (386)", () => {
  it("emits 386 type code and no Delivery element", () => {
    const inp: SefInvoiceInput = {
      ...standardInvoice(),
      documentType: "advance",
      lines: [
        {
          id: "1",
          description: "Avans za uslugu",
          quantity: 1,
          unitCode: "H87",
          unitPrice: 1000,
          lineExtensionAmount: 1000,
          taxCategory: "S",
          taxPercent: 20,
        },
      ],
    };
    const xml = buildSefXml(inp);
    expect(xml).toContain("<cbc:InvoiceTypeCode>386</cbc:InvoiceTypeCode>");
    expect(xml).not.toContain("<cac:Delivery>");
    expect(xml).toContain('<cbc:DescriptionCode>432</cbc:DescriptionCode>');
  });

  it("throws if advance has more than 1 line", () => {
    const inp: SefInvoiceInput = {
      ...standardInvoice(),
      documentType: "advance",
      lines: [
        { id: "1", description: "a", quantity: 1, unitCode: "H87", unitPrice: 100, lineExtensionAmount: 100, taxCategory: "S", taxPercent: 20 },
        { id: "2", description: "b", quantity: 1, unitCode: "H87", unitPrice: 100, lineExtensionAmount: 100, taxCategory: "S", taxPercent: 20 },
      ],
    };
    expect(() => buildSefXml(inp)).toThrow();
  });
});

describe("buildSefXml — foreign customer with Z (export)", () => {
  it("emits Z category with exemption reason", () => {
    const inp = standardInvoice();
    inp.customer = { ...customer, isForeign: true, countryCode: "DE" };
    inp.lines[0] = {
      ...inp.lines[0],
      taxCategory: "Z",
      taxPercent: 0,
      exemptionReasonCode: "PDV-RS-24-1-2",
      exemptionReasonText: "Izvoz dobara",
    };
    const xml = buildSefXml(inp);
    expect(xml).toContain("<cbc:ID>Z</cbc:ID>");
    expect(xml).toContain("<cbc:TaxExemptionReasonCode>PDV-RS-24-1-2</cbc:TaxExemptionReasonCode>");
    expect(xml).toContain("<cbc:IdentificationCode>DE</cbc:IdentificationCode>");
  });
});

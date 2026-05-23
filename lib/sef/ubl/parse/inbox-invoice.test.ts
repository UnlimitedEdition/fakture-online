import { describe, it, expect } from "vitest";
import { parseInboxInvoice } from "./inbox-invoice";

const SAMPLE_INVOICE = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.rs:srbdt:2022</cbc:CustomizationID>
  <cbc:ID>FAK-2026-000777</cbc:ID>
  <cbc:IssueDate>2026-05-23</cbc:IssueDate>
  <cbc:DueDate>2026-06-22</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:Note>Testna faktura</cbc:Note>
  <cbc:DocumentCurrencyCode>RSD</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party>
    <cbc:EndpointID schemeID="9948">100001828</cbc:EndpointID>
    <cac:PartyTaxScheme>
      <cbc:CompanyID>RS100001828</cbc:CompanyID>
      <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
    </cac:PartyTaxScheme>
    <cac:PartyLegalEntity>
      <cbc:RegistrationName>Dobavljac d.o.o.</cbc:RegistrationName>
      <cbc:CompanyID>12345678</cbc:CompanyID>
    </cac:PartyLegalEntity>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cbc:EndpointID schemeID="9948">100000031</cbc:EndpointID>
    <cac:PartyLegalEntity>
      <cbc:RegistrationName>Kupac d.o.o.</cbc:RegistrationName>
      <cbc:CompanyID>87654321</cbc:CompanyID>
    </cac:PartyLegalEntity>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="RSD">200.00</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="RSD">1000.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="RSD">1200.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="RSD">1200.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="HUR">10</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="RSD">1000.00</cbc:LineExtensionAmount>
  </cac:InvoiceLine>
</Invoice>`;

const SAMPLE_CREDIT_NOTE = `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
            xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
            xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:mfin.gov.rs:srbdt:2022</cbc:CustomizationID>
  <cbc:ID>STN-2026-000001</cbc:ID>
  <cbc:IssueDate>2026-05-23</cbc:IssueDate>
  <cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>
  <cbc:DocumentCurrencyCode>RSD</cbc:DocumentCurrencyCode>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>FAK-2026-000777</cbc:ID>
      <cbc:IssueDate>2026-05-20</cbc:IssueDate>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyLegalEntity><cbc:RegistrationName>Dobavljac d.o.o.</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyLegalEntity><cbc:RegistrationName>Kupac d.o.o.</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="RSD">500.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:CreditNoteLine>
    <cbc:ID>1</cbc:ID>
    <cbc:CreditedQuantity unitCode="H87">1</cbc:CreditedQuantity>
    <cbc:LineExtensionAmount currencyID="RSD">500.00</cbc:LineExtensionAmount>
  </cac:CreditNoteLine>
</CreditNote>`;

describe("parseInboxInvoice", () => {
  it("parses a standard invoice", () => {
    const r = parseInboxInvoice(SAMPLE_INVOICE);
    expect(r.rootKind).toBe("Invoice");
    expect(r.invoiceNumber).toBe("FAK-2026-000777");
    expect(r.documentTypeCode).toBe("380");
    expect(r.issueDate).toBe("2026-05-23");
    expect(r.dueDate).toBe("2026-06-22");
    expect(r.currencyCode).toBe("RSD");
    expect(r.supplierName).toBe("Dobavljac d.o.o.");
    expect(r.supplierPib).toBe("100001828");
    expect(r.customerName).toBe("Kupac d.o.o.");
    expect(r.customerPib).toBe("100000031");
    expect(r.totalAmount).toBe(1200);
    expect(r.taxAmount).toBe(200);
    expect(r.netAmount).toBe(1000);
    expect(r.note).toBe("Testna faktura");
    expect(r.lineCount).toBe(1);
  });

  it("parses a credit note", () => {
    const r = parseInboxInvoice(SAMPLE_CREDIT_NOTE);
    expect(r.rootKind).toBe("CreditNote");
    expect(r.invoiceNumber).toBe("STN-2026-000001");
    expect(r.documentTypeCode).toBe("381");
    expect(r.billingReferenceId).toBe("FAK-2026-000777");
    expect(r.totalAmount).toBe(500);
    expect(r.lineCount).toBe(1);
  });

  it("throws on neither root", () => {
    expect(() => parseInboxInvoice("<?xml version=\"1.0\"?><Other/>")).toThrow();
  });

  it("strips RS prefix from PIB", () => {
    const r = parseInboxInvoice(SAMPLE_INVOICE);
    expect(r.supplierPib).not.toMatch(/^RS/);
  });
});

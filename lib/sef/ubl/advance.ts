// UBL builder for InvoiceTypeCode 386 (avansna faktura).
// Special rules:
//   - Exactly 1 line, qty=1, unit=H87 (komad)
//   - NO cac:Delivery element
//   - DueDate = date PDV obligation arises
//   - InvoicePeriod/DescriptionCode = "432" (prepayment)
//   - Tax category typically "R" with exemption reason from Article 6 series

import { el, elText, xmlDeclaration } from "./builder-base";
import { CUSTOMIZATION_ID, rootAttributes } from "./namespaces";
import { buildSupplierParty, buildCustomerParty } from "./common/party";
import { buildPaymentMeans } from "./common/payment-means";
import { buildTaxTotal, groupLinesIntoSubtotals } from "./common/tax-totals";
import { buildLegalMonetaryTotal } from "./common/monetary-total";
import { buildInvoiceLine } from "./common/invoice-line";
import { DOC_TYPE_CODE, type SefInvoiceInput } from "../types";
import { round2 } from "../rounding";

export function buildAdvanceXml(input: SefInvoiceInput): string {
  if (input.documentType !== "advance") {
    throw new Error("buildAdvanceXml requires documentType='advance'");
  }
  if (input.lines.length !== 1) {
    throw new Error("Advance invoice must have exactly 1 line");
  }
  const ln = input.lines[0];
  if (ln.quantity !== 1) {
    throw new Error("Advance line quantity must be 1");
  }

  const subtotals = groupLinesIntoSubtotals(input.lines);
  const totalTax = round2(subtotals.reduce((s, st) => s + st.taxAmount, 0));
  const lineExt = round2(round2(ln.lineExtensionAmount));

  const body = el(
    "Invoice",
    rootAttributes("Invoice"),
    elText("cbc:CustomizationID", CUSTOMIZATION_ID),
    elText("cbc:ID", input.invoiceNumber),
    elText("cbc:IssueDate", input.issueDate),
    elText("cbc:DueDate", input.dueDate),
    elText("cbc:InvoiceTypeCode", DOC_TYPE_CODE.advance),
    elText("cbc:Note", input.note),
    elText("cbc:DocumentCurrencyCode", input.currencyCode),
    el(
      "cac:InvoicePeriod",
      null,
      elText("cbc:DescriptionCode", "432"),
    ),
    input.orderReferenceId
      ? el("cac:OrderReference", null, elText("cbc:ID", input.orderReferenceId))
      : "",
    el(
      "cac:AccountingSupplierParty",
      null,
      buildSupplierParty(input.supplier),
    ),
    el(
      "cac:AccountingCustomerParty",
      null,
      buildCustomerParty(input.customer),
    ),
    // NOTE: NO cac:Delivery for avans
    buildPaymentMeans({
      code: input.paymentMeansCode,
      paymentId: input.paymentReference,
      bankAccount: input.supplier.bankAccount,
    }),
    buildTaxTotal(subtotals, input.currencyCode),
    buildLegalMonetaryTotal({
      lineExtensionAmount: lineExt,
      totalTaxAmount: totalTax,
      payableRoundingAmount: input.payableRoundingAmount,
      currencyId: input.currencyCode,
    }),
    buildInvoiceLine(ln, input.currencyCode),
  );

  return `${xmlDeclaration()}\n${body}`;
}

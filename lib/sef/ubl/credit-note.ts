// UBL builder for CreditNoteTypeCode 381 (knjižno odobrenje / storno).
// Root is <CreditNote>, lines use <CreditNoteLine> with <CreditedQuantity>.
// No DueDate; BillingReference is REQUIRED.

import { el, elText, xmlDeclaration } from "./builder-base";
import { CUSTOMIZATION_ID, rootAttributes } from "./namespaces";
import { buildSupplierParty, buildCustomerParty } from "./common/party";
import { buildPaymentMeans } from "./common/payment-means";
import { buildTaxTotal, groupLinesIntoSubtotals } from "./common/tax-totals";
import { buildLegalMonetaryTotal } from "./common/monetary-total";
import { buildCreditNoteLine } from "./common/invoice-line";
import { type SefInvoiceInput } from "../types";
import { round2 } from "../rounding";

export function buildCreditNoteXml(input: SefInvoiceInput): string {
  if (input.documentType !== "credit_note") {
    throw new Error("buildCreditNoteXml requires documentType='credit_note'");
  }
  if (!input.billingReference?.invoiceNumber) {
    throw new Error("CreditNote requires billingReference.invoiceNumber");
  }

  const subtotals = groupLinesIntoSubtotals(input.lines);
  const totalTax = round2(subtotals.reduce((s, st) => s + st.taxAmount, 0));
  const lineExt = round2(input.lines.reduce((s, l) => s + round2(l.lineExtensionAmount), 0));

  const body = el(
    "CreditNote",
    rootAttributes("CreditNote"),
    elText("cbc:CustomizationID", CUSTOMIZATION_ID),
    elText("cbc:ID", input.invoiceNumber),
    elText("cbc:IssueDate", input.issueDate),
    elText("cbc:CreditNoteTypeCode", "381"),
    elText("cbc:Note", input.note),
    elText("cbc:DocumentCurrencyCode", input.currencyCode),
    elText("cbc:BuyerReference", input.buyerReference),
    input.orderReferenceId
      ? el("cac:OrderReference", null, elText("cbc:ID", input.orderReferenceId))
      : "",
    el(
      "cac:BillingReference",
      null,
      el(
        "cac:InvoiceDocumentReference",
        null,
        elText("cbc:ID", input.billingReference.invoiceNumber),
        elText("cbc:IssueDate", input.billingReference.issueDate),
      ),
    ),
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
    ...input.lines.map((line) => buildCreditNoteLine(line, input.currencyCode)),
  );

  return `${xmlDeclaration()}\n${body}`;
}

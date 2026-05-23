// UBL builder for InvoiceTypeCode 380 (standard B2B invoice).
// Also used for 383 (DebitNote) and 384 (Corrective) — they share the
// Invoice root with a different type code.

import { el, elText, xmlDeclaration } from "./builder-base";
import { CUSTOMIZATION_ID, rootAttributes } from "./namespaces";
import { buildSupplierParty, buildCustomerParty } from "./common/party";
import { buildPaymentMeans } from "./common/payment-means";
import { buildTaxTotal, groupLinesIntoSubtotals } from "./common/tax-totals";
import { buildLegalMonetaryTotal } from "./common/monetary-total";
import { buildInvoiceLine } from "./common/invoice-line";
import { DOC_TYPE_CODE, type SefInvoiceInput } from "../types";
import { round2 } from "../rounding";

export function buildInvoiceXml(input: SefInvoiceInput): string {
  if (input.documentType === "credit_note") {
    throw new Error("Use buildCreditNoteXml for credit notes.");
  }

  const code = DOC_TYPE_CODE[input.documentType];
  const subtotals = groupLinesIntoSubtotals(input.lines);
  const totalTax = round2(subtotals.reduce((s, st) => s + st.taxAmount, 0));
  const lineExt = round2(input.lines.reduce((s, l) => s + round2(l.lineExtensionAmount), 0));

  const isPrepaymentConsuming = !!input.prepayment;
  const prepaidAmount = isPrepaymentConsuming ? round2(input.prepayment!.amount) : 0;

  const body = el(
    "Invoice",
    rootAttributes("Invoice"),
    elText("cbc:CustomizationID", CUSTOMIZATION_ID),
    elText("cbc:ID", input.invoiceNumber),
    elText("cbc:IssueDate", input.issueDate),
    elText("cbc:DueDate", input.dueDate),
    elText("cbc:InvoiceTypeCode", code),
    elText("cbc:Note", input.note),
    elText("cbc:DocumentCurrencyCode", input.currencyCode),
    elText("cbc:BuyerReference", input.buyerReference),
    input.orderReferenceId
      ? el("cac:OrderReference", null, elText("cbc:ID", input.orderReferenceId))
      : "",
    input.billingReference
      ? el(
          "cac:BillingReference",
          null,
          el(
            "cac:InvoiceDocumentReference",
            null,
            elText("cbc:ID", input.billingReference.invoiceNumber),
            elText("cbc:IssueDate", input.billingReference.issueDate),
          ),
        )
      : "",
    input.contractReferenceId
      ? el(
          "cac:ContractDocumentReference",
          null,
          elText("cbc:ID", input.contractReferenceId),
        )
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
    // Delivery — required for type 380; absent for 386 (avans)
    input.documentType !== "advance" && input.deliveryDate
      ? el(
          "cac:Delivery",
          null,
          elText("cbc:ActualDeliveryDate", input.deliveryDate),
        )
      : "",
    buildPaymentMeans({
      code: input.paymentMeansCode,
      paymentId: input.paymentReference,
      bankAccount: input.supplier.bankAccount,
    }),
    isPrepaymentConsuming
      ? buildTaxTotal(subtotals, input.currencyCode, {
          includeAdvanceSubtotal: {
            taxableAmount: -input.prepayment!.advanceTaxableAmount,
            taxAmount: -input.prepayment!.advanceTaxAmount,
            taxRate: input.prepayment!.advanceTaxRate,
            category: input.prepayment!.advanceTaxCategory,
          },
        })
      : buildTaxTotal(subtotals, input.currencyCode),
    buildLegalMonetaryTotal({
      lineExtensionAmount: lineExt,
      totalTaxAmount: isPrepaymentConsuming
        ? round2(totalTax - input.prepayment!.advanceTaxAmount)
        : totalTax,
      prepaidAmount,
      payableRoundingAmount: input.payableRoundingAmount,
      currencyId: input.currencyCode,
    }),
    ...input.lines.map((line) => buildInvoiceLine(line, input.currencyCode)),
  );

  return `${xmlDeclaration()}\n${body}`;
}

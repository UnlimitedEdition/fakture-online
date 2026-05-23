import { el, elText } from "../builder-base";
import type { SefInvoiceLine } from "../../types";
import { formatAmount, formatQuantity, formatUnitPrice } from "../../rounding";

// Build cac:InvoiceLine for type 380/383/386/384.
export function buildInvoiceLine(line: SefInvoiceLine, currencyId: string): string {
  return el(
    "cac:InvoiceLine",
    null,
    elText("cbc:ID", line.id),
    elText("cbc:InvoicedQuantity", formatQuantity(line.quantity), { unitCode: line.unitCode }),
    elText("cbc:LineExtensionAmount", formatAmount(line.lineExtensionAmount), { currencyID: currencyId }),
    line.allowance
      ? el(
          "cac:AllowanceCharge",
          null,
          elText("cbc:ChargeIndicator", line.allowance.chargeIndicator ? "true" : "false"),
          line.allowance.reason ? elText("cbc:AllowanceChargeReason", line.allowance.reason) : "",
          elText("cbc:Amount", formatAmount(line.allowance.amount), { currencyID: currencyId }),
        )
      : "",
    el(
      "cac:Item",
      null,
      line.description ? elText("cbc:Description", line.description) : "",
      elText("cbc:Name", line.name ?? line.description),
      line.sellerItemId
        ? el(
            "cac:SellersItemIdentification",
            null,
            elText("cbc:ID", line.sellerItemId),
          )
        : "",
      el(
        "cac:ClassifiedTaxCategory",
        null,
        elText("cbc:ID", line.taxCategory),
        elText("cbc:Percent", line.taxPercent),
        line.exemptionReasonCode
          ? elText("cbc:TaxExemptionReasonCode", line.exemptionReasonCode)
          : "",
        el("cac:TaxScheme", null, elText("cbc:ID", "VAT")),
      ),
    ),
    el(
      "cac:Price",
      null,
      elText("cbc:PriceAmount", formatUnitPrice(line.unitPrice), { currencyID: currencyId }),
    ),
  );
}

// CreditNoteLine for type 381 — uses CreditedQuantity instead of InvoicedQuantity.
export function buildCreditNoteLine(line: SefInvoiceLine, currencyId: string): string {
  return el(
    "cac:CreditNoteLine",
    null,
    elText("cbc:ID", line.id),
    elText("cbc:CreditedQuantity", formatQuantity(line.quantity), { unitCode: line.unitCode }),
    elText("cbc:LineExtensionAmount", formatAmount(line.lineExtensionAmount), { currencyID: currencyId }),
    line.allowance
      ? el(
          "cac:AllowanceCharge",
          null,
          elText("cbc:ChargeIndicator", line.allowance.chargeIndicator ? "true" : "false"),
          line.allowance.reason ? elText("cbc:AllowanceChargeReason", line.allowance.reason) : "",
          elText("cbc:Amount", formatAmount(line.allowance.amount), { currencyID: currencyId }),
        )
      : "",
    el(
      "cac:Item",
      null,
      line.description ? elText("cbc:Description", line.description) : "",
      elText("cbc:Name", line.name ?? line.description),
      line.sellerItemId
        ? el(
            "cac:SellersItemIdentification",
            null,
            elText("cbc:ID", line.sellerItemId),
          )
        : "",
      el(
        "cac:ClassifiedTaxCategory",
        null,
        elText("cbc:ID", line.taxCategory),
        elText("cbc:Percent", line.taxPercent),
        line.exemptionReasonCode
          ? elText("cbc:TaxExemptionReasonCode", line.exemptionReasonCode)
          : "",
        el("cac:TaxScheme", null, elText("cbc:ID", "VAT")),
      ),
    ),
    el(
      "cac:Price",
      null,
      elText("cbc:PriceAmount", formatUnitPrice(line.unitPrice), { currencyID: currencyId }),
    ),
  );
}

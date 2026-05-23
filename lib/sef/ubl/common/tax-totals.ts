import { el, elText } from "../builder-base";
import type { SefInvoiceLine, TaxCategoryCode } from "../../types";
import { formatAmount, round2 } from "../../rounding";

interface SubtotalKey {
  category: TaxCategoryCode;
  percent: number;
  exemptionCode?: string;
  exemptionText?: string;
}

interface Subtotal {
  key: SubtotalKey;
  taxableAmount: number;
  taxAmount: number;
}

// Group lines into tax subtotals (category + percent), summing per-line taxes.
// Implements per-line rounding per SEF Pravilnik.
export function groupLinesIntoSubtotals(lines: SefInvoiceLine[]): Subtotal[] {
  const map = new Map<string, Subtotal>();

  for (const line of lines) {
    const key = `${line.taxCategory}@${line.taxPercent}`;
    const lineTaxable = round2(line.lineExtensionAmount);
    const lineTax = round2((lineTaxable * line.taxPercent) / 100);
    const existing = map.get(key);
    if (existing) {
      existing.taxableAmount = round2(existing.taxableAmount + lineTaxable);
      existing.taxAmount = round2(existing.taxAmount + lineTax);
    } else {
      map.set(key, {
        key: {
          category: line.taxCategory,
          percent: line.taxPercent,
          exemptionCode: line.exemptionReasonCode,
          exemptionText: line.exemptionReasonText,
        },
        taxableAmount: lineTaxable,
        taxAmount: lineTax,
      });
    }
  }

  return Array.from(map.values());
}

// Build TaxTotal element wrapping TaxSubtotals + summed TaxAmount.
export function buildTaxTotal(
  subtotals: Subtotal[],
  currencyId: string,
  options?: { includeAdvanceSubtotal?: { taxableAmount: number; taxAmount: number; taxRate: number; category: TaxCategoryCode } },
): string {
  let totalTax = round2(subtotals.reduce((s, st) => s + st.taxAmount, 0));
  const subtotalElements: string[] = subtotals.map((st) =>
    el(
      "cac:TaxSubtotal",
      null,
      elText("cbc:TaxableAmount", formatAmount(st.taxableAmount), { currencyID: currencyId }),
      elText("cbc:TaxAmount", formatAmount(st.taxAmount), { currencyID: currencyId }),
      el(
        "cac:TaxCategory",
        null,
        elText("cbc:ID", st.key.category),
        elText("cbc:Percent", st.key.percent),
        st.key.exemptionCode ? elText("cbc:TaxExemptionReasonCode", st.key.exemptionCode) : "",
        st.key.exemptionText ? elText("cbc:TaxExemptionReason", st.key.exemptionText) : "",
        el("cac:TaxScheme", null, elText("cbc:ID", "VAT")),
      ),
    ),
  );

  if (options?.includeAdvanceSubtotal) {
    const adv = options.includeAdvanceSubtotal;
    totalTax = round2(totalTax + adv.taxAmount);
    subtotalElements.push(
      el(
        "cac:TaxSubtotal",
        null,
        elText("cbc:TaxableAmount", formatAmount(adv.taxableAmount), { currencyID: currencyId }),
        elText("cbc:TaxAmount", formatAmount(adv.taxAmount), { currencyID: currencyId }),
        el(
          "cac:TaxCategory",
          null,
          elText("cbc:ID", adv.category),
          elText("cbc:Percent", adv.taxRate),
          el("cac:TaxScheme", null, elText("cbc:ID", "VAT")),
        ),
      ),
    );
  }

  return el(
    "cac:TaxTotal",
    null,
    elText("cbc:TaxAmount", formatAmount(totalTax), { currencyID: currencyId }),
    ...subtotalElements,
  );
}

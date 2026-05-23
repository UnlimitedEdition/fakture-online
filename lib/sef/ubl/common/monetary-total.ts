import { el, elText } from "../builder-base";
import { formatAmount, round2 } from "../../rounding";

// LegalMonetaryTotal — Schematron-enforced math:
//   TaxInclusive = TaxExclusive + Σ TaxAmount
//   Payable      = TaxInclusive − Prepaid + Rounding
export function buildLegalMonetaryTotal(args: {
  lineExtensionAmount: number;
  totalTaxAmount: number;
  allowanceTotalAmount?: number;
  chargeTotalAmount?: number;
  prepaidAmount?: number;
  payableRoundingAmount?: number;
  currencyId: string;
}): string {
  const lineExt = round2(args.lineExtensionAmount);
  const allowance = round2(args.allowanceTotalAmount ?? 0);
  const charge = round2(args.chargeTotalAmount ?? 0);
  const taxExclusive = round2(lineExt - allowance + charge);
  const taxInclusive = round2(taxExclusive + round2(args.totalTaxAmount));
  const prepaid = round2(args.prepaidAmount ?? 0);
  const rounding = round2(args.payableRoundingAmount ?? 0);
  const payable = round2(taxInclusive - prepaid + rounding);

  return el(
    "cac:LegalMonetaryTotal",
    null,
    elText("cbc:LineExtensionAmount", formatAmount(lineExt), { currencyID: args.currencyId }),
    elText("cbc:TaxExclusiveAmount", formatAmount(taxExclusive), { currencyID: args.currencyId }),
    elText("cbc:TaxInclusiveAmount", formatAmount(taxInclusive), { currencyID: args.currencyId }),
    elText("cbc:AllowanceTotalAmount", formatAmount(allowance), { currencyID: args.currencyId }),
    elText("cbc:ChargeTotalAmount", formatAmount(charge), { currencyID: args.currencyId }),
    elText("cbc:PrepaidAmount", formatAmount(prepaid), { currencyID: args.currencyId }),
    elText("cbc:PayableRoundingAmount", formatAmount(rounding), { currencyID: args.currencyId }),
    elText("cbc:PayableAmount", formatAmount(payable), { currencyID: args.currencyId }),
  );
}

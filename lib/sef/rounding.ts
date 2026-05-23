// SEF rounding rules:
//   - Per-line tax: round(quantity * unitPrice * rate / 100, 2)
//   - Total tax per category: sum of rounded per-line taxes (NOT round-then-sum)
//   - Math constraint: TaxInclusiveAmount = TaxExclusiveAmount + Σ TaxAmount
//   - Schematron tolerance: ±0.01 RSD on totals; we don't push it.
//   - JS floats produce 19.999999996 — coerce to 2dp via toFixed(2) at serialization.

export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function round4(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

// Format a number for UBL serialisation. Always uses "." as decimal separator.
export function formatAmount(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return decimals === 2 ? "0.00" : "0";
  return round2(n).toFixed(decimals);
}

// Format quantity (allows up to 3 dp).
export function formatQuantity(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n * 1000) / 1000 + "";
}

// Format unit price — allow up to 4dp.
export function formatUnitPrice(n: number): string {
  return formatAmount(round4(n), 4).replace(/0+$/, "").replace(/\.$/, ".00");
}

// Compute tax category subtotals (per Pravilnik: line tax = round2(taxable * rate / 100)).
export function computeTaxSubtotal(
  taxableLines: number[],
  ratePercent: number,
): { taxableAmount: number; taxAmount: number } {
  const taxableAmount = round2(taxableLines.reduce((sum, x) => sum + round2(x), 0));
  const taxAmount = round2(
    taxableLines.reduce((sum, x) => sum + round2((round2(x) * ratePercent) / 100), 0),
  );
  return { taxableAmount, taxAmount };
}

// Validate totals consistency (returns list of errors).
export function validateTotals(args: {
  lineExtensionAmount: number;
  taxExclusiveAmount: number;
  taxInclusiveAmount: number;
  totalTaxAmount: number;
  prepaidAmount: number;
  payableRoundingAmount: number;
  payableAmount: number;
}): string[] {
  const errors: string[] = [];
  const tolerance = 0.01;

  const expectedInclusive = round2(args.taxExclusiveAmount + args.totalTaxAmount);
  if (Math.abs(expectedInclusive - args.taxInclusiveAmount) > tolerance) {
    errors.push(
      `TaxInclusiveAmount (${args.taxInclusiveAmount}) != TaxExclusiveAmount + TaxAmount (${expectedInclusive})`,
    );
  }

  const expectedPayable = round2(
    args.taxInclusiveAmount - args.prepaidAmount + args.payableRoundingAmount,
  );
  if (Math.abs(expectedPayable - args.payableAmount) > tolerance) {
    errors.push(
      `PayableAmount (${args.payableAmount}) != TaxInclusiveAmount - PrepaidAmount + Rounding (${expectedPayable})`,
    );
  }

  return errors;
}

import { describe, it, expect } from "vitest";
import {
  round2,
  round4,
  formatAmount,
  formatQuantity,
  computeTaxSubtotal,
  validateTotals,
} from "./rounding";

describe("round2", () => {
  it("rounds float drift correctly", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(19.999999996)).toBe(20.0);
    expect(round2(0.005)).toBe(0.01); // banker's rounding NOT used — we round half up
    expect(round2(0.004)).toBe(0.0);
  });
  it("handles non-finite", () => {
    expect(round2(NaN)).toBe(0);
    expect(round2(Infinity)).toBe(0);
  });
});

describe("round4", () => {
  it("rounds to 4 dp", () => {
    expect(round4(1.23456789)).toBe(1.2346);
    expect(round4(0.00005)).toBe(0.0001);
  });
});

describe("formatAmount", () => {
  it("always emits 2 dp with . separator", () => {
    expect(formatAmount(1234.5)).toBe("1234.50");
    expect(formatAmount(0)).toBe("0.00");
    expect(formatAmount(0.001)).toBe("0.00");
  });
});

describe("formatQuantity", () => {
  it("emits up to 3 dp without trailing zeros", () => {
    expect(formatQuantity(1)).toBe("1");
    expect(formatQuantity(1.5)).toBe("1.5");
    expect(formatQuantity(2.000)).toBe("2");
  });
});

describe("computeTaxSubtotal", () => {
  it("rounds per-line then sums", () => {
    // 3 lines at 33.33 each, 20% PDV
    // Per-line tax = round2(33.33 * 20 / 100) = 6.67
    // Total tax = 6.67 + 6.67 + 6.67 = 20.01 (vs round-then-sum = 20.00)
    const r = computeTaxSubtotal([33.33, 33.33, 33.33], 20);
    expect(r.taxableAmount).toBe(99.99);
    expect(r.taxAmount).toBe(20.01);
  });
  it("handles 0% rate", () => {
    const r = computeTaxSubtotal([100, 200], 0);
    expect(r.taxAmount).toBe(0);
    expect(r.taxableAmount).toBe(300);
  });
});

describe("validateTotals", () => {
  it("accepts consistent totals", () => {
    const errs = validateTotals({
      lineExtensionAmount: 1000,
      taxExclusiveAmount: 1000,
      taxInclusiveAmount: 1200,
      totalTaxAmount: 200,
      prepaidAmount: 0,
      payableRoundingAmount: 0,
      payableAmount: 1200,
    });
    expect(errs).toHaveLength(0);
  });
  it("flags wrong TaxInclusive math", () => {
    const errs = validateTotals({
      lineExtensionAmount: 1000,
      taxExclusiveAmount: 1000,
      taxInclusiveAmount: 1199,        // off by 1
      totalTaxAmount: 200,
      prepaidAmount: 0,
      payableRoundingAmount: 0,
      payableAmount: 1199,
    });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]).toMatch(/TaxInclusiveAmount/);
  });
  it("flags wrong Payable math", () => {
    const errs = validateTotals({
      lineExtensionAmount: 1000,
      taxExclusiveAmount: 1000,
      taxInclusiveAmount: 1200,
      totalTaxAmount: 200,
      prepaidAmount: 100,
      payableRoundingAmount: 0,
      payableAmount: 1200,             // should be 1100
    });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]).toMatch(/PayableAmount/);
  });
  it("tolerates ±0.01 RSD drift", () => {
    const errs = validateTotals({
      lineExtensionAmount: 1000,
      taxExclusiveAmount: 1000,
      taxInclusiveAmount: 1200.01,     // 0.01 drift
      totalTaxAmount: 200,
      prepaidAmount: 0,
      payableRoundingAmount: 0,
      payableAmount: 1200.01,
    });
    expect(errs).toHaveLength(0);
  });
});

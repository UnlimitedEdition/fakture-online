import { describe, it, expect } from "vitest";
import {
  isValidPIB,
  isValidJBKJS,
  isValidMaticniBroj,
  isValidBankAccount,
  normalisePIB,
  formatBankAccount,
} from "./pib";

// PIBs verified by hand-trace against ISO 7064 MOD 11,10:
// 100002887 → check 7 (valid)
// 123456788 → check 8 (valid)
// 100000032 → check 2 (valid)

describe("isValidPIB", () => {
  it("rejects empty/short/non-digit input", () => {
    expect(isValidPIB("")).toBe(false);
    expect(isValidPIB(null)).toBe(false);
    expect(isValidPIB("12345")).toBe(false);
    expect(isValidPIB("abc123456")).toBe(false);
    expect(isValidPIB("1234567890")).toBe(false); // 10 digits
  });

  it("validates known-good PIBs (ISO 7064 MOD 11,10)", () => {
    expect(isValidPIB("100002887")).toBe(true);
    expect(isValidPIB("123456788")).toBe(true);
    expect(isValidPIB("100000032")).toBe(true);
  });

  it("rejects bad checksums", () => {
    expect(isValidPIB("100002888")).toBe(false); // wrong control digit
    expect(isValidPIB("123456789")).toBe(false);
    expect(isValidPIB("100000031")).toBe(false);
    expect(isValidPIB("000000000")).toBe(false);
  });

  it("rejects all-same digits with bad checksum", () => {
    expect(isValidPIB("111111111")).toBe(false); // correct check would be 7
    expect(isValidPIB("999999999")).toBe(false);
  });
});

describe("isValidJBKJS", () => {
  it("accepts 5-digit legacy format", () => {
    expect(isValidJBKJS("12345")).toBe(true);
    expect(isValidJBKJS("00001")).toBe(true);
  });
  it("accepts post-April-2026 alphanumeric (5-10 chars uppercase)", () => {
    expect(isValidJBKJS("ABC12")).toBe(true);
    expect(isValidJBKJS("RS0001234")).toBe(true);
    expect(isValidJBKJS("abc12")).toBe(true); // case insensitive
  });
  it("rejects empty / wrong length / special chars", () => {
    expect(isValidJBKJS("")).toBe(false);
    expect(isValidJBKJS(null)).toBe(false);
    expect(isValidJBKJS("123")).toBe(false);
    expect(isValidJBKJS("12345678901")).toBe(false);
    expect(isValidJBKJS("ABC-1")).toBe(false);
  });
});

describe("isValidMaticniBroj", () => {
  it("accepts 8 digits", () => {
    expect(isValidMaticniBroj("12345678")).toBe(true);
    expect(isValidMaticniBroj("00000001")).toBe(true);
  });
  it("rejects everything else", () => {
    expect(isValidMaticniBroj("")).toBe(false);
    expect(isValidMaticniBroj("1234567")).toBe(false);
    expect(isValidMaticniBroj("123456789")).toBe(false);
    expect(isValidMaticniBroj("1234567a")).toBe(false);
  });
});

describe("isValidBankAccount", () => {
  it("accepts XXX-NNN…N-NN format", () => {
    expect(isValidBankAccount("160-0000000000000-78")).toBe(true);
    expect(isValidBankAccount("265-1234567-01")).toBe(true);
    expect(isValidBankAccount("160-1-99")).toBe(true);
  });
  it("rejects malformed", () => {
    expect(isValidBankAccount("")).toBe(false);
    expect(isValidBankAccount("16000000000000000078")).toBe(false);
    expect(isValidBankAccount("160-abc-78")).toBe(false);
    expect(isValidBankAccount("160-1-")).toBe(false);
  });
});

describe("normalisePIB", () => {
  it("strips spaces/dashes from valid PIBs", () => {
    expect(normalisePIB("100 002 887")).toBe("100002887");
    expect(normalisePIB("100-002-887")).toBe("100002887");
  });
  it("returns null for invalid", () => {
    expect(normalisePIB("100002888")).toBeNull();
    expect(normalisePIB(null)).toBeNull();
  });
});

describe("formatBankAccount", () => {
  it("formats raw digits into XXX-N…N-NN", () => {
    // 18 digits input: 3 (bank) + 13 (account) + 2 (control)
    expect(formatBankAccount("160000000000000078")).toBe("160-0000000000000-78");
  });
  it("returns null for invalid lengths", () => {
    expect(formatBankAccount(null)).toBeNull();
    expect(formatBankAccount("abc")).toBeNull();
    expect(formatBankAccount("2651234567")).toBeNull(); // too short
  });
});

import { describe, it, expect } from "vitest";
import { buildIpsPaymentString, buildMod97Reference } from "./ips-qr";

describe("buildIpsPaymentString", () => {
  it("renders the K:V pipe-terminated NBS IPS payload for a known invoice", () => {
    const out = buildIpsPaymentString({
      recipientName: "Demo Studio DOO",
      recipientAccount: "160-0000000000000-78",
      amount: 10000.5,
      paymentDescription: "Faktura FAK-2026-000001",
      paymentCode: "221",
      modelAndReference: "97 04-20260001",
    });

    // Snapshot of NBS IPS string per spec
    expect(out).toBe(
      "K:PR|V:01|C:1|R:160000000000000078|N:Demo Studio DOO|I:RSD10000,50|SF:221|S:Faktura FAK-2026-000001|RO:97 04-20260001|",
    );
  });

  it("ends with the pipe terminator", () => {
    const out = buildIpsPaymentString({
      recipientName: "X",
      recipientAccount: "160-0-78",
      amount: 1,
    });
    expect(out.endsWith("|")).toBe(true);
  });

  it("flattens dashes in the recipient account", () => {
    const out = buildIpsPaymentString({
      recipientName: "X",
      recipientAccount: "265-1234567-01",
      amount: 100,
    });
    expect(out).toContain("R:265123456701");
  });

  it("formats amount with comma decimal and 2 dp", () => {
    const out = buildIpsPaymentString({
      recipientName: "X",
      recipientAccount: "160-1-78",
      amount: 1500,
    });
    expect(out).toContain("I:RSD1500,00");
  });

  it("uses configurable currency", () => {
    const out = buildIpsPaymentString({
      recipientName: "X",
      recipientAccount: "160-1-78",
      amount: 50,
      currency: "EUR",
    });
    expect(out).toContain("I:EUR50,00");
  });

  it("sanitizes forbidden | and : characters and collapses whitespace", () => {
    const out = buildIpsPaymentString({
      recipientName: "Bad|Name:Inc\n",
      recipientAccount: "160-1-78",
      amount: 1,
    });
    // Field should not contain pipe/colon from the input
    const nField = out.split("|").find((p) => p.startsWith("N:"));
    expect(nField).toBeDefined();
    expect(nField).toBe("N:Bad Name Inc");
  });

  it("omits optional fields when not provided", () => {
    const out = buildIpsPaymentString({
      recipientName: "X",
      recipientAccount: "160-1-78",
      amount: 1,
    });
    expect(out).not.toContain("SF:");
    expect(out).not.toContain("S:");
    expect(out).not.toContain("RO:");
    expect(out).not.toContain("P:");
  });

  it("handles empty optional strings (empty paymentDescription is treated as falsy and omitted)", () => {
    const out = buildIpsPaymentString({
      recipientName: "X",
      recipientAccount: "160-1-78",
      amount: 1,
      paymentDescription: "",
      payerName: "",
    });
    expect(out).not.toContain("|S:");
    expect(out).not.toContain("|P:");
  });
});

describe("buildMod97Reference", () => {
  it("computes the expected mod97 control digit for INVOICE-2026-0001", () => {
    // Implementation strips non-digits, leaving "20260001", then computes
    // mod-97 control over "2026000100". 2026000100 % 97 = 94, control = (98-94)%97 = 4.
    expect(buildMod97Reference("INVOICE-2026-0001")).toBe("97 04-20260001");
  });

  it("handles numeric-only invoice numbers", () => {
    const r = buildMod97Reference("12345");
    expect(r).toMatch(/^97 \d{2}-12345$/);
  });

  it("falls back to '0' digits when input has no digits at all", () => {
    // digits => "" || "0" => "0"; "000" % 97 = 0; control = 98 % 97 = 1
    expect(buildMod97Reference("ABCDEF")).toBe("97 01-0");
  });

  it("handles empty string (no digits → fallback)", () => {
    expect(buildMod97Reference("")).toBe("97 01-0");
  });

  it("truncates digits beyond 18 characters", () => {
    const r = buildMod97Reference("1234567890123456789012345");
    expect(r).toMatch(/^97 \d{2}-\d{18}$/);
  });
});

import { describe, it, expect } from "vitest";
import { parseBankCsv } from "./bank-csv";

describe("parseBankCsv: generic_csv", () => {
  it("parses a minimal date+amount CSV with reference column", () => {
    const csv = [
      "date,amount,reference,description",
      "2026-01-15,1500.50,12345-67890,Test payment",
      "2026-01-16,250.00,99-00,Another payment",
    ].join("\n");

    const rows = parseBankCsv(csv, "generic_csv");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      txn_date: "2026-01-15",
      currency: "RSD",
      reference: "12345-67890",
      description: "Test payment",
    });
  });

  it("supports DD.MM.YYYY date format", () => {
    const csv = [
      "datum,iznos,poziv",
      "15.01.2026,1.500,50,12345-67890",
    ].join("\n");

    const rows = parseBankCsv(csv, "generic_csv");
    expect(rows).toHaveLength(1);
    expect(rows[0].txn_date).toBe("2026-01-15");
    // SR-locale amount "1.500,50" -> 1500.5
    expect(rows[0].amount).toBe(1500.5);
    expect(rows[0].reference).toBe("12345-67890");
  });

  it("returns empty array if header lacks required columns", () => {
    const csv = "foo,bar\nvalue,value";
    expect(parseBankCsv(csv, "generic_csv")).toEqual([]);
  });
});

describe("parseBankCsv: intesa_csv", () => {
  it("parses Intesa-style export with uplata/isplata columns", () => {
    const csv = [
      "Datum;Uplata;Isplata;Poziv na broj;Svrha;Naziv nalogodavca;Racun nalogodavca",
      "15.01.2026;1.500,50;0,00;12345-67890;Faktura 1;ACME DOO;160-12345-78",
      "16.01.2026;250,00;0,00;99-00;Faktura 2;Beta DOO;205-555-11",
    ].join("\n");

    const rows = parseBankCsv(csv, "intesa_csv");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      txn_date: "2026-01-15",
      amount: 1500.5,
      currency: "RSD",
      reference: "12345-67890",
      description: "Faktura 1",
      counterparty_name: "ACME DOO",
      counterparty_account: "160-12345-78",
    });
  });

  it("skips outflows (uplata=0, isplata>0)", () => {
    const csv = [
      "Datum;Uplata;Isplata;Poziv na broj",
      "15.01.2026;1.500,50;0,00;REF-IN",
      "16.01.2026;0,00;500,00;REF-OUT",
      "17.01.2026;100,00;0,00;REF-IN-2",
    ].join("\n");

    const rows = parseBankCsv(csv, "intesa_csv");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.reference)).toEqual(["REF-IN", "REF-IN-2"]);
  });
});

describe("parseBankCsv: nlb_csv", () => {
  it("parses NLB-style export", () => {
    const csv = [
      "Datum;Uplata;Isplata;Poziv na broj;Svrha",
      "01.02.2026;5.000,00;0,00;2026-001;Plaćanje fakture",
      "02.02.2026;2.345,67;0,00;2026-002;Drugo plaćanje",
    ].join("\n");

    const rows = parseBankCsv(csv, "nlb_csv");
    expect(rows).toHaveLength(2);
    expect(rows[0].amount).toBe(5000);
    expect(rows[1].amount).toBe(2345.67);
    expect(rows[0].reference).toBe("2026-001");
  });
});

describe("parseBankCsv: raiffeisen_csv", () => {
  it("parses Raiffeisen-style export with single iznos column (positives only)", () => {
    const csv = [
      "Datum;Iznos;Poziv na broj;Opis",
      "10.03.2026;750,00;RAI-001;Faktura A",
      "11.03.2026;1.200,00;RAI-002;Faktura B",
    ].join("\n");

    const rows = parseBankCsv(csv, "raiffeisen_csv");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      txn_date: "2026-03-10",
      amount: 750,
      reference: "RAI-001",
      description: "Faktura A",
    });
  });

  it("skips negative iznos (outflow)", () => {
    const csv = [
      "Datum;Iznos;Poziv na broj",
      "10.03.2026;750,00;RAI-IN",
      "11.03.2026;-200,00;RAI-OUT",
      "12.03.2026;100,00;RAI-IN-2",
    ].join("\n");

    const rows = parseBankCsv(csv, "raiffeisen_csv");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.reference)).toEqual(["RAI-IN", "RAI-IN-2"]);
  });
});

describe("parseBankCsv: otp_csv", () => {
  it("parses OTP-style export", () => {
    const csv = [
      "Datum;Uplata;Isplata;Poziv na broj;Naziv nalogodavca",
      "20.04.2026;3.333,33;0,00;OTP-1;Klijent A",
      "21.04.2026;4.444,44;0,00;OTP-2;Klijent B",
    ].join("\n");

    const rows = parseBankCsv(csv, "otp_csv");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      txn_date: "2026-04-20",
      amount: 3333.33,
      reference: "OTP-1",
      counterparty_name: "Klijent A",
    });
  });

  it("reads 'poziv na broj' reference column reliably", () => {
    const csv = [
      "Datum;Uplata;Isplata;Poziv na broj",
      "20.04.2026;100,00;0,00;REF-XYZ-123",
    ].join("\n");

    const rows = parseBankCsv(csv, "otp_csv");
    expect(rows[0].reference).toBe("REF-XYZ-123");
  });
});

describe("parseBankCsv: adversarial inputs", () => {
  it("skips a malformed row in the middle of the file but still parses the surrounding rows", () => {
    const csv = [
      "Datum;Uplata;Isplata;Poziv na broj",
      "15.01.2026;1.500,50;0,00;REF-GOOD-1",
      "BOGUS-DATE;abc;xyz;REF-BAD",
      "17.01.2026;2.000,00;0,00;REF-GOOD-2",
    ].join("\n");

    const rows = parseBankCsv(csv, "intesa_csv");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.reference)).toEqual(["REF-GOOD-1", "REF-GOOD-2"]);
  });

  it("returns [] for empty input", () => {
    expect(parseBankCsv("", "intesa_csv")).toEqual([]);
    expect(parseBankCsv("", "generic_csv")).toEqual([]);
  });

  it("returns [] for header-only input", () => {
    expect(parseBankCsv("Datum;Uplata;Isplata", "intesa_csv")).toEqual([]);
  });

  it("handles CRLF line endings", () => {
    const csv =
      "Datum;Uplata;Isplata;Poziv na broj\r\n" +
      "15.01.2026;1.500,50;0,00;REF-CRLF\r\n";
    const rows = parseBankCsv(csv, "intesa_csv");
    expect(rows).toHaveLength(1);
    expect(rows[0].reference).toBe("REF-CRLF");
  });

  it("ignores zero-amount rows (totals/empty lines)", () => {
    const csv = [
      "Datum;Uplata;Isplata;Poziv na broj",
      "15.01.2026;1.500,50;0,00;REF-1",
      "16.01.2026;0,00;0,00;TOTALS-LINE",
    ].join("\n");

    const rows = parseBankCsv(csv, "intesa_csv");
    expect(rows).toHaveLength(1);
    expect(rows[0].reference).toBe("REF-1");
  });
});

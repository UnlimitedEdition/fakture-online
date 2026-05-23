// Pre-flight validation of a SefInvoiceInput before XML generation.
// Catches obvious errors locally (faster + clearer than SEF's Schematron output).

import type { SefInvoiceInput } from "./types";
import { isValidPIB, isValidJBKJS, isValidMaticniBroj, isValidBankAccount } from "./pib";
import { TAX_CATEGORIES, isPercentValidForCategory } from "./tax-categories";
import { isValidExemptionCode } from "./exemption-reasons";
import { round2, validateTotals } from "./rounding";

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UNIT_CODES = new Set([
  "H87", // piece
  "HUR", // hour
  "DAY", // day
  "MON", // month
  "ANN", // year
  "KGM", // kilogram
  "GRM", // gram
  "TNE", // tonne
  "MTR", // metre
  "MTK", // m²
  "MTQ", // m³
  "LTR", // litre
  "MLT", // millilitre
  "KMT", // kilometre
  "KWH", // kWh
  "XPP", // package
  "BX",  // box
  "PR",  // pair
  "SET", // set
  "C62", // one (dimensionless)
]);

export function validateInvoiceInput(input: SefInvoiceInput): ValidationResult {
  const issues: ValidationIssue[] = [];

  // ----- basic header -----
  if (!input.invoiceNumber || !input.invoiceNumber.trim()) {
    issues.push({ field: "invoiceNumber", message: "Broj fakture je obavezan." });
  } else if (!/\d{4}/.test(input.invoiceNumber)) {
    issues.push({
      field: "invoiceNumber",
      message: "Broj fakture mora sadržati godinu (npr. FAK-2026-000123) — SEF tretira broj kao globalno jedinstven.",
    });
  }

  if (!ISO_DATE.test(input.issueDate)) {
    issues.push({ field: "issueDate", message: "Datum izdavanja mora biti u formatu YYYY-MM-DD." });
  } else {
    const today = new Date().toISOString().slice(0, 10);
    if (input.issueDate !== today && input.documentType !== "credit_note") {
      // SEF rejects back-dated invoices on send. Credit notes can reference older dates.
      issues.push({
        field: "issueDate",
        message: `Datum izdavanja mora biti današnji (${today}). SEF odbija back-dated fakture.`,
      });
    }
  }

  if (input.dueDate && !ISO_DATE.test(input.dueDate)) {
    issues.push({ field: "dueDate", message: "Datum dospeća mora biti YYYY-MM-DD." });
  }

  if (!input.currencyCode || input.currencyCode.length !== 3) {
    issues.push({ field: "currencyCode", message: "Valuta mora biti 3-slovni ISO kod (RSD/EUR/USD)." });
  }
  if (input.currencyCode && input.currencyCode !== "RSD" && !input.exchangeRate) {
    issues.push({
      field: "exchangeRate",
      message: "Kurs je obavezan za fakture u stranoj valuti.",
    });
  }

  // ----- supplier -----
  if (!input.supplier.registrationName?.trim()) {
    issues.push({ field: "supplier.registrationName", message: "Naziv firme izdavaoca je obavezan." });
  }
  if (!isValidPIB(input.supplier.pib)) {
    issues.push({ field: "supplier.pib", message: "PIB izdavaoca nije validan (9 cifara, kontrolna cifra po ISO 7064 MOD 11,10)." });
  }
  if (!isValidMaticniBroj(input.supplier.maticniBroj)) {
    issues.push({ field: "supplier.maticniBroj", message: "Matični broj izdavaoca mora biti 8 cifara." });
  }
  if (!input.supplier.streetName?.trim()) {
    issues.push({ field: "supplier.streetName", message: "Adresa izdavaoca je obavezna." });
  }
  if (!input.supplier.cityName?.trim()) {
    issues.push({ field: "supplier.cityName", message: "Grad izdavaoca je obavezan." });
  }
  if (!input.supplier.postalZone?.trim()) {
    issues.push({ field: "supplier.postalZone", message: "Poštanski broj izdavaoca je obavezan." });
  }
  if (!isValidBankAccount(input.supplier.bankAccount)) {
    issues.push({
      field: "supplier.bankAccount",
      message: "Tekući račun izdavaoca mora biti u formatu XXX-XXXXXXXXXXXXX-XX.",
    });
  }
  if (input.supplier.isBudgetUser && !isValidJBKJS(input.supplier.jbkjs)) {
    issues.push({ field: "supplier.jbkjs", message: "JBKJS izdavaoca nije validan." });
  }

  // ----- customer -----
  if (!input.customer.registrationName?.trim()) {
    issues.push({ field: "customer.registrationName", message: "Naziv klijenta je obavezan." });
  }
  if (!input.customer.isForeign) {
    if (!isValidPIB(input.customer.pib)) {
      issues.push({ field: "customer.pib", message: "PIB klijenta nije validan." });
    }
    if (!isValidMaticniBroj(input.customer.maticniBroj)) {
      issues.push({ field: "customer.maticniBroj", message: "Matični broj klijenta mora biti 8 cifara." });
    }
    if (input.customer.isBudgetUser && !isValidJBKJS(input.customer.jbkjs)) {
      issues.push({ field: "customer.jbkjs", message: "JBKJS klijenta nije validan." });
    }
    if (input.customer.isBudgetUser && !input.orderReferenceId && !input.contractReferenceId) {
      issues.push({
        field: "orderReferenceId",
        message: "Za budžetske korisnike obavezan je broj porudžbine ili broj ugovora.",
      });
    }
  } else if (!input.customer.countryCode || input.customer.countryCode === "RS") {
    issues.push({
      field: "customer.countryCode",
      message: "Strani klijent mora imati ISO kod države koji nije RS.",
    });
  }

  // ----- lines -----
  if (!input.lines || input.lines.length === 0) {
    issues.push({ field: "lines", message: "Faktura mora imati bar jednu stavku." });
  } else {
    input.lines.forEach((line, idx) => {
      const prefix = `lines[${idx}]`;
      if (!line.id) issues.push({ field: `${prefix}.id`, message: "ID stavke je obavezan." });
      if (!line.description?.trim()) {
        issues.push({ field: `${prefix}.description`, message: "Opis stavke je obavezan." });
      }
      if (!UNIT_CODES.has(line.unitCode)) {
        issues.push({
          field: `${prefix}.unitCode`,
          message: `Nepoznata jedinica mere '${line.unitCode}'. Koristite UN/ECE Rec.20 kod (npr. H87, HUR, KGM).`,
        });
      }
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        issues.push({ field: `${prefix}.quantity`, message: "Količina mora biti veća od 0." });
      }
      if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
        issues.push({ field: `${prefix}.unitPrice`, message: "Jedinična cena ne sme biti negativna." });
      }
      const expectedLineExt = round2(
        line.quantity * line.unitPrice - (line.allowance && !line.allowance.chargeIndicator ? line.allowance.amount : 0),
      );
      if (Math.abs(round2(line.lineExtensionAmount) - expectedLineExt) > 0.01) {
        issues.push({
          field: `${prefix}.lineExtensionAmount`,
          message: `Iznos stavke (${line.lineExtensionAmount}) ne odgovara qty × cena − rabat (${expectedLineExt}).`,
        });
      }
      if (!TAX_CATEGORIES[line.taxCategory]) {
        issues.push({ field: `${prefix}.taxCategory`, message: `Nepoznata PDV kategorija '${line.taxCategory}'.` });
      } else {
        if (!isPercentValidForCategory(line.taxCategory, line.taxPercent)) {
          issues.push({
            field: `${prefix}.taxPercent`,
            message: `PDV ${line.taxPercent}% nije dozvoljen za kategoriju ${line.taxCategory}.`,
          });
        }
        if (TAX_CATEGORIES[line.taxCategory].requiresExemptionReason) {
          if (!line.exemptionReasonCode) {
            issues.push({
              field: `${prefix}.exemptionReasonCode`,
              message: `Kategorija ${line.taxCategory} zahteva razlog oslobođenja (PDV-RS kod).`,
            });
          } else if (!isValidExemptionCode(line.exemptionReasonCode)) {
            issues.push({
              field: `${prefix}.exemptionReasonCode`,
              message: `Razlog oslobođenja '${line.exemptionReasonCode}' nije iz važećeg Pravilnika.`,
            });
          }
        }
      }
    });
  }

  // ----- advance / credit / debit references -----
  if (input.documentType === "credit_note" || input.documentType === "debit_note") {
    if (!input.billingReference?.invoiceNumber) {
      issues.push({
        field: "billingReference",
        message: "Knjižno odobrenje / zaduženje mora referencirati originalnu fakturu (BillingReference).",
      });
    }
  }
  if (input.documentType === "advance") {
    if (input.lines.length !== 1) {
      issues.push({
        field: "lines",
        message: "Avansna faktura mora imati tačno 1 stavku (qty=1, unit=kom).",
      });
    } else {
      const ln = input.lines[0];
      if (ln.quantity !== 1) {
        issues.push({ field: "lines[0].quantity", message: "Avans: količina mora biti 1." });
      }
      if (ln.unitCode !== "H87" && ln.unitCode !== "C62") {
        issues.push({ field: "lines[0].unitCode", message: "Avans: jedinica mora biti H87 (komad)." });
      }
    }
  }
  if (input.prepayment && input.documentType !== "invoice") {
    issues.push({
      field: "prepayment",
      message: "Prepayment (konzumacija avansa) je dozvoljena samo na finalnoj fakturi (tip 380).",
    });
  }

  // ----- totals math (only when lines pass earlier validation) -----
  if (input.lines.length > 0 && issues.filter((i) => i.field.startsWith("lines[")).length === 0) {
    const lineExt = round2(input.lines.reduce((s, l) => s + round2(l.lineExtensionAmount), 0));
    const totalsByRate = new Map<string, number>();
    for (const l of input.lines) {
      const key = `${l.taxCategory}@${l.taxPercent}`;
      const subtotal = totalsByRate.get(key) ?? 0;
      totalsByRate.set(key, round2(subtotal + round2(l.lineExtensionAmount)));
    }
    let totalTax = 0;
    for (const [key, taxable] of totalsByRate) {
      const rate = Number(key.split("@")[1]);
      totalTax = round2(totalTax + round2((taxable * rate) / 100));
    }
    const taxInclusive = round2(lineExt + totalTax);
    const prepaid = round2(input.prepayment?.amount ?? 0);
    const rounding = round2(input.payableRoundingAmount ?? 0);
    const payable = round2(taxInclusive - prepaid + rounding);

    const totalsErrors = validateTotals({
      lineExtensionAmount: lineExt,
      taxExclusiveAmount: lineExt,
      taxInclusiveAmount: taxInclusive,
      totalTaxAmount: totalTax,
      prepaidAmount: prepaid,
      payableRoundingAmount: rounding,
      payableAmount: payable,
    });
    for (const e of totalsErrors) {
      issues.push({ field: "totals", message: e });
    }
  }

  return { ok: issues.length === 0, issues };
}

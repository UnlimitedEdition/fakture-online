// Top-level UBL XML build dispatcher.

import { buildInvoiceXml } from "./invoice";
import { buildCreditNoteXml } from "./credit-note";
import { buildAdvanceXml } from "./advance";
import type { SefInvoiceInput } from "../types";

export function buildSefXml(input: SefInvoiceInput): string {
  switch (input.documentType) {
    case "invoice":
    case "debit_note":
    case "corrective":
      return buildInvoiceXml(input);
    case "credit_note":
      return buildCreditNoteXml(input);
    case "advance":
      return buildAdvanceXml(input);
    default: {
      const _exhaustive: never = input.documentType;
      throw new Error(`Unhandled SEF documentType: ${String(_exhaustive)}`);
    }
  }
}

export { buildInvoiceXml, buildCreditNoteXml, buildAdvanceXml };

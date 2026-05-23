import { el, elText } from "../builder-base";

export function buildPaymentMeans(args: {
  code?: string;             // UNCL4461 — default "30" (credit transfer)
  paymentId?: string;        // poziv-na-broj, e.g. "(mod97) 000123/2025"
  bankAccount?: string;      // domaći račun or IBAN
}): string {
  return el(
    "cac:PaymentMeans",
    null,
    elText("cbc:PaymentMeansCode", args.code ?? "30"),
    elText("cbc:PaymentID", args.paymentId),
    args.bankAccount
      ? el(
          "cac:PayeeFinancialAccount",
          null,
          elText("cbc:ID", args.bankAccount),
        )
      : "",
  );
}

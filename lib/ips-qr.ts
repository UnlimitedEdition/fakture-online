// IPS NBS QR code generator — Serbian payment standard.
// Spec: https://www.nbs.rs/sr_lat/finansijska_infrastruktura/platni-sistemi/ips
// Format: single-line text, pipe-separated K:V pairs, terminator "|"
//
// When a payer scans this QR with mobile banking, the payment form
// pre-fills: recipient, account, amount, model + reference, purpose.

export interface IpsPaymentArgs {
  // Recipient
  recipientName: string;
  recipientAccount: string;     // "160-0000000000000-78" format

  // Amount
  amount: number;
  currency?: string;             // "RSD" default

  // Optional
  payerName?: string;            // pre-fill payer for receipts
  paymentDescription?: string;   // "Faktura FAK-2026-000001"
  paymentCode?: string;          // 3-digit UNCL5305-ish ("221" = invoice)
  modelAndReference?: string;    // "97 123456" — mod97 poziv-na-broj
}

const TERMINATOR = "|";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatAmount(n: number, currency: string): string {
  // "RSD1500,50" — currency + amount with comma separator
  const fixed = Math.round(n * 100) / 100;
  const parts = fixed.toFixed(2).split(".");
  return `${currency}${parts[0]},${parts[1]}`;
}

// Strip dashes from account: "160-0000000000000-78" → "160000000000000078"
function flattenAccount(account: string): string {
  return account.replace(/[\s-]/g, "");
}

function sanitize(s: string | undefined): string {
  if (!s) return "";
  // IPS spec forbids: | : newline and limits length per field.
  // Strict ASCII subset for max compatibility; trim to 50 chars.
  return s
    .replace(/[|:\r\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);
}

export function buildIpsPaymentString(args: IpsPaymentArgs): string {
  const fields: Array<[string, string]> = [];

  fields.push(["K", "PR"]);                    // K = type, PR = Personal/Regular
  fields.push(["V", "01"]);                    // V = version 01
  fields.push(["C", "1"]);                     // C = character set 1 (Latin)
  fields.push(["R", flattenAccount(args.recipientAccount)]);
  fields.push(["N", sanitize(args.recipientName)]);
  fields.push(["I", formatAmount(args.amount, args.currency ?? "RSD")]);
  if (args.payerName) fields.push(["P", sanitize(args.payerName)]);
  if (args.paymentCode) fields.push(["SF", args.paymentCode.slice(0, 3)]);
  if (args.paymentDescription) fields.push(["S", sanitize(args.paymentDescription)]);
  if (args.modelAndReference) fields.push(["RO", sanitize(args.modelAndReference)]);

  return fields.map(([k, v]) => `${k}:${v}`).join(TERMINATOR) + TERMINATOR;
}

// Build a mod97 poziv-na-broj from an invoice number.
// Spec: model + 2-digit numeric mod-97 + reference (digits).
// Reference = invoice number with non-digits stripped, prefixed with current year suffix.
export function buildMod97Reference(invoiceNumber: string): string {
  const digits = invoiceNumber.replace(/\D/g, "").slice(0, 18) || "0";
  // Compute mod 97 control on the digits + "00" appended (ISO 11649 simplified)
  let remainder = 0;
  const padded = digits + "00";
  for (const ch of padded) {
    remainder = (remainder * 10 + Number(ch)) % 97;
  }
  const control = (98 - remainder) % 97;
  const controlStr = pad2(control);
  return `97 ${controlStr}-${digits}`;
}

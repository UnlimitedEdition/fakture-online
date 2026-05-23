// Serbian PIB (Poreski Identifikacioni Broj) validation.
// Algorithm: ISO 7064 MOD 11,10 over the first 8 digits, control digit at position 9.
// JBKJS (Jedinstveni Broj Korisnika Javnih Sredstava) validation: currently 5-digit
// numeric; migrates to alphanumeric by 1 April 2026. We accept both.

const PIB_REGEX = /^\d{9}$/;
const JBKJS_LEGACY_REGEX = /^\d{5}$/;
const JBKJS_FUTURE_REGEX = /^[A-Z0-9]{5,10}$/;

export function isValidPIB(pib: string | null | undefined): boolean {
  if (!pib) return false;
  const trimmed = pib.trim();
  if (!PIB_REGEX.test(trimmed)) return false;

  let p = 10;
  for (let i = 0; i < 8; i++) {
    let s = (Number(trimmed[i]) + p) % 10;
    if (s === 0) s = 10;
    p = (s * 2) % 11;
  }
  const check = (11 - p) % 10;
  return check === Number(trimmed[8]);
}

export function isValidJBKJS(jbkjs: string | null | undefined): boolean {
  if (!jbkjs) return false;
  const trimmed = jbkjs.trim().toUpperCase();
  return JBKJS_LEGACY_REGEX.test(trimmed) || JBKJS_FUTURE_REGEX.test(trimmed);
}

// Serbian Matični broj is 8 digits, no published checksum — accept any 8-digit string.
export function isValidMaticniBroj(mb: string | null | undefined): boolean {
  if (!mb) return false;
  return /^\d{8}$/.test(mb.trim());
}

// Domaći bankovni račun: 3-13-2 grouping ("160-0000000000000-78").
const BANK_ACCOUNT_REGEX = /^\d{3}-\d{1,13}-\d{2}$/;

export function isValidBankAccount(account: string | null | undefined): boolean {
  if (!account) return false;
  return BANK_ACCOUNT_REGEX.test(account.trim());
}

// Normalise PIB input (strip spaces/dashes), return null if invalid.
export function normalisePIB(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = String(input).replace(/[\s-]/g, "");
  return isValidPIB(cleaned) ? cleaned : null;
}

export function formatBankAccount(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = String(input).replace(/[\s-]/g, "");
  if (!/^\d{16,18}$/.test(digits)) return null;
  // bank(3) + account(rest-2) + control(2)
  const bank = digits.slice(0, 3);
  const control = digits.slice(-2);
  const account = digits.slice(3, -2);
  return `${bank}-${account}-${control}`;
}

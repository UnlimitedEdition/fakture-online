// Bank CSV parsers for Serbian banks. Each parser takes raw CSV text and
// returns normalized transaction rows. Format detection is heuristic — user
// picks the format in UI as backup.

export interface ParsedTransaction {
  txn_date: string;             // YYYY-MM-DD
  amount: number;               // positive = inflow, negative = outflow
  currency: string;             // "RSD" default
  reference: string | null;     // poziv na broj
  description: string | null;
  counterparty_name: string | null;
  counterparty_account: string | null;
  raw_row: Record<string, string>;
}

export type BankFormat =
  | "generic_csv"
  | "intesa_csv"
  | "nlb_csv"
  | "raiffeisen_csv"
  | "otp_csv"
  | "procredit_csv"
  | "aik_csv"
  | "mt940";

// Parse a CSV line respecting quoted values + semicolon OR comma delimiter
function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function detectDelimiter(headerLine: string): string {
  const semis = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semis >= commas ? ";" : ",";
}

// Date parsers — Serbian banks use various formats
function parseDate(s: string): string | null {
  if (!s) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD.MM.YYYY
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // DD/MM/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

function parseAmount(s: string): number {
  if (!s) return 0;
  // SR locale: "1.500,50" → 1500.50; or "1500.50"
  const cleaned = s.replace(/\s/g, "").replace(/\./g, "X").replace(/,/g, ".").replace(/X/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Generic 3-column CSV: date, amount, reference
function parseGeneric(text: string): ParsedTransaction[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delim = detectDelimiter(lines[0]);
  const header = parseCsvLine(lines[0], delim).map((h) => h.toLowerCase());

  const dateIdx = header.findIndex((h) => /date|datum/i.test(h));
  const amtIdx = header.findIndex((h) => /amount|iznos|uplata/i.test(h));
  const refIdx = header.findIndex((h) => /reference|poziv|sifra/i.test(h));
  const descIdx = header.findIndex((h) => /description|opis|svrha/i.test(h));
  const cpNameIdx = header.findIndex((h) => /counterparty|naziv|payer|nalog/i.test(h));
  const cpAcctIdx = header.findIndex((h) => /account|racun/i.test(h));

  if (dateIdx === -1 || amtIdx === -1) return [];

  const out: ParsedTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], delim);
    const date = parseDate(cells[dateIdx] ?? "");
    if (!date) continue;
    const amount = parseAmount(cells[amtIdx] ?? "0");
    out.push({
      txn_date: date,
      amount,
      currency: "RSD",
      reference: refIdx >= 0 ? (cells[refIdx] || null) : null,
      description: descIdx >= 0 ? (cells[descIdx] || null) : null,
      counterparty_name: cpNameIdx >= 0 ? (cells[cpNameIdx] || null) : null,
      counterparty_account: cpAcctIdx >= 0 ? (cells[cpAcctIdx] || null) : null,
      raw_row: Object.fromEntries(header.map((h, idx) => [h, cells[idx] || ""])),
    });
  }
  return out;
}

// All Serbian bank CSV exports follow similar shape; we map common Serbian
// column names to our normalized schema.
function parseSerbianBank(text: string): ParsedTransaction[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delim = detectDelimiter(lines[0]);
  const header = parseCsvLine(lines[0], delim).map((h) => h.toLowerCase().trim());

  // Find indexes by Serbian/English keyword
  const findIdx = (...keywords: RegExp[]) =>
    header.findIndex((h) => keywords.some((re) => re.test(h)));

  const dateIdx = findIdx(/^datum/, /value.?date/, /transaction.?date/);
  const amtInIdx = findIdx(/^uplata/, /credit/, /priliv/);
  const amtOutIdx = findIdx(/^isplata/, /debit/, /odliv/);
  const amtIdx = amtInIdx === -1 ? findIdx(/^iznos/, /amount/) : -1;
  const refIdx = findIdx(/^poziv.?na.?broj/, /^poziv/, /reference/, /^sifra/);
  const descIdx = findIdx(/^svrha/, /^opis/, /description/);
  const cpNameIdx = findIdx(/naziv.?nalogodavca/, /payer/, /counterparty/, /^primalac/);
  const cpAcctIdx = findIdx(/racun.?nalogodavca/, /^racun/, /account/);

  if (dateIdx === -1) return [];

  const out: ParsedTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], delim);
    const date = parseDate(cells[dateIdx] ?? "");
    if (!date) continue;

    let amount = 0;
    if (amtInIdx >= 0 && amtOutIdx >= 0) {
      const in_ = parseAmount(cells[amtInIdx] ?? "0");
      const out_ = parseAmount(cells[amtOutIdx] ?? "0");
      amount = in_ - out_;
    } else if (amtIdx >= 0) {
      amount = parseAmount(cells[amtIdx] ?? "0");
    }

    // Skip zero rows (totals lines, empty)
    if (amount === 0) continue;
    // We only care about inflows for invoice matching
    if (amount < 0) continue;

    out.push({
      txn_date: date,
      amount,
      currency: "RSD",
      reference: refIdx >= 0 ? (cells[refIdx]?.trim() || null) : null,
      description: descIdx >= 0 ? (cells[descIdx] || null) : null,
      counterparty_name: cpNameIdx >= 0 ? (cells[cpNameIdx] || null) : null,
      counterparty_account: cpAcctIdx >= 0 ? (cells[cpAcctIdx] || null) : null,
      raw_row: Object.fromEntries(header.map((h, idx) => [h, cells[idx] || ""])),
    });
  }
  return out;
}

export function parseBankCsv(text: string, format: BankFormat): ParsedTransaction[] {
  switch (format) {
    case "generic_csv":
      return parseGeneric(text);
    case "intesa_csv":
    case "nlb_csv":
    case "raiffeisen_csv":
    case "otp_csv":
    case "procredit_csv":
    case "aik_csv":
      return parseSerbianBank(text);
    case "mt940":
      // TODO: SWIFT MT940 parser — fall back to generic for now
      return parseGeneric(text);
    default:
      return [];
  }
}

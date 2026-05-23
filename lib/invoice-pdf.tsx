// Server-rendered PDF document for a single invoice.
//
// Uses @react-pdf/renderer (Node runtime, no headless Chrome). Layout mirrors
// the HTML invoice in app/(dashboard)/fakture/[id]/page.tsx but A4-sized.
//
// SR Latin diacritics (ž š č ć đ) require a font with Latin Extended-A —
// Helvetica's built-in PDF base font does NOT cover these. We bundle DejaVu
// Sans (Bitstream Vera derivative, Public Domain-ish) under /public/fonts:
// full Latin Extended + Cyrillic, ~1.4 MB total for regular+bold.
//
// Why bundled vs Google CDN: Google's gstatic URLs change versions (v30→v51),
// and CSS2 by default returns latin-only subsets. Local bundle = deterministic
// on Vercel cold start, no outbound dependency, no rate limits.
import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

// Resolve font paths relative to the project root. process.cwd() is the
// project root in both `next dev` and the Vercel serverless function — the
// /public folder is bundled as static files and accessible by path.
const fontsDir = path.join(process.cwd(), "public", "fonts");
const regularPath = path.join(fontsDir, "DejaVuSans.ttf");
const boldPath = path.join(fontsDir, "DejaVuSans-Bold.ttf");

// Pre-load font buffers once at module-load and convert to base64 data URIs.
// @react-pdf/font's `src` accepts either a path string (→ fontkit.open) or a
// data URI (→ in-memory decode). Vercel's serverless bundler doesn't always
// surface raw /public files as fs-readable paths in all deployment targets,
// so we inline the bytes — adds ~1.4 MB to the function payload, well under
// the 250 MB Vercel limit, and removes any filesystem-resolution surprises.
const regularDataUri =
  "data:font/ttf;base64," + fs.readFileSync(regularPath).toString("base64");
const boldDataUri =
  "data:font/ttf;base64," + fs.readFileSync(boldPath).toString("base64");

// Register DejaVuSans once per process. We expose it under the family name
// "Roboto" so the StyleSheet below reads naturally — but the actual font is
// DejaVu. Swap to a real Roboto TTF if we ever ship one in /public/fonts.
Font.register({
  family: "Roboto",
  fonts: [
    { src: regularDataUri, fontWeight: "normal" },
    { src: regularDataUri, fontWeight: "medium" },
    { src: boldDataUri, fontWeight: "bold" },
  ],
});

// Disable hyphenation — Serbian invoices read better with whole words.
Font.registerHyphenationCallback((word: string) => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9,
    color: "#1F2937",
    paddingTop: 36,
    paddingBottom: 36,
    paddingLeft: 40,
    paddingRight: 40,
    backgroundColor: "#ffffff",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    borderBottomStyle: "solid",
  },
  headerLeft: {
    flexDirection: "column",
    maxWidth: 260,
  },
  logo: {
    height: 48,
    maxWidth: 180,
    objectFit: "contain",
    marginBottom: 6,
  },
  companyName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0F766E",
    marginBottom: 2,
  },
  metaLine: {
    fontSize: 8.5,
    color: "#475569",
    marginBottom: 1,
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  faktureTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0F172A",
  },
  invoiceNumber: {
    fontSize: 12,
    color: "#0F766E",
    marginTop: 4,
    fontWeight: "medium",
  },
  dateBlock: {
    marginTop: 8,
  },
  dateLine: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 1,
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 7.5,
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  clientName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 2,
  },
  table: {
    marginTop: 4,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: "#E5E7EB",
    borderBottomStyle: "solid",
    paddingBottom: 6,
    marginBottom: 4,
  },
  th: {
    fontSize: 7.5,
    color: "#94A3B8",
    fontWeight: "medium",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
    borderBottomStyle: "solid",
    paddingTop: 6,
    paddingBottom: 6,
  },
  td: {
    fontSize: 9,
    color: "#1F2937",
  },
  // Column widths (sum = 100)
  colDesc: { width: "45%", paddingRight: 6 },
  colQty: { width: "10%", textAlign: "right", paddingHorizontal: 4 },
  colUnit: { width: "10%", textAlign: "center", paddingHorizontal: 4 },
  colPrice: { width: "17%", textAlign: "right", paddingHorizontal: 4 },
  colTotal: { width: "18%", textAlign: "right", paddingLeft: 4 },
  totalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  totalsBlock: {
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    fontSize: 9.5,
  },
  totalsRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#CBD5E1",
    borderTopStyle: "solid",
    fontSize: 12,
    fontWeight: "bold",
  },
  totalsLabel: { color: "#475569" },
  totalsValue: { color: "#0F172A" },
  totalsValueGrand: { color: "#0F766E" },
  notes: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    borderTopStyle: "solid",
  },
  noteText: {
    fontSize: 9,
    color: "#475569",
  },
  qrSection: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    borderTopStyle: "solid",
    flexDirection: "row",
    gap: 14,
  },
  qrImage: {
    width: 110,
    height: 110,
  },
  qrTextWrap: {
    flexDirection: "column",
    flex: 1,
  },
  qrTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 3,
  },
  qrBody: {
    fontSize: 8.5,
    color: "#475569",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 16,
    textAlign: "center",
    fontSize: 7.5,
    color: "#94A3B8",
  },
});

export type InvoicePdfClient = {
  company_name?: string | null;
  contact_name?: string | null;
  address?: string | null;
  city?: string | null;
  zip_code?: string | null;
  pib?: string | null;
};

export type InvoicePdfItem = {
  id: string;
  description: string | null;
  quantity: number | string | null;
  unit: string | null;
  unit_price: number | string | null;
  total: number | string | null;
};

export type InvoicePdfInvoice = {
  invoice_number: string;
  issue_date?: string | null;
  due_date?: string | null;
  subtotal?: number | string | null;
  tax_rate?: number | string | null;
  tax_amount?: number | string | null;
  total: number | string | null;
  currency?: string | null;
  status?: string | null;
  notes?: string | null;
  payment_method?: string | null;
};

export type InvoicePdfProfile = {
  company_name?: string | null;
  address?: string | null;
  city?: string | null;
  zip_code?: string | null;
  pib?: string | null;
  maticni_broj?: string | null;
  bank_account?: string | null;
};

export type InvoicePdfProps = {
  invoice: InvoicePdfInvoice;
  client: InvoicePdfClient | null;
  items: InvoicePdfItem[];
  profile: InvoicePdfProfile;
  logoUrl?: string | null;
  qrPngUrl?: string | null;
};

const formatNumber = (value: number | string | null | undefined): string => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  // sr-RS locale formatting: 1.234.567,89
  return n.toLocaleString("sr-RS", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatQty = (value: number | string | null | undefined): string => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  // Trim trailing zeros, keep up to 3 decimals
  return n.toLocaleString("sr-RS", { maximumFractionDigits: 3 });
};

export function InvoicePdf({
  invoice,
  client,
  items,
  profile,
  logoUrl,
  qrPngUrl,
}: InvoicePdfProps) {
  const currency = invoice.currency || "RSD";
  const taxRate = Number(invoice.tax_rate ?? 0);
  const showQr =
    !!qrPngUrl &&
    !!profile.bank_account &&
    invoice.status !== "paid" &&
    invoice.status !== "cancelled";

  return (
    <Document
      title={`Faktura ${invoice.invoice_number}`}
      author={profile.company_name ?? "FaktureOnline"}
      creator="FaktureOnline"
      producer="FaktureOnline"
      language="sr-Latn"
    >
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {logoUrl ? (
              <Image src={logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>
                {profile.company_name || "FaktureOnline"}
              </Text>
            )}
            {logoUrl && profile.company_name ? (
              <Text style={styles.companyName}>{profile.company_name}</Text>
            ) : null}
            {profile.address ? (
              <Text style={styles.metaLine}>{profile.address}</Text>
            ) : null}
            {profile.city ? (
              <Text style={styles.metaLine}>
                {profile.zip_code ? `${profile.zip_code} ` : ""}
                {profile.city}
              </Text>
            ) : null}
            {profile.pib ? (
              <Text style={styles.metaLine}>PIB: {profile.pib}</Text>
            ) : null}
            {profile.maticni_broj ? (
              <Text style={styles.metaLine}>MB: {profile.maticni_broj}</Text>
            ) : null}
            {profile.bank_account ? (
              <Text style={styles.metaLine}>Račun: {profile.bank_account}</Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.faktureTitle}>FAKTURA</Text>
            <Text style={styles.invoiceNumber}>
              br. {invoice.invoice_number}
            </Text>
            <View style={styles.dateBlock}>
              {invoice.issue_date ? (
                <Text style={styles.dateLine}>Datum: {invoice.issue_date}</Text>
              ) : null}
              {invoice.due_date ? (
                <Text style={styles.dateLine}>Rok: {invoice.due_date}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Client block */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Klijent</Text>
          <Text style={styles.clientName}>
            {client?.company_name ?? "—"}
          </Text>
          {client?.contact_name ? (
            <Text style={styles.metaLine}>{client.contact_name}</Text>
          ) : null}
          {client?.address ? (
            <Text style={styles.metaLine}>{client.address}</Text>
          ) : null}
          {client?.city ? (
            <Text style={styles.metaLine}>
              {client.zip_code ? `${client.zip_code} ` : ""}
              {client.city}
            </Text>
          ) : null}
          {client?.pib ? (
            <Text style={styles.metaLine}>PIB: {client.pib}</Text>
          ) : null}
        </View>

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.th, styles.colDesc]}>Opis</Text>
            <Text style={[styles.th, styles.colQty]}>Kol.</Text>
            <Text style={[styles.th, styles.colUnit]}>Jed.</Text>
            <Text style={[styles.th, styles.colPrice]}>Cena</Text>
            <Text style={[styles.th, styles.colTotal]}>Ukupno</Text>
          </View>
          {items.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, styles.colDesc]}>
                {item.description ?? ""}
              </Text>
              <Text style={[styles.td, styles.colQty]}>
                {formatQty(item.quantity)}
              </Text>
              <Text style={[styles.td, styles.colUnit]}>
                {item.unit ?? ""}
              </Text>
              <Text style={[styles.td, styles.colPrice]}>
                {formatNumber(item.unit_price)}
              </Text>
              <Text
                style={[
                  styles.td,
                  styles.colTotal,
                  { fontWeight: "medium" },
                ]}
              >
                {formatNumber(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsWrap}>
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Osnovica:</Text>
              <Text style={styles.totalsValue}>
                {formatNumber(invoice.subtotal)} {currency}
              </Text>
            </View>
            {taxRate > 0 ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>PDV ({taxRate}%):</Text>
                <Text style={styles.totalsValue}>
                  {formatNumber(invoice.tax_amount)} {currency}
                </Text>
              </View>
            ) : null}
            <View style={styles.totalsRowGrand}>
              <Text style={styles.totalsValue}>Ukupno:</Text>
              <Text style={styles.totalsValueGrand}>
                {formatNumber(invoice.total)} {currency}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes & payment method */}
        {invoice.notes ? (
          <View style={styles.notes}>
            <Text style={styles.sectionLabel}>Napomena</Text>
            <Text style={styles.noteText}>{invoice.notes}</Text>
          </View>
        ) : null}
        {invoice.payment_method ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionLabel}>Način plaćanja</Text>
            <Text style={styles.noteText}>{invoice.payment_method}</Text>
          </View>
        ) : null}

        {/* Payment instructions + IPS QR */}
        {showQr ? (
          <View style={styles.qrSection} wrap={false}>
            {/* qrPngUrl is non-null when showQr is true */}
            <Image src={qrPngUrl as string} style={styles.qrImage} />
            <View style={styles.qrTextWrap}>
              <Text style={styles.qrTitle}>IPS QR za plaćanje</Text>
              <Text style={styles.qrBody}>
                Skenirajte kod sa mobilnim bankarstvom — sve polja se
                automatski popunjavaju (primalac, račun, iznos, poziv na
                broj).
              </Text>
              <Text style={[styles.qrBody, { marginTop: 4 }]}>
                Primalac: {profile.company_name ?? ""}
              </Text>
              {profile.bank_account ? (
                <Text style={styles.qrBody}>
                  Račun: {profile.bank_account}
                </Text>
              ) : null}
              <Text style={styles.qrBody}>
                Iznos: {formatNumber(invoice.total)} {currency}
              </Text>
              <Text style={[styles.qrBody, { marginTop: 4, color: "#94A3B8" }]}>
                Standard: NBS IPS (sve banke u Srbiji)
              </Text>
            </View>
          </View>
        ) : null}

        {/* Footer with page numbers */}
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${profile.company_name ?? "FaktureOnline"} — Faktura ${
              invoice.invoice_number
            }   ·   strana ${pageNumber} / ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

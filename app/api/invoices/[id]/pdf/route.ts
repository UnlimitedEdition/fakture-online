// Server-rendered invoice PDF.
//
// Uses @react-pdf/renderer in the Node serverless runtime (NOT Edge — pdfkit
// + buffer streaming need Node APIs). The PDF mirrors the on-screen invoice
// in app/(dashboard)/fakture/[id]/page.tsx, with proper Serbian Latin font
// (Roboto) for diacritics (ž š č ć đ) — built-in Helvetica only covers
// MacRoman and would render those as boxes.
//
// All data is fetched through the user-scoped Supabase client; RLS is what
// keeps invoice owners isolated. No service-role key is used here.

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireUser } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { buildIpsPaymentString, buildMod97Reference } from "@/lib/ips-qr";
import { logAudit } from "@/lib/audit-log";
import { InvoicePdf } from "@/lib/invoice-pdf";
import { renderToBuffer } from "@react-pdf/renderer";

// Force Node runtime (default for App Router, but explicit for safety —
// react-pdf needs fs/stream/Buffer and is in Next's serverExternalPackages
// allowlist, which only applies under nodejs runtime).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return new NextResponse("invalid id", { status: 400 });
  }

  const { supabase, user } = await requireUser();

  // Fetch everything we need in parallel. RLS scopes invoices/items/clients
  // to the current user; profile is fetched via the auth-uid RPC.
  const [invoiceRes, itemsRes, profileRes] = await Promise.all([
    supabase
      .from("fo_invoices")
      .select("*, client:fo_clients(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("fo_invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order"),
    supabase.rpc("fo_get_profile"),
  ]);

  if (invoiceRes.error || !invoiceRes.data) {
    return new NextResponse("invoice not found", { status: 404 });
  }
  if (itemsRes.error || profileRes.error || !profileRes.data) {
    console.error("[invoice.pdf.dependencies]", {
      user_id: user.id,
      invoice_id: id,
      items_code: itemsRes.error?.code,
      profile_code: profileRes.error?.code,
    });
    return new NextResponse("failed to load invoice data", { status: 500 });
  }

  const invoice = invoiceRes.data as Record<string, unknown> & {
    invoice_number: string;
    client?: Record<string, unknown> | null;
  };
  const items = (itemsRes.data ?? []) as Array<{
    id: string;
    description: string | null;
    quantity: number | string | null;
    unit: string | null;
    unit_price: number | string | null;
    total: number | string | null;
  }>;
  const profile = profileRes.data as {
    company_name: string;
    address: string;
    city: string;
    zip_code: string;
    pib: string;
    maticni_broj: string;
    bank_account: string;
    logo_url: string;
  };

  // Logo: short-lived signed URL from Storage (5 min — enough for react-pdf
  // to fetch during render). Missing logo is fine — renders text-only header.
  let logoUrl: string | null = null;
  if (profile.logo_url) {
    const { data: signed } = await supabase.storage
      .from("logos")
      .createSignedUrl(profile.logo_url, 300);
    logoUrl = signed?.signedUrl ?? null;
  }

  // IPS QR: render directly to a PNG buffer instead of fetching our own
  // auth-walled /ips-qr.png route — avoids double round-trip and works in
  // the serverless function without re-authenticating to itself.
  let qrPngDataUri: string | null = null;
  if (
    profile.bank_account &&
    invoice.status !== "paid" &&
    invoice.status !== "cancelled"
  ) {
    try {
      const payload = buildIpsPaymentString({
        recipientName: profile.company_name,
        recipientAccount: profile.bank_account,
        amount: Number(invoice.total ?? 0),
        currency: (invoice.currency as string) || "RSD",
        paymentCode: "221",
        paymentDescription: `Faktura ${invoice.invoice_number}`,
        modelAndReference: buildMod97Reference(invoice.invoice_number),
      });
      const png = await QRCode.toBuffer(payload, {
        type: "png",
        errorCorrectionLevel: "M",
        width: 320,
        margin: 1,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      });
      // Pass as a data URI so react-pdf doesn't need to make an HTTP call
      // (which would require auth cookies for our own endpoint).
      qrPngDataUri = `data:image/png;base64,${png.toString("base64")}`;
    } catch (err) {
      // QR is non-essential; log and continue without it.
      console.error("[invoice.pdf.qr]", {
        invoice_id: id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Build the PDF
  const buffer = await renderToBuffer(
    InvoicePdf({
      invoice: {
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date as string | null,
        due_date: invoice.due_date as string | null,
        subtotal: invoice.subtotal as number | string | null,
        tax_rate: invoice.tax_rate as number | string | null,
        tax_amount: invoice.tax_amount as number | string | null,
        total: invoice.total as number | string | null,
        currency: invoice.currency as string | null,
        status: invoice.status as string | null,
        notes: invoice.notes as string | null,
        payment_method: invoice.payment_method as string | null,
      },
      client: (invoice.client ?? null) as Parameters<
        typeof InvoicePdf
      >[0]["client"],
      items,
      profile,
      logoUrl,
      qrPngUrl: qrPngDataUri,
    }),
  );

  // Audit: reuse "invoice.email_sent" action enum (PDF downloads aren't yet
  // in the enum — extending it would require a migration). Metadata
  // distinguishes the operation.
  await logAudit({
    action: "invoice.email_sent",
    resourceType: "invoice_pdf",
    resourceId: id,
    metadata: {
      operation: "pdf_download",
      invoice_number: invoice.invoice_number,
    },
  });

  // Safe filename: keep ASCII + dash/underscore, fall back to the UUID
  const safeNumber = invoice.invoice_number
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 80);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="faktura-${safeNumber}.pdf"`,
      "Cache-Control": "no-store",
      // Defense in depth — PDFs must never be embedded in another origin.
      "X-Content-Type-Options": "nosniff",
    },
  });
}

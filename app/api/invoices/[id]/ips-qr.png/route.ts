// Returns a PNG QR code for paying the invoice via NBS IPS.
// Used in invoice detail UI + embedded in PDF.

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireUser } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { buildIpsPaymentString, buildMod97Reference } from "@/lib/ips-qr";

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

  const [invoiceRes, profileRes] = await Promise.all([
    supabase
      .from("fo_invoices")
      .select("invoice_number, total, currency")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase.rpc("fo_get_profile"),
  ]);

  if (invoiceRes.error || !invoiceRes.data || profileRes.error || !profileRes.data) {
    return new NextResponse("invoice or profile not found", { status: 404 });
  }

  const inv = invoiceRes.data;
  const profile = profileRes.data as {
    company_name: string;
    bank_account: string;
  };

  if (!profile.bank_account) {
    return new NextResponse("seller bank account missing", { status: 400 });
  }

  const payload = buildIpsPaymentString({
    recipientName: profile.company_name,
    recipientAccount: profile.bank_account,
    amount: Number(inv.total),
    currency: inv.currency || "RSD",
    paymentCode: "221", // invoice
    paymentDescription: `Faktura ${inv.invoice_number}`,
    modelAndReference: buildMod97Reference(inv.invoice_number),
  });

  const png = await QRCode.toBuffer(payload, {
    type: "png",
    errorCorrectionLevel: "M",
    width: 320,
    margin: 1,
    color: { dark: "#0F172A", light: "#FFFFFF" },
  });

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=300",
    },
  });
}

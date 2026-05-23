import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

type KpoRow = {
  redni_broj: number;
  issue_date: string;
  invoice_number: string;
  client_name: string;
  client_pib: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
};

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const { supabase } = await requireUser();
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();

  const { data, error } = await supabase.rpc("fo_kpo_book", { p_year: year });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data as KpoRow[] | null) ?? [];
  const header = [
    "RB",
    "Datum izdavanja",
    "Broj fakture",
    "Klijent",
    "PIB klijenta",
    "Iznos",
    "Valuta",
    "Status",
    "Datum naplate",
  ];
  const lines = [header.join(";")];
  for (const r of rows) {
    lines.push(
      [
        r.redni_broj,
        r.issue_date,
        r.invoice_number,
        r.client_name,
        r.client_pib,
        Number(r.amount).toFixed(2),
        r.currency,
        r.status,
        r.paid_at ? r.paid_at.slice(0, 10) : "",
      ]
        .map(csvEscape)
        .join(";"),
    );
  }
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  lines.push(["", "", "", "", "UKUPNO", total.toFixed(2), "", "", ""].map(csvEscape).join(";"));

  await logAudit({
    action: "profile.updated",
    resourceType: "kpo_export",
    metadata: { year, rows: rows.length },
  });

  // BOM so Excel opens UTF-8 cyrillic correctly
  const body = "﻿" + lines.join("\r\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="KPO-knjiga-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

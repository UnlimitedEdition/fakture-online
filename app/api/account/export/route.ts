// GDPR Art. 20: data export endpoint. Returns a JSON file download.
// Rate-limited 1/day per user.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, user } = await requireUser();

  const rl = await checkRateLimit("email", `export:${user.id}`); // reuse email limiter
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Limit eksporta dostignut. Pokušajte sutra." },
      { status: 429 },
    );
  }

  const { data, error } = await supabase.rpc("fo_export_my_data");
  if (error || !data) {
    console.error("[api.account.export]", { user_id: user.id, code: error?.code });
    return NextResponse.json({ error: "Greška pri eksportu." }, { status: 500 });
  }

  await logAudit({
    action: "profile.updated",
    resourceType: "data_export",
    metadata: { format: "json" },
  });

  const filename = `fakture-online-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

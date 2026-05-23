import { requireUser } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InboxActions } from "./actions";

export default async function InboxDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const { supabase, user } = await requireUser();

  const { data: row, error } = await supabase
    .from("fo_sef_inbox")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !row) {
    if (error?.code !== "PGRST116") {
      console.error("[sef.inbox.detail]", { code: error?.code, message: error?.message });
    }
    notFound();
  }

  const ACTION_LABEL: Record<string, string> = {
    pending: "Čeka odluku",
    accepted: "Prihvaćena",
    rejected: "Odbijena",
  };
  const ACTION_COLOR: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    accepted: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-800">
              {row.invoice_number ?? "—"}
            </h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ACTION_COLOR[row.inbox_action]}`}>
              {ACTION_LABEL[row.inbox_action]}
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            Primljeno {new Date(row.fetched_at).toLocaleString("sr-RS")}
          </p>
        </div>
        <Link href="/sef/inbox" className="text-sm text-teal-600 hover:text-teal-700">
          &larr; Inbox
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Info label="Dobavljač" value={row.supplier_name} />
          <Info label="PIB dobavljača" value={row.supplier_pib} mono />
          <Info label="Datum izdavanja" value={row.issue_date} />
          <Info label="Datum dospeća" value={row.due_date ?? "—"} />
          <Info
            label="Iznos"
            value={
              row.total_amount != null
                ? `${Number(row.total_amount).toLocaleString("sr-RS")} ${row.currency}`
                : "—"
            }
          />
          <Info
            label="PDV"
            value={
              row.tax_amount != null
                ? `${Number(row.tax_amount).toLocaleString("sr-RS")} ${row.currency}`
                : "—"
            }
          />
          <Info label="SEF ID" value={row.sef_document_id} mono />
          <Info label="Tip dokumenta" value={row.document_type ?? "—"} />
        </div>

        {row.inbox_action_reason && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-slate-400 uppercase mb-1">Razlog odluke</p>
            <p className="text-sm text-slate-700">{row.inbox_action_reason}</p>
          </div>
        )}
      </div>

      {row.inbox_action === "pending" && (
        <InboxActions inboxId={row.id} />
      )}

      {row.archive_path && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-slate-500">
          Originalan UBL XML čuva se u arhivi 10 godina (Zakon o e-fakturisanju).
          Pristup za potrebe poreskog organa preko administratora.
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>{value ?? "—"}</p>
    </div>
  );
}

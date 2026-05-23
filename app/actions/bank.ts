"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/uuid";
import { logAudit } from "@/lib/audit-log";
import { parseBankCsv, type BankFormat } from "@/lib/bank-csv";

const VALID_FORMATS: BankFormat[] = [
  "generic_csv", "intesa_csv", "nlb_csv", "raiffeisen_csv",
  "otp_csv", "procredit_csv", "aik_csv", "mt940",
];

const MAX_FILE_BYTES = 5_000_000; // 5 MB

export async function importBankFile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const file = formData.get("file") as File | null;
  const format = formData.get("format") as string;

  if (!file || file.size === 0) return { error: "Izaberite fajl." };
  if (file.size > MAX_FILE_BYTES) return { error: "Fajl je veći od 5 MB." };
  if (!VALID_FORMATS.includes(format as BankFormat)) {
    return { error: "Nepoznat format banke." };
  }

  // H11: daily quota — tier-aware (free: 5/day, pro/business: 20/day)
  const { data: canImport, error: quotaErr } = await supabase.rpc("fo_can_import_bank", {
    p_max_per_day: 20,
  });
  if (quotaErr) {
    console.error("[bank.import.quota]", { code: quotaErr.code });
    return { error: "Greška pri proveri dnevnog limita." };
  }
  if (canImport === false) {
    return { error: "Premašili ste dnevni limit od 20 uvoza izvoda. Pokušajte sutra." };
  }

  const text = await file.text();
  const transactions = parseBankCsv(text, format as BankFormat);

  if (transactions.length === 0) {
    return {
      error:
        "Nijedna transakcija nije pronađena. Proverite format fajla i izabranu banku.",
    };
  }

  // Create import record
  const totalAmount = transactions.reduce((s, t) => s + t.amount, 0);
  const { data: imp, error: impErr } = await supabase
    .from("fo_bank_imports")
    .insert({
      user_id: user.id,
      format,
      filename: file.name,
      total_transactions: transactions.length,
      total_amount: totalAmount,
    })
    .select("id")
    .single();

  if (impErr || !imp) {
    console.error("[bank.import.create]", { code: impErr?.code });
    return { error: "Greška pri snimanju import-a." };
  }

  // Bulk insert transactions in chunks
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < transactions.length; i += CHUNK) {
    const chunk = transactions.slice(i, i + CHUNK).map((t) => ({
      user_id: user.id,
      import_id: imp.id,
      txn_date: t.txn_date,
      amount: t.amount,
      currency: t.currency,
      reference: t.reference,
      description: t.description,
      counterparty_name: t.counterparty_name,
      counterparty_account: t.counterparty_account,
      raw_row: t.raw_row,
    }));
    const { error: txnErr } = await supabase.from("fo_bank_transactions").insert(chunk);
    if (txnErr) {
      console.error("[bank.import.txn]", { code: txnErr.code });
      continue;
    }
    inserted += chunk.length;
  }

  // Auto-match all newly inserted
  const { data: matchResult } = await supabase.rpc("fo_match_all_unmatched");
  const matched = (matchResult as { newly_matched?: number } | null)?.newly_matched ?? 0;

  // Update import record with match count
  await supabase
    .from("fo_bank_imports")
    .update({ matched_count: matched })
    .eq("id", imp.id);

  await logAudit({
    action: "profile.updated",
    resourceType: "bank_import",
    resourceId: imp.id,
    metadata: { format, inserted, matched, filename: file.name },
  });

  revalidatePath("/banka");
  revalidatePath("/fakture");
  return { success: true, inserted, matched, importId: imp.id };
}

export async function manualMatch(txnId: string, invoiceId: string) {
  if (!isUuid(txnId) || !isUuid(invoiceId)) return { error: "Neispravan ID." };
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("fo_manual_match", {
    p_txn_id: txnId,
    p_invoice_id: invoiceId,
  });
  if (error) {
    console.error("[bank.manualMatch]", { code: error.code });
    return { error: "Greška pri uparivanju." };
  }
  await logAudit({
    action: "invoice.status_changed",
    resourceType: "bank_match",
    resourceId: txnId,
    metadata: { invoice_id: invoiceId, type: "manual" },
  });
  revalidatePath("/banka");
  revalidatePath("/fakture");
  return { success: true };
}

export async function ignoreTransaction(txnId: string) {
  if (!isUuid(txnId)) return { error: "Neispravan ID." };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("fo_bank_transactions")
    .update({ match_status: "ignored" })
    .eq("id", txnId)
    .eq("user_id", user.id);
  if (error) return { error: "Greška." };
  revalidatePath("/banka");
  return { success: true };
}

export async function rematchAll() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("fo_match_all_unmatched");
  if (error) return { error: "Greška pri rematching-u." };
  const result = (data as { total_unmatched?: number; newly_matched?: number } | null);
  await logAudit({
    action: "profile.updated",
    resourceType: "bank_rematch",
    metadata: result ?? {},
  });
  revalidatePath("/banka");
  revalidatePath("/fakture");
  return { success: true, ...result };
}

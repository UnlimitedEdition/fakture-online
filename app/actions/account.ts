"use server";

import { createServerClient } from "@supabase/ssr";
import { requireUser, createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit-log";
import { redirect } from "next/navigation";

// ============================================================================
// exportMyData — GDPR Art. 20 portability. Returns JSON blob.
// ============================================================================
export async function exportMyData(): Promise<{ data?: unknown; error?: string }> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase.rpc("fo_export_my_data");
  if (error) {
    console.error("[account.export]", { user_id: user.id, code: error.code });
    return { error: "Greška pri eksportu podataka." };
  }

  await logAudit({
    action: "profile.updated",
    resourceType: "data_export",
    metadata: { format: "json" },
  });

  return { data };
}

// ============================================================================
// deleteMyAccount — GDPR Art. 17 erasure.
// Anonymizes SEF-retained data (legal 10y hold), hard-deletes the rest,
// then deletes the auth.users row via service-role admin API.
// ============================================================================
export async function deleteMyAccount(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const confirmation = formData.get("confirmation") as string;
  const password = formData.get("password") as string;

  if (confirmation !== "OBRISI MOJ NALOG") {
    return { error: "Niste tačno otkucali potvrdu." };
  }
  if (!password || !user.email) {
    return { error: "Lozinka je obavezna za potvrdu." };
  }

  // Re-auth with password
  const reauth = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (reauth.error) {
    await logAudit({
      action: "login.failed",
      metadata: { event: "account.delete_reauth_failed" },
      success: false,
    });
    return { error: "Pogrešna lozinka." };
  }

  // Step 1: anonymize legally retained data (SEF invoices, audit log)
  const { error: anonErr } = await supabase.rpc("fo_anonymize_my_data");
  if (anonErr) {
    console.error("[account.delete.anonymize]", {
      user_id: user.id,
      code: anonErr.code,
      message: anonErr.message,
    });
    return { error: "Greška pri anonimizaciji podataka. Kontaktirajte podršku." };
  }

  // Step 2: delete the auth.users row via service role (cascade rest)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { error: "Brisanje naloga nije dostupno. Kontaktirajte podršku." };
  }

  const svc = createServerClient(url, serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });

  // Audit before deletion (since user_id will be set to NULL by cascade)
  await logAudit({
    action: "profile.updated",
    resourceType: "account_deleted",
    metadata: { final: true },
  });

  const { error: delErr } = await svc.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("[account.delete.auth]", {
      user_id: user.id,
      message: delErr.message,
    });
    return { error: "Greška pri brisanju naloga. Kontaktirajte podršku." };
  }

  // Sign out current session
  await createClient().then((c) => c.auth.signOut({ scope: "global" }));
  redirect("/?deleted=1");
}

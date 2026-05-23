import { requireUser } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ClientDetail } from "./client-detail";

export default async function KlijentPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { supabase, user } = await requireUser();

  const [clientRes, invoicesRes, profileRes] = await Promise.all([
    supabase
      .from("fo_clients")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("fo_invoices")
      .select("id, invoice_number, issue_date, total, status, currency")
      .eq("client_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("fo_profiles")
      .select("sef_api_key_encrypted")
      .eq("id", user.id)
      .single(),
  ]);

  if (clientRes.error || !clientRes.data) {
    if (clientRes.error?.code !== "PGRST116") {
      console.error("[klijenti.detail]", {
        user_id: user.id,
        client_id: id,
        code: clientRes.error?.code,
        message: clientRes.error?.message,
      });
    }
    notFound();
  }

  const raw = clientRes.data as Record<string, unknown>;
  return (
    <ClientDetail
      client={clientRes.data}
      invoices={invoicesRes.data || []}
      sef={{
        sef_registered: (raw.sef_registered as boolean | null) ?? null,
        sef_last_checked_at: (raw.sef_last_checked_at as string | null) ?? null,
        is_budget_user: Boolean(raw.is_budget_user),
        jbkjs: (raw.jbkjs as string | null) ?? null,
        is_foreign: Boolean(raw.is_foreign),
        country_code: (raw.country_code as string) || "RS",
      }}
      sefEnabled={!!profileRes.data?.sef_api_key_encrypted}
    />
  );
}

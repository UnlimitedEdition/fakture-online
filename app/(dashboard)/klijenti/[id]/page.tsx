import { requireUser } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ClientDetail } from "./client-detail";

export default async function KlijentPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { supabase, user } = await requireUser();

  const [clientRes, invoicesRes] = await Promise.all([
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

  return (
    <ClientDetail
      client={clientRes.data}
      invoices={invoicesRes.data || []}
    />
  );
}

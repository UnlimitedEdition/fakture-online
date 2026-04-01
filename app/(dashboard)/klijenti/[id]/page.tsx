import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ClientDetail } from "./client-detail";

export default async function KlijentPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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

  if (!clientRes.data) notFound();

  return (
    <ClientDetail
      client={clientRes.data}
      invoices={invoicesRes.data || []}
    />
  );
}

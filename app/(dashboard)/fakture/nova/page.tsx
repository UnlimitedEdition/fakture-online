import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvoiceForm } from "../invoice-form";

export default async function NovaFakturaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clients } = await supabase
    .from("fo_clients")
    .select("*")
    .eq("user_id", user.id)
    .order("company_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nova faktura</h1>
        <p className="text-slate-500 text-sm mt-1">Kreirajte novu fakturu za klijenta</p>
      </div>
      <InvoiceForm clients={clients || []} />
    </div>
  );
}

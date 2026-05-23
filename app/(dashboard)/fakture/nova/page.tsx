import { requireUser } from "@/lib/supabase/server";
import { InvoiceForm } from "../invoice-form";

export default async function NovaFakturaPage() {
  const { supabase, user } = await requireUser();

  const { data: clients, error } = await supabase
    .from("fo_clients")
    .select("*")
    .eq("user_id", user.id)
    .order("company_name");

  if (error) {
    console.error("[fakture.nova.clients]", {
      user_id: user.id,
      code: error.code,
      message: error.message,
    });
  }

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

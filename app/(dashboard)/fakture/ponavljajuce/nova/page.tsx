import { requireUser } from "@/lib/supabase/server";
import { ScheduleForm } from "./form";

export default async function NovaSemaPage() {
  const { supabase, user } = await requireUser();

  const { data: clients } = await supabase
    .from("fo_clients")
    .select("id, company_name")
    .eq("user_id", user.id)
    .order("company_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nova ponavljajuća šema</h1>
        <p className="text-slate-500 text-sm mt-1">
          Sistem će automatski generisati fakturu na zadati datum po zadatoj frekvenciji.
        </p>
      </div>
      <ScheduleForm clients={clients ?? []} />
    </div>
  );
}

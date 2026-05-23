import { requireUser } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function PodesavanjaPage() {
  const { supabase, user } = await requireUser();

  const { data: profile, error } = await supabase.rpc("fo_get_profile");
  if (error) {
    console.error("[podesavanja.profile]", {
      user_id: user.id,
      code: error.code,
      message: error.message,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Podešavanja</h1>
        <p className="text-slate-500 text-sm mt-1">
          Podaci o vašoj firmi koji se prikazuju na fakturama
        </p>
      </div>

      <ProfileForm profile={profile} accountEmail={user.email ?? ""} />
    </div>
  );
}

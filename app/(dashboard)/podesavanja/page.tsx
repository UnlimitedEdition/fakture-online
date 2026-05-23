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

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-1">Dodatna podešavanja</h2>
        <p className="text-slate-500 text-sm mb-4">
          E-fakture, integracije i napredne opcije.
        </p>
        <a
          href="/podesavanja/sef"
          className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
        >
          SEF integracija (Sistem Elektronskih Faktura) &rarr;
        </a>
      </div>
    </div>
  );
}

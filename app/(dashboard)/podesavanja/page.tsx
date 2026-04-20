import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";
import { ProfileForm } from "./profile-form";

export default async function PodesavanjaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("fo_profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Podešavanja</h1>
        <p className="text-slate-500 text-sm mt-1">
          Podaci o vašoj firmi koji se prikazuju na fakturama
        </p>
      </div>

      <ProfileForm profile={profile} />
    </div>
  );
}

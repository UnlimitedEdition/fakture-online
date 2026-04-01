"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Niste prijavljeni." };
  }

  const { error } = await supabase
    .from("fo_profiles")
    .update({
      company_name: (formData.get("company_name") as string) || "",
      owner_name: (formData.get("owner_name") as string) || "",
      pib: (formData.get("pib") as string) || "",
      maticni_broj: (formData.get("maticni_broj") as string) || "",
      address: (formData.get("address") as string) || "",
      city: (formData.get("city") as string) || "",
      zip_code: (formData.get("zip_code") as string) || "",
      phone: (formData.get("phone") as string) || "",
      email: (formData.get("email") as string) || "",
      bank_account: (formData.get("bank_account") as string) || "",
      invoice_prefix: (formData.get("invoice_prefix") as string) || "FAK",
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Greška pri čuvanju podešavanja." };
  }

  revalidatePath("/podesavanja");
  revalidatePath("/fakture");
  return { success: true };
}

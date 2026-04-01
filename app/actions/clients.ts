"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createClientAction(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const company_name = formData.get("company_name") as string;
  if (!company_name) {
    return { error: "Naziv firme/klijenta je obavezan." };
  }

  const { data: client, error } = await supabase
    .from("fo_clients")
    .insert({
      user_id: user.id,
      company_name,
      contact_name: (formData.get("contact_name") as string) || "",
      pib: (formData.get("pib") as string) || "",
      maticni_broj: (formData.get("maticni_broj") as string) || "",
      address: (formData.get("address") as string) || "",
      city: (formData.get("city") as string) || "",
      zip_code: (formData.get("zip_code") as string) || "",
      email: (formData.get("email") as string) || "",
      phone: (formData.get("phone") as string) || "",
      notes: (formData.get("notes") as string) || "",
    })
    .select()
    .single();

  if (error || !client) {
    return { error: "Greška pri dodavanju klijenta." };
  }

  revalidatePath("/klijenti");
  redirect(`/klijenti/${client.id}`);
}

export async function updateClientAction(
  clientId: string,
  _prevState: { error: string } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const company_name = formData.get("company_name") as string;
  if (!company_name) {
    return { error: "Naziv firme/klijenta je obavezan." };
  }

  const { error } = await supabase
    .from("fo_clients")
    .update({
      company_name,
      contact_name: (formData.get("contact_name") as string) || "",
      pib: (formData.get("pib") as string) || "",
      maticni_broj: (formData.get("maticni_broj") as string) || "",
      address: (formData.get("address") as string) || "",
      city: (formData.get("city") as string) || "",
      zip_code: (formData.get("zip_code") as string) || "",
      email: (formData.get("email") as string) || "",
      phone: (formData.get("phone") as string) || "",
      notes: (formData.get("notes") as string) || "",
    })
    .eq("id", clientId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Greška pri ažuriranju klijenta." };
  }

  revalidatePath("/klijenti");
  revalidatePath(`/klijenti/${clientId}`);
  redirect(`/klijenti/${clientId}`);
}

export async function deleteClient(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("fo_clients")
    .delete()
    .eq("id", clientId)
    .eq("user_id", user.id);

  if (error) {
    if (error.message.includes("violates foreign key")) {
      return { error: "Ne možete obrisati klijenta koji ima fakture." };
    }
    return { error: "Greška pri brisanju klijenta." };
  }

  revalidatePath("/klijenti");
  redirect("/klijenti");
}

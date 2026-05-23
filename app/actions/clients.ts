"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit-log";

export async function createClientAction(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const { supabase, user } = await requireUser();

  const company_name = (formData.get("company_name") as string)?.trim();
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
      is_budget_user: formData.get("is_budget_user") === "true",
      jbkjs: ((formData.get("jbkjs") as string) || "").trim() || null,
      is_foreign: formData.get("is_foreign") === "true",
      country_code: ((formData.get("country_code") as string) || "RS").toUpperCase().slice(0, 2),
    })
    .select()
    .single();

  if (error || !client) {
    console.error("[clients.create]", {
      user_id: user.id,
      code: error?.code,
      message: error?.message,
    });
    await logAudit({ action: "client.created", success: false });
    return { error: "Greška pri dodavanju klijenta." };
  }

  await logAudit({
    action: "client.created",
    resourceType: "client",
    resourceId: client.id,
  });

  revalidatePath("/klijenti");
  redirect(`/klijenti/${client.id}`);
}

export async function updateClientAction(
  clientId: string,
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const { supabase, user } = await requireUser();

  const company_name = (formData.get("company_name") as string)?.trim();
  if (!company_name) {
    return { error: "Naziv firme/klijenta je obavezan." };
  }

  const { error, count } = await supabase
    .from("fo_clients")
    .update(
      {
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
      },
      { count: "exact" },
    )
    .eq("id", clientId)
    .eq("user_id", user.id);

  if (error || count === 0) {
    console.error("[clients.update]", {
      user_id: user.id,
      client_id: clientId,
      code: error?.code,
      message: error?.message,
    });
    await logAudit({
      action: "client.updated",
      resourceType: "client",
      resourceId: clientId,
      success: false,
    });
    return { error: "Greška pri ažuriranju klijenta." };
  }

  await logAudit({
    action: "client.updated",
    resourceType: "client",
    resourceId: clientId,
  });

  revalidatePath("/klijenti");
  revalidatePath(`/klijenti/${clientId}`);
  redirect(`/klijenti/${clientId}`);
}

export async function deleteClient(clientId: string) {
  const { supabase, user } = await requireUser();

  const { error, count } = await supabase
    .from("fo_clients")
    .delete({ count: "exact" })
    .eq("id", clientId)
    .eq("user_id", user.id);

  if (error || count === 0) {
    console.error("[clients.delete]", {
      user_id: user.id,
      client_id: clientId,
      code: error?.code,
      message: error?.message,
    });
    await logAudit({
      action: "client.deleted",
      resourceType: "client",
      resourceId: clientId,
      success: false,
    });
    if (error?.message?.includes("violates foreign key")) {
      return { error: "Ne možete obrisati klijenta koji ima fakture." };
    }
    return { error: "Greška pri brisanju klijenta." };
  }

  await logAudit({
    action: "client.deleted",
    resourceType: "client",
    resourceId: clientId,
  });

  revalidatePath("/klijenti");
  redirect("/klijenti");
}

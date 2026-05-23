"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit-log";

export async function updateProfile(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { supabase, user } = await requireUser();

  // NOTE: `email` and `is_admin` are deliberately NOT writable from the form.
  // Email is authoritative in auth.users; is_admin is granted by an admin.
  const limitEnabled = formData.get("pausal_limit_enabled") === "true";
  const limitRaw = formData.get("pausal_limit_rsd") as string | null;
  const limitParsed = limitRaw ? Number(limitRaw.replace(/[^\d.]/g, "")) : null;
  const limitRsd =
    limitParsed && Number.isFinite(limitParsed) && limitParsed > 0
      ? limitParsed
      : 8_000_000;

  const { error, count } = await supabase
    .from("fo_profiles")
    .update(
      {
        company_name: (formData.get("company_name") as string) || "",
        owner_name: (formData.get("owner_name") as string) || "",
        pib: (formData.get("pib") as string) || "",
        maticni_broj: (formData.get("maticni_broj") as string) || "",
        address: (formData.get("address") as string) || "",
        city: (formData.get("city") as string) || "",
        zip_code: (formData.get("zip_code") as string) || "",
        phone: (formData.get("phone") as string) || "",
        bank_account: (formData.get("bank_account") as string) || "",
        invoice_prefix:
          (formData.get("invoice_prefix") as string)?.trim() || "FAK",
        pausal_limit_enabled: limitEnabled,
        pausal_limit_rsd: limitRsd,
      },
      { count: "exact" },
    )
    .eq("id", user.id);

  if (error || count === 0) {
    console.error("[settings.update]", {
      user_id: user.id,
      code: error?.code,
      message: error?.message,
    });
    await logAudit({ action: "profile.updated", success: false });
    return { error: "Greška pri čuvanju podešavanja." };
  }

  await logAudit({
    action: "profile.updated",
    resourceType: "profile",
    resourceId: user.id,
  });

  revalidatePath("/podesavanja");
  revalidatePath("/fakture");
  return { success: true };
}

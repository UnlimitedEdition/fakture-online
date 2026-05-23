"use server";

import { requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit-log";

const MAX_BYTES = 1_000_000; // 1 MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function uploadLogo(formData: FormData) {
  const { supabase, user } = await requireUser();
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) {
    return { error: "Izaberite fajl." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Fajl je veći od 1 MB." };
  }
  if (!ALLOWED.has(file.type)) {
    return { error: "Dozvoljen format: PNG, JPEG, WebP ili SVG." };
  }

  const ext =
    file.type === "image/svg+xml"
      ? "svg"
      : file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/webp"
          ? "webp"
          : "png";
  const path = `${user.id}/logo.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadErr } = await supabase.storage
    .from("logos")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
      cacheControl: "0",
    });
  if (uploadErr) {
    console.error("[profile.logo.upload]", {
      user_id: user.id,
      message: uploadErr.message,
    });
    return { error: "Greška pri uploadu loga." };
  }

  // Persist the path on the profile so PDFs/renders can pick it up
  const { error: updateErr } = await supabase
    .from("fo_profiles")
    .update({ logo_url: path })
    .eq("id", user.id);
  if (updateErr) {
    return { error: "Greška pri snimanju puta loga." };
  }

  await logAudit({
    action: "profile.updated",
    resourceType: "logo",
    metadata: { mime: file.type, bytes: file.size },
  });

  revalidatePath("/podesavanja");
  return { success: true };
}

export async function removeLogo() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("fo_profiles")
    .select("logo_url")
    .eq("id", user.id)
    .single();

  if (profile?.logo_url) {
    await supabase.storage.from("logos").remove([profile.logo_url]);
  }

  await supabase
    .from("fo_profiles")
    .update({ logo_url: "" })
    .eq("id", user.id);

  await logAudit({ action: "profile.updated", resourceType: "logo_removed" });
  revalidatePath("/podesavanja");
  return { success: true };
}

// Returns a short-lived signed URL for the current user's logo.
// Called from server components that render the logo in the invoice view/PDF.
export async function getOwnLogoUrl(): Promise<string | null> {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("fo_profiles")
    .select("logo_url")
    .eq("id", user.id)
    .single();
  if (!profile?.logo_url) return null;

  const { data: signed } = await supabase.storage
    .from("logos")
    .createSignedUrl(profile.logo_url, 300); // 5 min
  return signed?.signedUrl ?? null;
}

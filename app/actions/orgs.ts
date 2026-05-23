"use server";

import { requireUser } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit-log";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 godina

// ============================================================================
// setActiveOrg — sets the active-org cookie. Validates membership via RPC
// (fo_switch_org also enforces this) before writing the cookie.
// ============================================================================
export async function setActiveOrg(orgId: string) {
  if (!isUuid(orgId)) {
    return { error: "Neispravan ID firme." };
  }
  const { supabase, user } = await requireUser();

  const rl = await checkRateLimit("invoiceMutate", `org.switch:${user.id}`);
  if (!rl.allowed) {
    return { error: "Previše pokušaja. Pokušajte za par minuta." };
  }

  const { data, error } = await supabase.rpc("fo_switch_org", { p_org_id: orgId });
  if (error || !data) {
    console.error("[orgs.setActive]", {
      user_id: user.id,
      org_id: orgId,
      code: error?.code,
      message: error?.message,
    });
    return { error: "Niste član ove firme." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  await logAudit({
    action: "profile.updated",
    resourceType: "org_switch",
    resourceId: orgId,
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// ============================================================================
// createOrg — creates a new fo_orgs row and adds the caller as 'owner'.
// ============================================================================
export async function createOrg(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const { supabase, user } = await requireUser();

  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return { error: "Naziv firme je obavezan." };
  if (name.length > 200) return { error: "Naziv firme je predugačak." };

  const rl = await checkRateLimit("invoiceMutate", `org.create:${user.id}`);
  if (!rl.allowed) {
    return { error: "Previše pokušaja. Pokušajte za par minuta." };
  }

  const { data, error } = await supabase.rpc("fo_create_org", { p_name: name });
  if (error || !data) {
    console.error("[orgs.create]", {
      user_id: user.id,
      code: error?.code,
      message: error?.message,
    });
    return { error: "Greška pri kreiranju firme." };
  }

  await logAudit({
    action: "profile.updated",
    resourceType: "org_created",
    resourceId: data as string,
    metadata: { name },
  });

  revalidatePath("/podesavanja/firme");
  return { success: true };
}

// ============================================================================
// inviteOrgMember — owner-only. Issues a pending invite. The actual email
// delivery is out of scope here (Supabase Auth handles invite emails when the
// user later registers; we render the accept URL in the UI for now).
// ============================================================================
type Role = "admin" | "accountant" | "viewer";

export async function inviteOrgMember(
  orgId: string,
  _prevState: { error?: string; success?: boolean; token?: string } | null,
  formData: FormData,
) {
  if (!isUuid(orgId)) return { error: "Neispravan ID firme." };

  const { supabase, user } = await requireUser();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const role = (formData.get("role") as string) || "";

  if (!email || !email.includes("@")) {
    return { error: "Unesite ispravnu email adresu." };
  }
  if (email.length > 254) {
    return { error: "Email je predugačak." };
  }
  if (!["admin", "accountant", "viewer"].includes(role)) {
    return { error: "Neispravna uloga." };
  }

  const rl = await checkRateLimit("invoiceMutate", `org.invite:${user.id}`);
  if (!rl.allowed) {
    return { error: "Previše pokušaja. Pokušajte za par minuta." };
  }

  const { data, error } = await supabase.rpc("fo_create_org_invite", {
    p_org_id: orgId,
    p_email: email,
    p_role: role as Role,
  });
  if (error || !data) {
    console.error("[orgs.invite]", {
      user_id: user.id,
      org_id: orgId,
      code: error?.code,
      message: error?.message,
    });
    return { error: "Greška pri slanju poziva." };
  }

  await logAudit({
    action: "profile.updated",
    resourceType: "org_invite_created",
    resourceId: orgId,
    metadata: { role },
  });

  revalidatePath("/podesavanja/firme");
  return { success: true, token: data as string };
}

// ============================================================================
// cancelOrgInvite — owner-only. Deletes a pending (unaccepted) invite.
// ============================================================================
export async function cancelOrgInvite(inviteId: string) {
  if (!isUuid(inviteId)) return { error: "Neispravan ID poziva." };

  const { supabase, user } = await requireUser();

  const rl = await checkRateLimit("invoiceMutate", `org.cancel:${user.id}`);
  if (!rl.allowed) {
    return { error: "Previše pokušaja. Pokušajte za par minuta." };
  }

  const { data, error } = await supabase.rpc("fo_cancel_org_invite", {
    p_invite_id: inviteId,
  });
  if (error || !data) {
    console.error("[orgs.cancelInvite]", {
      user_id: user.id,
      invite_id: inviteId,
      code: error?.code,
      message: error?.message,
    });
    return { error: "Poziv nije pronađen ili nemate prava." };
  }

  await logAudit({
    action: "profile.updated",
    resourceType: "org_invite_cancelled",
    resourceId: inviteId,
  });

  revalidatePath("/podesavanja/firme");
  return { success: true };
}

// ============================================================================
// acceptOrgInvite — called from /orgs/accept?token=... page. SECURITY DEFINER
// RPC validates email match + expiry, so we just pass through.
// ============================================================================
export async function acceptOrgInvite(token: string) {
  if (!isUuid(token)) return { error: "Neispravan token." };

  const { supabase, user } = await requireUser();

  const rl = await checkRateLimit("invoiceMutate", `org.accept:${user.id}`);
  if (!rl.allowed) {
    return { error: "Previše pokušaja. Pokušajte za par minuta." };
  }

  const { data, error } = await supabase.rpc("fo_accept_org_invite", {
    p_token: token,
  });
  if (error || !data) {
    console.error("[orgs.acceptInvite]", {
      user_id: user.id,
      code: error?.code,
      message: error?.message,
    });
    const msg = error?.message || "";
    if (msg.includes("expired")) return { error: "Poziv je istekao." };
    if (msg.includes("already accepted")) return { error: "Poziv je već prihvaćen." };
    if (msg.includes("email does not match")) {
      return { error: "Ovaj poziv je upućen drugoj email adresi." };
    }
    if (msg.includes("not found")) return { error: "Poziv ne postoji." };
    return { error: "Greška pri prihvatanju poziva." };
  }

  await logAudit({
    action: "profile.updated",
    resourceType: "org_invite_accepted",
    resourceId: data as string,
  });

  // Switch the active org to the just-joined one.
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, data as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  revalidatePath("/podesavanja/firme");
  return { success: true, orgId: data as string };
}

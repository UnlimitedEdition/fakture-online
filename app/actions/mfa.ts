"use server";

import { createClient, requireUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit-log";
import { getRequestMeta } from "@/lib/request-meta";

// ----------------------------------------------------------------------------
// MFA / TOTP — server actions backed by Supabase Auth MFA API.
//
// Flow:
//   1) enrollTotp()            → creates an `unverified` TOTP factor, returns
//                                QR (SVG) + secret for the user to scan.
//   2) verifyTotp(id, code)    → challenges + verifies in one shot; on success
//                                the factor flips to `verified`. The session
//                                AAL bumps to `aal2`.
//   3) unenrollTotp(id)        → drops the factor; user reverts to AAL1.
//   4) completeMfaChallenge()  → used during the login flow when a user with
//                                an enrolled factor has just signed in with
//                                password (session is AAL1 but nextLevel=AAL2).
// ----------------------------------------------------------------------------

type EnrollResult =
  | { error: string }
  | { factorId: string; qrSvg: string; secret: string };

type ActionResult = { error?: string; success?: boolean };

export async function enrollTotp(): Promise<EnrollResult> {
  const { supabase, user } = await requireUser();

  const meta = await getRequestMeta();
  const ipKey = meta.ip ?? "unknown";
  const rl = await checkRateLimit("mfa", `enroll:user:${user.id}:ip:${ipKey}`);
  if (!rl.allowed) {
    return { error: "Previše pokušaja. Sačekajte par minuta." };
  }

  // Defensive: if a verified TOTP factor already exists, refuse and let the
  // UI render the "already enabled" state instead of stacking factors.
  const { data: list } = await supabase.auth.mfa.listFactors();
  const existingVerified = (list?.totp ?? []).find((f) => f.status === "verified");
  if (existingVerified) {
    return { error: "2FA je već uključeno." };
  }

  // Clean up stale `unverified` factors from a previous attempt — Supabase
  // allows multiple, but our UI shows one at a time.
  const staleUnverified = (list?.all ?? []).filter(
    (f) => f.factor_type === "totp" && f.status === "unverified",
  );
  for (const f of staleUnverified) {
    await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "FaktureOnline",
    issuer: "FaktureOnline",
  });

  if (error || !data) {
    console.error("[mfa.enroll]", { code: error?.code, message: error?.message });
    await logAudit({
      action: "mfa.enroll_failed",
      metadata: { code: error?.code },
      success: false,
    });
    return { error: "Greška pri uključivanju 2FA. Pokušajte ponovo." };
  }

  await logAudit({
    action: "mfa.enroll_started",
    resourceType: "mfa_factor",
    resourceId: data.id,
  });

  // `qr_code` is a raw SVG string per supabase auth-js docs.
  const qrSvg = data.totp.qr_code;
  return {
    factorId: data.id,
    qrSvg: `data:image/svg+xml;utf-8,${encodeURIComponent(qrSvg)}`,
    secret: data.totp.secret,
  };
}

export async function verifyTotp(
  factorId: string,
  code: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  if (!factorId || typeof factorId !== "string") {
    return { error: "Nedostaje ID faktora." };
  }
  const normalizedCode = (code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalizedCode)) {
    return { error: "Kod mora biti tačno 6 cifara." };
  }

  const meta = await getRequestMeta();
  const ipKey = meta.ip ?? "unknown";
  const rl = await checkRateLimit("mfa", `verify:user:${user.id}:ip:${ipKey}`);
  if (!rl.allowed) {
    await logAudit({
      action: "mfa.enroll_failed",
      metadata: { reason: "rate_limit" },
      success: false,
    });
    return { error: "Previše pokušaja. Sačekajte par minuta." };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: normalizedCode,
  });

  if (error) {
    console.error("[mfa.verify]", { code: error.code, message: error.message });
    await logAudit({
      action: "mfa.enroll_failed",
      resourceType: "mfa_factor",
      resourceId: factorId,
      metadata: { code: error.code },
      success: false,
    });
    return { error: "Pogrešan kod ili je istekao. Pokušajte ponovo." };
  }

  await logAudit({
    action: "mfa.enroll_verified",
    resourceType: "mfa_factor",
    resourceId: factorId,
  });

  revalidatePath("/podesavanja/nalog");
  return { success: true };
}

export async function unenrollTotp(factorId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  if (!factorId || typeof factorId !== "string") {
    return { error: "Nedostaje ID faktora." };
  }

  const meta = await getRequestMeta();
  const ipKey = meta.ip ?? "unknown";
  const rl = await checkRateLimit("mfa", `unenroll:user:${user.id}:ip:${ipKey}`);
  if (!rl.allowed) {
    return { error: "Previše pokušaja. Sačekajte par minuta." };
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    console.error("[mfa.unenroll]", { code: error.code, message: error.message });
    return { error: "Greška pri isključivanju 2FA." };
  }

  await logAudit({
    action: "mfa.unenrolled",
    resourceType: "mfa_factor",
    resourceId: factorId,
  });

  revalidatePath("/podesavanja/nalog");
  return { success: true };
}

// ----------------------------------------------------------------------------
// completeMfaChallenge — second step of the login flow. The user has signed
// in with password (AAL1), and we now need a 6-digit code to reach AAL2.
// ----------------------------------------------------------------------------
export async function completeMfaChallenge(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const code = ((formData.get("code") as string) ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) {
    return { error: "Kod mora biti tačno 6 cifara." };
  }

  const meta = await getRequestMeta();
  const ipKey = meta.ip ?? "unknown";
  const rl = await checkRateLimit("mfa", `challenge:user:${user.id}:ip:${ipKey}`);
  if (!rl.allowed) {
    await logAudit({
      action: "mfa.challenge_failed",
      metadata: { reason: "rate_limit" },
      success: false,
    });
    return { error: "Previše pokušaja. Sačekajte par minuta." };
  }

  const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
  if (listErr || !factors) {
    return { error: "Greška pri proveri 2FA faktora." };
  }
  const totp = factors.totp.find((f) => f.status === "verified");
  if (!totp) {
    // No verified TOTP — nothing to challenge; let the user proceed.
    redirect("/dashboard");
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: totp.id,
    code,
  });

  if (error) {
    console.error("[mfa.challenge]", { code: error.code, message: error.message });
    await logAudit({
      action: "mfa.challenge_failed",
      resourceType: "mfa_factor",
      resourceId: totp.id,
      metadata: { code: error.code },
      success: false,
    });
    return { error: "Pogrešan kod. Pokušajte ponovo." };
  }

  await logAudit({
    action: "mfa.challenge_success",
    resourceType: "mfa_factor",
    resourceId: totp.id,
  });

  redirect("/dashboard");
}

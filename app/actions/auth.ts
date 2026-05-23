"use server";

import { createHmac } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit-log";
import { getRequestMeta, getSiteUrl } from "@/lib/request-meta";

export async function login(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const supabase = await createClient();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email i lozinka su obavezni." };
  }

  const meta = await getRequestMeta();
  const ipKey = meta.ip ?? "unknown";

  const limitByIp = await checkRateLimit("login", `ip:${ipKey}`);
  const limitByEmail = await checkRateLimit("login", `email:${email}`);
  if (!limitByIp.allowed || !limitByEmail.allowed) {
    await logAudit({
      action: "login.failed",
      metadata: { reason: "rate_limit", email_hash: hashEmail(email) },
      success: false,
    });
    return { error: "Previše pokušaja. Sačekajte par minuta i pokušajte ponovo." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[auth.login]", { code: error.code, message: error.message });
    await logAudit({
      action: "login.failed",
      metadata: { email_hash: hashEmail(email), code: error.code },
      success: false,
    });
    return { error: "Pogrešan email ili lozinka." };
  }

  await logAudit({ action: "login.success", metadata: { email_hash: hashEmail(email) } });

  // If the user has MFA enrolled, the password sign-in only yields AAL1.
  // Send them through the second-factor challenge before unlocking the app.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
    redirect("/login/2fa");
  }

  redirect("/dashboard");
}

export async function register(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const supabase = await createClient();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const fullName = (formData.get("full_name") as string)?.trim();
  // Honeypot — bots typically fill every visible input
  const honeypot = formData.get("website") as string | null;
  if (honeypot) {
    // Silent success
    redirect("/register/check-email");
  }

  if (!email || !password || !fullName) {
    return { error: "Sva polja su obavezna." };
  }

  // Bank-grade password policy: 12+ chars, must include letter + digit + symbol.
  if (password.length < 12) {
    return { error: "Lozinka mora imati najmanje 12 karaktera." };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return { error: "Lozinka mora sadržati slova, brojeve i bar jedan simbol." };
  }
  if (password.toLowerCase().includes(email.split("@")[0].toLowerCase())) {
    return { error: "Lozinka ne sme sadržati email." };
  }

  const meta = await getRequestMeta();
  const ipKey = meta.ip ?? "unknown";
  const limitByIp = await checkRateLimit("register", `ip:${ipKey}`);
  const limitByEmail = await checkRateLimit("register", `email:${email}`);
  if (!limitByIp.allowed || !limitByEmail.allowed) {
    await logAudit({
      action: "register.failed",
      metadata: { reason: "rate_limit" },
      success: false,
    });
    return { error: "Previše pokušaja registracije. Sačekajte sat vremena." };
  }

  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined,
    },
  });

  if (error) {
    console.error("[auth.register]", { code: error.code, message: error.message });
    await logAudit({
      action: "register.failed",
      metadata: { email_hash: hashEmail(email), code: error.code },
      success: false,
    });
    // Generic message to avoid email enumeration.
    return { error: "Greška pri registraciji. Proverite email i pokušajte ponovo." };
  }

  await logAudit({ action: "register.success", metadata: { email_hash: hashEmail(email) } });
  redirect("/register/check-email");
}

export async function logout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  await logAudit({ action: "logout" });
  // Global sign-out: invalidate refresh tokens on all devices.
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) console.error("[auth.logout]", { message: error.message });
  redirect("/login");
}

// ============================================================================
// Password reset — request flow
// ============================================================================
export async function requestPasswordReset(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const supabase = await createClient();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) {
    return { error: "Email je obavezan." };
  }

  const meta = await getRequestMeta();
  const ipKey = meta.ip ?? "unknown";
  const limitByIp = await checkRateLimit("passwordReset", `ip:${ipKey}`);
  const limitByEmail = await checkRateLimit("passwordReset", `email:${email}`);
  if (!limitByIp.allowed || !limitByEmail.allowed) {
    // Still return generic success to avoid enumeration.
    return { success: true };
  }

  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteUrl ? `${siteUrl}/auth/reset-password` : undefined,
  });

  if (error) {
    console.error("[auth.requestPasswordReset]", {
      code: error.code,
      message: error.message,
    });
  }

  await logAudit({
    action: "register.failed", // reuse existing enum until we extend it; metadata distinguishes
    metadata: { event: "password.reset_requested", email_hash: hashEmail(email) },
  });

  // ALWAYS generic success message.
  return { success: true };
}

// ============================================================================
// Password reset — complete with new password (after clicking email link)
// ============================================================================
export async function completePasswordReset(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const confirm = formData.get("password_confirm") as string;

  if (!password || password !== confirm) {
    return { error: "Lozinke se ne poklapaju." };
  }
  if (password.length < 12) {
    return { error: "Lozinka mora imati najmanje 12 karaktera." };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return { error: "Lozinka mora sadržati slova, brojeve i simbol." };
  }

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { error: "Sesija je istekla. Zatražite novu reset poruku." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[auth.completePasswordReset]", { code: error.code });
    return { error: "Greška pri postavljanju nove lozinke." };
  }

  // Invalidate all other sessions.
  await supabase.auth.signOut({ scope: "others" });
  await logAudit({
    action: "register.success",
    metadata: { event: "password.reset_completed" },
  });

  return { success: true };
}

// ============================================================================
// Password change (logged-in user, settings page)
// ============================================================================
export async function changePassword(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const supabase = await createClient();
  const currentPassword = formData.get("current_password") as string;
  const newPassword = formData.get("new_password") as string;
  const confirm = formData.get("new_password_confirm") as string;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { error: "Niste prijavljeni." };
  }

  if (!currentPassword || !newPassword || newPassword !== confirm) {
    return { error: "Sva polja su obavezna i nove lozinke moraju biti iste." };
  }
  if (newPassword.length < 12 ||
      !/[A-Za-z]/.test(newPassword) ||
      !/\d/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)) {
    return { error: "Nova lozinka: min 12 karaktera, slova + brojevi + simbol." };
  }
  if (newPassword === currentPassword) {
    return { error: "Nova lozinka ne sme biti ista kao trenutna." };
  }

  // Re-authenticate with current password
  const reauth = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauth.error) {
    await logAudit({
      action: "login.failed",
      metadata: { event: "password.change_reauth_failed" },
      success: false,
    });
    return { error: "Trenutna lozinka nije tačna." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    console.error("[auth.changePassword]", { code: error.code });
    return { error: "Greška pri promeni lozinke." };
  }

  await supabase.auth.signOut({ scope: "others" });
  await logAudit({ action: "profile.updated", metadata: { event: "password.changed" } });
  return { success: true };
}

// Cryptographic pseudonymization for audit-log correlation without storing
// the email. HMAC-SHA-256 keyed by AUDIT_EMAIL_HMAC_KEY (server-only). Output
// is non-reversible without the key.
//
// Fail-soft: if the key is missing in production we still want login to work.
// The audit row gets a placeholder hash so the event is still recorded; an
// operator alert is emitted via console for ops to act on.
function hashEmail(email: string): string {
  const key = process.env.AUDIT_EMAIL_HMAC_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.error("[auth.hashEmail] AUDIT_EMAIL_HMAC_KEY missing — using degraded placeholder");
      return "e:unkeyed";
    }
    return "e:dev";
  }
  return "e" + createHmac("sha256", key).update(email.toLowerCase()).digest("base64url").slice(0, 16);
}

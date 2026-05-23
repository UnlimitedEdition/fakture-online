"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit-log";
import { getRequestMeta } from "@/lib/request-meta";

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

  if (!email || !password || !fullName) {
    return { error: "Sva polja su obavezna." };
  }

  if (password.length < 10) {
    return { error: "Lozinka mora imati najmanje 10 karaktera." };
  }

  const meta = await getRequestMeta();
  const ipKey = meta.ip ?? "unknown";
  const limit = await checkRateLimit("register", `ip:${ipKey}`);
  if (!limit.allowed) {
    await logAudit({
      action: "register.failed",
      metadata: { reason: "rate_limit" },
      success: false,
    });
    return { error: "Previše pokušaja registracije. Sačekajte sat vremena." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
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
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await logAudit({ action: "logout" });
  const { error } = await supabase.auth.signOut();
  if (error) console.error("[auth.logout]", { message: error.message });
  redirect("/login");
}

// Stable, non-reversible token for audit-log correlation without storing email.
function hashEmail(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) | 0;
  }
  return `e${(hash >>> 0).toString(36)}`;
}

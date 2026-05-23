// Boot-time env validation. Throws on first import if production is misconfigured.
// Imported once from instrumentation.ts.

type Spec = {
  name: string;
  required: boolean;
  pattern?: RegExp;
  description?: string;
};

const SPECS: Spec[] = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", required: true, pattern: /^https:\/\/[a-z0-9-]+\.supabase\.co$/ },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true, pattern: /^[A-Za-z0-9._-]{40,}$/ },
  { name: "SUPABASE_SERVICE_ROLE_KEY", required: true, pattern: /^[A-Za-z0-9._-]{40,}$/ },
  { name: "NEXT_PUBLIC_SITE_URL", required: true, pattern: /^https:\/\/[a-z0-9.-]+(:\d+)?$/ },
  { name: "SEF_KEY_ENCRYPTION_KEY", required: true, pattern: /^[0-9a-fA-F]{64}$/ },
  { name: "SEF_CRON_SECRET", required: true, pattern: /^[A-Za-z0-9._-]{32,}$/ },
  { name: "AUDIT_EMAIL_HMAC_KEY", required: true, pattern: /^[0-9a-fA-F]{32,}$/ },
  { name: "UPSTASH_REDIS_REST_URL", required: true, pattern: /^https:\/\/[a-z0-9.-]+\.upstash\.io$/ },
  { name: "UPSTASH_REDIS_REST_TOKEN", required: true, pattern: /^[A-Za-z0-9._=-]{20,}$/ },
  { name: "ADMIN_EMAILS", required: false },
  { name: "RESEND_API_KEY", required: false, pattern: /^re_[A-Za-z0-9_]+$/ },
  { name: "NOTIFICATION_EMAIL", required: false, pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ },
  { name: "KJS_REGISTRY_URL", required: false, pattern: /^https:\/\/[a-z0-9.-]+\.gov\.rs(\/.*)?$/ },
];

export function validateEnv(): string[] {
  const errors: string[] = [];
  for (const spec of SPECS) {
    const v = process.env[spec.name];
    if (!v || v.length === 0) {
      if (spec.required) {
        errors.push(`Missing required env: ${spec.name}`);
      }
      continue;
    }
    if (spec.pattern && !spec.pattern.test(v)) {
      errors.push(`Env ${spec.name} has invalid format`);
    }
  }
  return errors;
}

// Call from instrumentation.ts on production cold start.
export function assertEnvOrCrash() {
  if (process.env.NODE_ENV !== "production") return;
  const errors = validateEnv();
  if (errors.length === 0) return;
  for (const e of errors) console.error(`[env] ${e}`);
  // Fail-loud and refuse to serve requests.
  throw new Error(
    `Production env validation failed (${errors.length} errors). See logs.`,
  );
}

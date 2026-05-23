import { createClient } from "@/lib/supabase/server";
import { getRequestMeta } from "@/lib/request-meta";

export type AuditAction =
  | "login.success"
  | "login.failed"
  | "register.success"
  | "register.failed"
  | "logout"
  | "admin.access"
  | "admin.denied"
  | "invoice.created"
  | "invoice.updated"
  | "invoice.status_changed"
  | "invoice.deleted"
  | "invoice.email_sent"
  | "client.created"
  | "client.updated"
  | "client.deleted"
  | "profile.updated"
  | "signup.received"
  | "mfa.enroll_started"
  | "mfa.enroll_verified"
  | "mfa.enroll_failed"
  | "mfa.unenrolled"
  | "mfa.challenge_success"
  | "mfa.challenge_failed";

type AuditArgs = {
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  success?: boolean;
};

export async function logAudit(args: AuditArgs) {
  try {
    const supabase = await createClient();
    const meta = await getRequestMeta();
    await supabase.rpc("fo_log_audit", {
      p_action: args.action,
      p_resource_type: args.resourceType ?? null,
      p_resource_id: args.resourceId ?? null,
      p_ip: meta.ip,
      p_user_agent: meta.userAgent,
      p_metadata: (args.metadata ?? {}) as never,
      p_success: args.success ?? true,
    });
  } catch (err) {
    // Audit logging must never break the calling request.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[audit] write failed", { action: args.action, message });
  }
}

"use server";

import { requireUser, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit-log";
import { loadSefCredentials } from "@/lib/sef/credentials";
import {
  encryptSefApiKey,
  generateRandomSecret,
  sha256Hex,
} from "@/lib/sef/key-encryption";
import { validateInvoiceInput } from "@/lib/sef/validate";
import { buildSefXml } from "@/lib/sef/ubl";
import { buildSefInvoiceInput } from "@/lib/sef/from-db";
import { archiveXml } from "@/lib/sef/archive";
import { sefSendInvoice } from "@/lib/sef/api/send-invoice";
import { sefCancelInvoice } from "@/lib/sef/api/cancel";
import { sefStornoInvoice } from "@/lib/sef/api/storno";
import { sefGetInvoice, parseStatusResponse } from "@/lib/sef/api/get-status";
import { sefGetSignedXml } from "@/lib/sef/api/get-xml";
import { sefCheckCompany } from "@/lib/sef/api/company";
import { sefInboxAction } from "@/lib/sef/api/inbox-action";
import type { SefApiCallKind, SefDocType } from "@/lib/sef/types";

interface ApiCallLogArgs {
  invoiceId?: string;
  inboxId?: string;
  callKind: SefApiCallKind;
  endpoint: string;
  httpStatus: number;
  requestHash?: string;
  response: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  retryAttempt?: number;
  idempotencyKey?: string;
  isDemo: boolean;
}

async function logSefApiCall(args: ApiCallLogArgs) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("fo_sef_log_api_call", {
    p_invoice_id: args.invoiceId ?? null,
    p_inbox_id: args.inboxId ?? null,
    p_call_kind: args.callKind,
    p_endpoint: args.endpoint,
    p_http_status: args.httpStatus,
    p_request_hash: args.requestHash ?? null,
    p_response: args.response as never,
    p_duration_ms: args.durationMs,
    p_success: args.success,
    p_error_code: args.errorCode ?? null,
    p_error_message: args.errorMessage ?? null,
    p_retry_attempt: args.retryAttempt ?? 0,
    p_idempotency_key: args.idempotencyKey ?? null,
    p_is_demo: args.isDemo,
  });
  if (error) {
    console.error("[sef.audit]", { code: error.code, message: error.message });
  }
}

async function recordStatusChange(args: {
  invoiceId: string;
  status: "nacrt" | "slanje" | "poslato" | "odobreno" | "odbijeno" | "storniran" | "otkazan" | "greska";
  sefDocumentId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("fo_sef_record_status_change", {
    p_invoice_id: args.invoiceId,
    p_status: args.status,
    p_sef_document_id: args.sefDocumentId ?? null,
    p_error_code: args.errorCode ?? null,
    p_error_message: args.errorMessage ?? null,
  });
  if (error) {
    console.error("[sef.status]", { code: error.code, message: error.message });
  }
}

// ============================================================================
// setSefApiKey — store encrypted SEF API key on the user's profile
// ============================================================================
export async function setSefApiKey(formData: FormData) {
  const { supabase, user } = await requireUser();
  const apiKey = (formData.get("api_key") as string)?.trim();
  const demoMode = formData.get("demo_mode") === "true";
  const isBudgetUser = formData.get("is_budget_user") === "true";
  const jbkjs = ((formData.get("jbkjs") as string) || "").trim() || null;

  if (!apiKey || apiKey.length < 16) {
    return { error: "SEF API ključ izgleda neispravno (premali)." };
  }

  let encrypted: { ciphertext: string; iv: string };
  try {
    encrypted = await encryptSefApiKey(apiKey);
  } catch (err) {
    console.error("[sef.setKey.encrypt]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return { error: "Greška pri enkripciji ključa. Proverite SEF_KEY_ENCRYPTION_KEY env var." };
  }

  const callbackSecret = generateRandomSecret(32);

  const { error } = await supabase
    .from("fo_profiles")
    .update({
      sef_api_key_encrypted: encrypted.ciphertext,
      sef_api_key_iv: encrypted.iv,
      sef_demo_mode: demoMode,
      sef_callback_secret: callbackSecret,
      is_budget_user: isBudgetUser,
      jbkjs,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[sef.setKey.update]", { code: error.code, message: error.message });
    return { error: "Greška pri čuvanju ključa." };
  }

  await logAudit({
    action: "profile.updated",
    resourceType: "sef_key",
    metadata: { demo_mode: demoMode },
  });

  revalidatePath("/podesavanja/sef");
  return { success: true };
}

export async function removeSefApiKey() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("fo_profiles")
    .update({
      sef_api_key_encrypted: null,
      sef_api_key_iv: null,
      sef_callback_secret: null,
    })
    .eq("id", user.id);
  if (error) return { error: "Greška pri uklanjanju ključa." };
  await logAudit({ action: "profile.updated", resourceType: "sef_key_removed" });
  revalidatePath("/podesavanja/sef");
  return { success: true };
}

// ============================================================================
// checkClientSefEligibility — verify a client PIB is registered on SEF
// ============================================================================
export async function checkClientSefEligibility(clientId: string) {
  const { supabase, user } = await requireUser();
  const creds = await loadSefCredentials(user.id);
  if (!creds) {
    return { error: "Postavite SEF API ključ u podešavanjima." };
  }

  const { data: client, error: cErr } = await supabase
    .from("fo_clients")
    .select("pib, jbkjs")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();

  if (cErr || !client?.pib) {
    return { error: "Klijent nije pronađen ili nema PIB." };
  }

  const res = await sefCheckCompany({ creds, pib: client.pib, jbkjs: client.jbkjs ?? undefined });

  await logSefApiCall({
    callKind: "check_company",
    endpoint: "/CheckIfCompanyRegisteredOnEfaktura",
    httpStatus: res.httpStatus,
    response: { registered: res.data?.Registered },
    durationMs: res.durationMs,
    success: res.ok,
    errorMessage: res.errorMessage,
    isDemo: creds.isDemo,
  });

  if (!res.ok) {
    return { error: res.errorMessage ?? "Greška pri proveri SEF registracije." };
  }

  const registered = res.data?.Registered === true;
  await supabase
    .from("fo_clients")
    .update({
      sef_registered: registered,
      sef_last_checked_at: new Date().toISOString(),
    })
    .eq("id", clientId)
    .eq("user_id", user.id);

  revalidatePath(`/klijenti/${clientId}`);
  return { success: true, registered };
}

// ============================================================================
// sendInvoiceToSef — full pipeline: validate → build XML → archive → POST → status
// ============================================================================
export async function sendInvoiceToSef(invoiceId: string, documentType: SefDocType = "invoice") {
  const { supabase, user } = await requireUser();
  const creds = await loadSefCredentials(user.id);
  if (!creds) {
    return { error: "Postavite SEF API ključ u podešavanjima." };
  }

  // Load invoice, client, profile, items, optional billing reference.
  const [invoiceRes, profileRes] = await Promise.all([
    supabase
      .from("fo_invoices")
      .select("*, client:fo_clients(*)")
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single(),
    supabase.rpc("fo_get_profile"),
  ]);

  if (invoiceRes.error || !invoiceRes.data) {
    return { error: "Faktura nije pronađena." };
  }
  const invoice = invoiceRes.data;
  const client = invoice.client;
  const profile = profileRes.data;
  if (!profile) {
    return { error: "Profil firme nije popunjen." };
  }

  if (invoice.sef_status && ["poslato", "odobreno", "slanje"].includes(invoice.sef_status)) {
    return { error: "Faktura je već poslata SEF-u." };
  }

  const { data: items, error: itemsErr } = await supabase
    .from("fo_invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("sort_order");
  if (itemsErr || !items) {
    return { error: "Stavke fakture nisu učitane." };
  }

  let billingReference: { invoice_number: string; issue_date: string } | null = null;
  if (invoice.sef_billing_reference_id) {
    const { data: ref } = await supabase
      .from("fo_invoices")
      .select("invoice_number, issue_date")
      .eq("id", invoice.sef_billing_reference_id)
      .eq("user_id", user.id)
      .single();
    billingReference = ref ?? null;
  }

  const input = buildSefInvoiceInput({
    documentType,
    profile,
    client,
    invoice,
    items,
    billingReference,
  });

  const validation = validateInvoiceInput(input);
  if (!validation.ok) {
    const firstIssues = validation.issues.slice(0, 3).map((i) => `${i.field}: ${i.message}`).join("; ");
    await recordStatusChange({
      invoiceId,
      status: "greska",
      errorCode: "VALIDATION",
      errorMessage: firstIssues,
    });
    return {
      error: `Pre-flight greška: ${firstIssues}`,
      validation: validation.issues,
    };
  }

  let xml: string;
  try {
    xml = buildSefXml(input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    await recordStatusChange({ invoiceId, status: "greska", errorCode: "BUILD", errorMessage: msg });
    return { error: `Greška pri generisanju XML-a: ${msg}` };
  }

  // Archive outgoing XML before send.
  let archive: Awaited<ReturnType<typeof archiveXml>> | null = null;
  try {
    archive = await archiveXml({
      invoiceId,
      userId: user.id,
      xml,
      kind: "sent",
    });
  } catch (err) {
    console.error("[sef.send.archive]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    // Don't fail the send if archiving has a transient issue, but log.
  }

  if (archive) {
    await supabase
      .from("fo_invoices")
      .update({ sef_archive_path: archive.storagePath, sef_document_type: documentType })
      .eq("id", invoiceId)
      .eq("user_id", user.id);
  }

  await recordStatusChange({ invoiceId, status: "slanje" });

  const requestHash = await sha256Hex(xml);
  const res = await sefSendInvoice({
    creds,
    xml,
    invoiceNumber: invoice.invoice_number,
    idempotencyKey: requestHash.slice(0, 32),
  });

  await logSefApiCall({
    invoiceId,
    callKind: "send_invoice",
    endpoint: "/sales-invoice/ubl",
    httpStatus: res.httpStatus,
    requestHash,
    response: res.data as Record<string, unknown> ?? {},
    durationMs: res.durationMs,
    success: res.ok,
    errorCode: res.errorCode,
    errorMessage: res.errorMessage,
    idempotencyKey: requestHash.slice(0, 32),
    isDemo: creds.isDemo,
  });

  if (!res.ok) {
    await recordStatusChange({
      invoiceId,
      status: "greska",
      errorCode: res.errorCode ?? "SEF_ERROR",
      errorMessage: res.errorMessage,
    });
    await logAudit({
      action: "invoice.email_sent", // reusing existing audit action enum
      resourceType: "sef_invoice",
      resourceId: invoiceId,
      success: false,
      metadata: { sef_error: res.errorMessage, status: res.httpStatus },
    });
    return { error: res.errorMessage ?? "SEF greška." };
  }

  const sefId = res.data?.SalesInvoiceId ?? res.data?.InvoiceId ?? null;
  await recordStatusChange({
    invoiceId,
    status: "poslato",
    sefDocumentId: sefId,
  });

  await logAudit({
    action: "invoice.email_sent",
    resourceType: "sef_invoice",
    resourceId: invoiceId,
    metadata: { sef_document_id: sefId, demo: creds.isDemo },
  });

  revalidatePath("/fakture");
  revalidatePath(`/fakture/${invoiceId}`);
  revalidatePath("/sef");
  return { success: true, sefDocumentId: sefId };
}

// ============================================================================
// cancelSefInvoice — POST /sales-invoice/cancel
// ============================================================================
export async function cancelSefInvoice(invoiceId: string, comment?: string) {
  const { supabase, user } = await requireUser();
  const creds = await loadSefCredentials(user.id);
  if (!creds) return { error: "Postavite SEF API ključ." };

  const { data: invoice } = await supabase
    .from("fo_invoices")
    .select("sef_document_id, sef_status")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (!invoice?.sef_document_id) return { error: "Faktura nije poslata SEF-u." };

  const res = await sefCancelInvoice({
    creds,
    salesInvoiceId: invoice.sef_document_id,
    comment,
  });

  await logSefApiCall({
    invoiceId,
    callKind: "cancel",
    endpoint: "/sales-invoice/cancel",
    httpStatus: res.httpStatus,
    response: (res.data as Record<string, unknown>) ?? {},
    durationMs: res.durationMs,
    success: res.ok,
    errorCode: res.errorCode,
    errorMessage: res.errorMessage,
    isDemo: creds.isDemo,
  });

  if (!res.ok) return { error: res.errorMessage ?? "Greška pri otkazivanju." };

  await recordStatusChange({ invoiceId, status: "otkazan" });
  revalidatePath("/fakture");
  revalidatePath(`/fakture/${invoiceId}`);
  revalidatePath("/sef");
  return { success: true };
}

// ============================================================================
// stornoSefInvoice — POST /sales-invoice/storno
// ============================================================================
export async function stornoSefInvoice(invoiceId: string, comment?: string) {
  const { supabase, user } = await requireUser();
  const creds = await loadSefCredentials(user.id);
  if (!creds) return { error: "Postavite SEF API ključ." };

  const { data: invoice } = await supabase
    .from("fo_invoices")
    .select("sef_document_id")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (!invoice?.sef_document_id) return { error: "Faktura nije poslata SEF-u." };

  const res = await sefStornoInvoice({
    creds,
    salesInvoiceId: invoice.sef_document_id,
    comment,
  });

  await logSefApiCall({
    invoiceId,
    callKind: "storno",
    endpoint: "/sales-invoice/storno",
    httpStatus: res.httpStatus,
    response: (res.data as Record<string, unknown>) ?? {},
    durationMs: res.durationMs,
    success: res.ok,
    errorCode: res.errorCode,
    errorMessage: res.errorMessage,
    isDemo: creds.isDemo,
  });

  if (!res.ok) return { error: res.errorMessage ?? "Greška pri storniranju." };

  await recordStatusChange({ invoiceId, status: "storniran" });
  revalidatePath("/fakture");
  revalidatePath(`/fakture/${invoiceId}`);
  revalidatePath("/sef");
  return { success: true };
}

// ============================================================================
// checkSefStatus — sync poll a single invoice's status + archive signed copy
// ============================================================================
export async function checkSefStatus(invoiceId: string) {
  const { supabase, user } = await requireUser();
  const creds = await loadSefCredentials(user.id);
  if (!creds) return { error: "Postavite SEF API ključ." };

  const { data: invoice } = await supabase
    .from("fo_invoices")
    .select("sef_document_id, sef_status, sef_signed_archive_path")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (!invoice?.sef_document_id) return { error: "Faktura nije poslata SEF-u." };

  const res = await sefGetInvoice({ creds, salesInvoiceId: invoice.sef_document_id });
  const parsed = parseStatusResponse(res);

  await logSefApiCall({
    invoiceId,
    callKind: "get_status",
    endpoint: "/sales-invoice",
    httpStatus: res.httpStatus,
    response: (res.data as Record<string, unknown>) ?? {},
    durationMs: res.durationMs,
    success: res.ok,
    errorCode: res.errorCode,
    errorMessage: res.errorMessage ?? parsed.errorMessage ?? undefined,
    isDemo: creds.isDemo,
  });

  if (!res.ok || !parsed.status) {
    return { error: res.errorMessage ?? "Greška pri proveri statusa." };
  }

  await recordStatusChange({
    invoiceId,
    status: parsed.status,
    errorMessage: parsed.errorMessage,
  });

  // If status is "odobreno" or terminal, fetch + archive the SEF-signed XML.
  if (
    !invoice.sef_signed_archive_path &&
    ["odobreno", "odbijeno", "storniran"].includes(parsed.status)
  ) {
    const sig = await sefGetSignedXml({ creds, salesInvoiceId: invoice.sef_document_id });
    if (sig.ok && sig.raw) {
      try {
        const archive = await archiveXml({
          invoiceId,
          userId: user.id,
          xml: sig.raw,
          kind: "signed",
        });
        await supabase
          .from("fo_invoices")
          .update({ sef_signed_archive_path: archive.storagePath })
          .eq("id", invoiceId)
          .eq("user_id", user.id);
      } catch (err) {
        console.error("[sef.checkStatus.signedArchive]", {
          message: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }

  revalidatePath(`/fakture/${invoiceId}`);
  revalidatePath("/sef");
  return { success: true, status: parsed.status };
}

// ============================================================================
// acceptSefInbound / rejectSefInbound
// ============================================================================
async function inboxActionInternal(
  inboxId: string,
  action: "Accept" | "Reject",
  reason?: string,
) {
  const { supabase, user } = await requireUser();
  const creds = await loadSefCredentials(user.id);
  if (!creds) return { error: "Postavite SEF API ključ." };

  const { data: inbox } = await supabase
    .from("fo_sef_inbox")
    .select("sef_document_id")
    .eq("id", inboxId)
    .eq("user_id", user.id)
    .single();

  if (!inbox?.sef_document_id) return { error: "Primljena faktura nije pronađena." };

  const res = await sefInboxAction({
    creds,
    purchaseInvoiceId: inbox.sef_document_id,
    action,
    comment: reason,
  });

  await logSefApiCall({
    inboxId,
    callKind: "inbox_action",
    endpoint: "/purchase-invoice/acceptRejectPurchaseInvoice",
    httpStatus: res.httpStatus,
    response: (res.data as Record<string, unknown>) ?? {},
    durationMs: res.durationMs,
    success: res.ok,
    errorCode: res.errorCode,
    errorMessage: res.errorMessage,
    isDemo: creds.isDemo,
  });

  if (!res.ok) return { error: res.errorMessage ?? "Greška." };

  const { error } = await supabase.rpc("fo_sef_inbox_decide", {
    p_inbox_id: inboxId,
    p_action: action === "Accept" ? "accepted" : "rejected",
    p_reason: reason ?? null,
  });
  if (error) console.error("[sef.inbox.decide]", { code: error.code });

  revalidatePath("/sef/inbox");
  revalidatePath(`/sef/inbox/${inboxId}`);
  return { success: true };
}

export async function acceptSefInbound(inboxId: string) {
  return inboxActionInternal(inboxId, "Accept");
}

export async function rejectSefInbound(inboxId: string, reason: string) {
  if (!reason || reason.trim().length < 3) {
    return { error: "Razlog odbijanja je obavezan (min 3 znaka)." };
  }
  return inboxActionInternal(inboxId, "Reject", reason);
}

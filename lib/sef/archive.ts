// Archive SEF XML files in Supabase Storage (bucket: sef-xml) with
// 10-year retention. Metadata is recorded in fo_sef_archive via RPC.

import { createClient } from "@/lib/supabase/server";
import { sha256Hex } from "./key-encryption";

const BUCKET = "sef-xml";

export interface ArchiveResult {
  storagePath: string;
  sha256: string;
  bytes: number;
}

export async function archiveXml(args: {
  invoiceId?: string;
  inboxId?: string;
  userId: string;
  xml: string;
  kind: "sent" | "signed" | "received";
}): Promise<ArchiveResult> {
  const supabase = await createClient();

  const sha = await sha256Hex(args.xml);
  const bytes = Buffer.byteLength(args.xml, "utf8");
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const refId = args.invoiceId ?? args.inboxId ?? "misc";
  const path = `${args.userId}/${yyyy}/${mm}/${dd}/${args.kind}/${refId}-${sha.slice(0, 16)}.xml`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, args.xml, {
      contentType: "application/xml",
      upsert: false,
    });

  if (uploadError && !uploadError.message?.toLowerCase().includes("already exists")) {
    throw new Error(`SEF archive upload failed: ${uploadError.message}`);
  }

  const { error: rpcError } = await supabase.rpc("fo_sef_record_archive", {
    p_invoice_id: args.invoiceId ?? null,
    p_inbox_id: args.inboxId ?? null,
    p_storage_path: path,
    p_kind: args.kind,
    p_sha256: sha,
    p_bytes: bytes,
  });

  if (rpcError) {
    throw new Error(`SEF archive metadata insert failed: ${rpcError.message}`);
  }

  return { storagePath: path, sha256: sha, bytes };
}

// Fetch archived XML by storage path (used for re-display, re-send, or audit).
export async function fetchArchivedXml(storagePath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) return null;
  return await data.text();
}

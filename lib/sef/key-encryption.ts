// AES-GCM encryption of per-user SEF API keys at rest.
//
// Versioned master keys
// ---------------------
// Each ciphertext is tagged with a key-version integer (`kv`) that lives in
// the `fo_profiles.sef_api_key_kv` column. The kv selects which master key
// env var to use:
//
//   kv = 1  →  SEF_KEY_ENCRYPTION_KEY_V1   (legacy / optional fallback)
//   kv = 2  →  SEF_KEY_ENCRYPTION_KEY      (current; used for all new writes)
//
// To rotate the master key:
//   1. Move the current SEF_KEY_ENCRYPTION_KEY into SEF_KEY_ENCRYPTION_KEY_V1.
//   2. Set SEF_KEY_ENCRYPTION_KEY to the new value.
//   3. Run reencryptKey() (e.g. via /admin) for every profile with kv=1.
//   4. Drop SEF_KEY_ENCRYPTION_KEY_V1 from the environment.
//
// kv-1 decrypts log a warning so operators can spot pending re-encrypts.

import { webcrypto } from "node:crypto";

const ALGO = "AES-GCM";
const IV_BYTES = 12;
const KEY_BYTES = 32;

// kv used for any new encryption performed by this module.
export const CURRENT_KV = 2;
// kv assigned to any row decrypted with the legacy env var.
export const LEGACY_KV = 1;

type SupportedKv = typeof CURRENT_KV | typeof LEGACY_KV;

const keyCache = new Map<SupportedKv, CryptoKey>();

function envForKv(kv: SupportedKv): string | undefined {
  if (kv === CURRENT_KV) return process.env.SEF_KEY_ENCRYPTION_KEY;
  if (kv === LEGACY_KV) return process.env.SEF_KEY_ENCRYPTION_KEY_V1;
  return undefined;
}

async function getMasterKey(kv: SupportedKv): Promise<CryptoKey> {
  const cached = keyCache.get(kv);
  if (cached) return cached;

  const hex = envForKv(kv);
  if (!hex) {
    const envName =
      kv === CURRENT_KV ? "SEF_KEY_ENCRYPTION_KEY" : "SEF_KEY_ENCRYPTION_KEY_V1";
    throw new Error(
      `${envName} env var is required for kv=${kv} (64 hex chars = 32 bytes).`,
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    const envName =
      kv === CURRENT_KV ? "SEF_KEY_ENCRYPTION_KEY" : "SEF_KEY_ENCRYPTION_KEY_V1";
    throw new Error(
      `${envName} must be exactly 64 hex characters (32 bytes).`,
    );
  }

  const raw = new Uint8Array(KEY_BYTES);
  for (let i = 0; i < KEY_BYTES; i++) {
    raw[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  const key = await webcrypto.subtle.importKey(
    "raw",
    raw,
    { name: ALGO, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  keyCache.set(kv, key);
  return key;
}

// Resolve the highest kv whose env var is present. Used when encrypting new
// values: we always pick the newest available master key.
function highestAvailableKv(): SupportedKv {
  if (envForKv(CURRENT_KV)) return CURRENT_KV;
  if (envForKv(LEGACY_KV)) return LEGACY_KV;
  // Mirror the original error so failure mode stays familiar.
  throw new Error(
    "SEF_KEY_ENCRYPTION_KEY env var is required (64 hex chars = 32 bytes).",
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export async function encryptSefApiKey(
  plaintext: string,
): Promise<{ ciphertext: string; iv: string; kv: SupportedKv }> {
  if (!plaintext) throw new Error("plaintext required");
  const kv = highestAvailableKv();
  const key = await getMasterKey(kv);
  const iv = webcrypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = new TextEncoder().encode(plaintext);

  const cipherBuf = await webcrypto.subtle.encrypt({ name: ALGO, iv }, key, data);

  return {
    ciphertext: bytesToBase64(new Uint8Array(cipherBuf)),
    iv: bytesToBase64(iv),
    kv,
  };
}

export async function decryptSefApiKey(
  ciphertext: string,
  iv: string,
  kv: number = LEGACY_KV,
): Promise<string> {
  if (!ciphertext || !iv) throw new Error("ciphertext and iv required");
  if (kv !== CURRENT_KV && kv !== LEGACY_KV) {
    throw new Error(`unsupported kv=${kv} (expected 1 or 2)`);
  }

  const key = await getMasterKey(kv);
  const ivBytes = base64ToBytes(iv);
  const cipherBytes = base64ToBytes(ciphertext);

  const plainBuf = await webcrypto.subtle.decrypt(
    { name: ALGO, iv: ivBytes },
    key,
    cipherBytes,
  );

  if (kv === LEGACY_KV) {
    // Visible to operators in server logs — flags rows that still need
    // re-encryption after a master-key rotation.
    console.warn("[sef.key-encryption] decrypted legacy kv=1 row — schedule reencryptKey()");
  }

  return new TextDecoder().decode(plainBuf);
}

// ----------------------------------------------------------------------------
// reencryptKey(profileId)
//   Server-only helper: pulls a fo_profiles row, decrypts its SEF API key with
//   whichever kv it was stored under, re-encrypts with the current kv, and
//   writes it back. Intended to be wired up to an /admin server action later.
//   Imports Supabase server client lazily so this module stays usable from
//   non-Next test contexts.
// ----------------------------------------------------------------------------
export async function reencryptKey(
  profileId: string,
): Promise<{ ok: true; oldKv: number; newKv: number } | { ok: false; reason: string }> {
  const { createServerClient } = await import("@supabase/ssr");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { ok: false, reason: "SUPABASE_SERVICE_ROLE_KEY not configured" };
  }
  const supabase = createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });

  const { data, error } = await supabase
    .from("fo_profiles")
    .select("sef_api_key_encrypted, sef_api_key_iv, sef_api_key_kv")
    .eq("id", profileId)
    .single();

  if (error || !data) return { ok: false, reason: "profile not found" };
  if (!data.sef_api_key_encrypted || !data.sef_api_key_iv) {
    return { ok: false, reason: "no encrypted key on this profile" };
  }

  const oldKv = (data.sef_api_key_kv ?? LEGACY_KV) as SupportedKv;
  if (oldKv === CURRENT_KV) {
    return { ok: false, reason: "already at current kv" };
  }

  const plain = await decryptSefApiKey(
    data.sef_api_key_encrypted,
    data.sef_api_key_iv,
    oldKv,
  );
  const reEnc = await encryptSefApiKey(plain);

  const { error: updErr } = await supabase
    .from("fo_profiles")
    .update({
      sef_api_key_encrypted: reEnc.ciphertext,
      sef_api_key_iv: reEnc.iv,
      sef_api_key_kv: reEnc.kv,
    })
    .eq("id", profileId);

  if (updErr) return { ok: false, reason: `update failed: ${updErr.code}` };
  return { ok: true, oldKv, newKv: reEnc.kv };
}

// Quick utility to generate a random secret (e.g. callback secret).
export function generateRandomSecret(bytes = 32): string {
  const buf = webcrypto.getRandomValues(new Uint8Array(bytes));
  return Buffer.from(buf).toString("hex");
}

// SHA-256 of a string, hex-encoded.
export async function sha256Hex(input: string): Promise<string> {
  const buf = await webcrypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Buffer.from(new Uint8Array(buf)).toString("hex");
}

// Test-only: clear the in-memory key cache (e.g. between env-var swaps in
// vitest). Not exported via index; importable by name from tests.
export function __resetKeyCacheForTests(): void {
  keyCache.clear();
}

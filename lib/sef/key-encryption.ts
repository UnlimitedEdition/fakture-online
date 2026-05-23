// AES-GCM encryption of per-user SEF API keys at rest.
// The master key is held in SEF_KEY_ENCRYPTION_KEY env var (32 raw bytes, hex-encoded).
// Ciphertext + IV are stored separately in fo_profiles columns.

import { webcrypto } from "node:crypto";

const ALGO = "AES-GCM";
const IV_BYTES = 12;
const KEY_BYTES = 32;

let cachedKey: CryptoKey | null = null;

async function getMasterKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const hex = process.env.SEF_KEY_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "SEF_KEY_ENCRYPTION_KEY env var is required (64 hex chars = 32 bytes).",
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "SEF_KEY_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).",
    );
  }

  const raw = new Uint8Array(KEY_BYTES);
  for (let i = 0; i < KEY_BYTES; i++) {
    raw[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  cachedKey = await webcrypto.subtle.importKey(
    "raw",
    raw,
    { name: ALGO, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return cachedKey;
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export async function encryptSefApiKey(
  plaintext: string,
): Promise<{ ciphertext: string; iv: string }> {
  if (!plaintext) throw new Error("plaintext required");
  const key = await getMasterKey();
  const iv = webcrypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = new TextEncoder().encode(plaintext);

  const cipherBuf = await webcrypto.subtle.encrypt({ name: ALGO, iv }, key, data);

  return {
    ciphertext: bytesToBase64(new Uint8Array(cipherBuf)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptSefApiKey(
  ciphertext: string,
  iv: string,
): Promise<string> {
  if (!ciphertext || !iv) throw new Error("ciphertext and iv required");
  const key = await getMasterKey();
  const ivBytes = base64ToBytes(iv);
  const cipherBytes = base64ToBytes(ciphertext);

  const plainBuf = await webcrypto.subtle.decrypt(
    { name: ALGO, iv: ivBytes },
    key,
    cipherBytes,
  );
  return new TextDecoder().decode(plainBuf);
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

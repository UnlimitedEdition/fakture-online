import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  encryptSefApiKey,
  decryptSefApiKey,
  generateRandomSecret,
  sha256Hex,
  CURRENT_KV,
  LEGACY_KV,
  __resetKeyCacheForTests,
} from "./key-encryption";

const KEY_V1 = "11".repeat(32); // 64 hex chars
const KEY_V2 = "22".repeat(32); // 64 hex chars
const SAMPLE_API_KEY = "sef_live_test_api_key_with_enough_length_xyz";

const ORIGINAL_ENV = {
  v: process.env.SEF_KEY_ENCRYPTION_KEY,
  v1: process.env.SEF_KEY_ENCRYPTION_KEY_V1,
};

function setEnv(opts: { current?: string; legacy?: string }) {
  if (opts.current === undefined) {
    delete process.env.SEF_KEY_ENCRYPTION_KEY;
  } else {
    process.env.SEF_KEY_ENCRYPTION_KEY = opts.current;
  }
  if (opts.legacy === undefined) {
    delete process.env.SEF_KEY_ENCRYPTION_KEY_V1;
  } else {
    process.env.SEF_KEY_ENCRYPTION_KEY_V1 = opts.legacy;
  }
  __resetKeyCacheForTests();
}

beforeEach(() => {
  setEnv({ current: KEY_V2, legacy: KEY_V1 });
});

afterEach(() => {
  if (ORIGINAL_ENV.v === undefined) {
    delete process.env.SEF_KEY_ENCRYPTION_KEY;
  } else {
    process.env.SEF_KEY_ENCRYPTION_KEY = ORIGINAL_ENV.v;
  }
  if (ORIGINAL_ENV.v1 === undefined) {
    delete process.env.SEF_KEY_ENCRYPTION_KEY_V1;
  } else {
    process.env.SEF_KEY_ENCRYPTION_KEY_V1 = ORIGINAL_ENV.v1;
  }
  __resetKeyCacheForTests();
});

describe("encryptSefApiKey / decryptSefApiKey — kv=2 (current)", () => {
  it("round-trips at the current kv", async () => {
    const enc = await encryptSefApiKey(SAMPLE_API_KEY);
    expect(enc.kv).toBe(CURRENT_KV);
    expect(enc.ciphertext.length).toBeGreaterThan(0);
    expect(enc.iv.length).toBeGreaterThan(0);

    const plain = await decryptSefApiKey(enc.ciphertext, enc.iv, enc.kv);
    expect(plain).toBe(SAMPLE_API_KEY);
  });

  it("produces a fresh IV every call", async () => {
    const a = await encryptSefApiKey(SAMPLE_API_KEY);
    const b = await encryptSefApiKey(SAMPLE_API_KEY);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });
});

describe("decryptSefApiKey — kv=1 (legacy)", () => {
  it("round-trips through the legacy key when explicitly tagged kv=1", async () => {
    // Encrypt under V1 by temporarily hiding the current key.
    setEnv({ current: undefined, legacy: KEY_V1 });
    const enc = await encryptSefApiKey(SAMPLE_API_KEY);
    expect(enc.kv).toBe(LEGACY_KV);

    // Restore both env vars; the row's stored kv tells us which key to use.
    setEnv({ current: KEY_V2, legacy: KEY_V1 });
    const plain = await decryptSefApiKey(enc.ciphertext, enc.iv, LEGACY_KV);
    expect(plain).toBe(SAMPLE_API_KEY);
  });

  it("fails to decrypt a kv=1 ciphertext when called with kv=2", async () => {
    setEnv({ current: undefined, legacy: KEY_V1 });
    const enc = await encryptSefApiKey(SAMPLE_API_KEY);

    setEnv({ current: KEY_V2, legacy: KEY_V1 });
    await expect(
      decryptSefApiKey(enc.ciphertext, enc.iv, CURRENT_KV),
    ).rejects.toThrow();
  });
});

describe("encryptSefApiKey — prefers highest available kv", () => {
  it("uses kv=2 when both env vars are set", async () => {
    setEnv({ current: KEY_V2, legacy: KEY_V1 });
    const enc = await encryptSefApiKey(SAMPLE_API_KEY);
    expect(enc.kv).toBe(CURRENT_KV);
  });

  it("falls back to kv=1 when only the legacy key is configured", async () => {
    setEnv({ current: undefined, legacy: KEY_V1 });
    const enc = await encryptSefApiKey(SAMPLE_API_KEY);
    expect(enc.kv).toBe(LEGACY_KV);
  });

  it("throws when no master key env var is configured", async () => {
    setEnv({ current: undefined, legacy: undefined });
    await expect(encryptSefApiKey(SAMPLE_API_KEY)).rejects.toThrow(
      /SEF_KEY_ENCRYPTION_KEY/,
    );
  });
});

describe("decryptSefApiKey — input validation", () => {
  it("rejects empty inputs", async () => {
    await expect(decryptSefApiKey("", "iv", CURRENT_KV)).rejects.toThrow();
    await expect(decryptSefApiKey("ct", "", CURRENT_KV)).rejects.toThrow();
  });

  it("rejects unsupported kv values", async () => {
    const enc = await encryptSefApiKey(SAMPLE_API_KEY);
    await expect(
      decryptSefApiKey(enc.ciphertext, enc.iv, 99),
    ).rejects.toThrow(/unsupported kv/);
  });
});

describe("generateRandomSecret / sha256Hex", () => {
  it("generates hex secrets of the requested byte length", () => {
    expect(generateRandomSecret(16)).toMatch(/^[0-9a-f]{32}$/);
    expect(generateRandomSecret(32)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("computes a stable SHA-256 hex digest", async () => {
    // Known test vector: SHA-256("abc") = ba7816bf...
    const h = await sha256Hex("abc");
    expect(h).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

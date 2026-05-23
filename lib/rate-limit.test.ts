import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoisted shared mock for the Ratelimit constructor so we can introspect
// its `.limit()` behavior across re-imports.
const limitMock = vi.fn();

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow(_max: number, _window: string) {
      return { kind: "slidingWindow" };
    }
    constructor(public opts: unknown) {}
    limit(id: string) {
      return limitMock(id);
    }
  }
  return { Ratelimit };
});

vi.mock("@upstash/redis", () => {
  class Redis {
    constructor(public opts: unknown) {}
  }
  return { Redis };
});

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  limitMock.mockReset();
  // Strip out any inherited Upstash env so tests are deterministic
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.NODE_ENV;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("checkRateLimit — Upstash not configured", () => {
  it("returns {allowed: true} (fail-open) when env vars are missing", async () => {
    const { checkRateLimit } = await import("./rate-limit");
    const r = await checkRateLimit("login", "user@example.com");
    expect(r).toEqual({ allowed: true });
  });

  it("logs a CRITICAL error in production when Upstash is missing", async () => {
    process.env.NODE_ENV = "production";
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const { checkRateLimit } = await import("./rate-limit");
    await checkRateLimit("login", "user@example.com");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("CRITICAL"),
      expect.objectContaining({ kind: "login" }),
    );

    consoleSpy.mockRestore();
  });

  it("does NOT log in non-production when Upstash is missing", async () => {
    process.env.NODE_ENV = "development";
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const { checkRateLimit } = await import("./rate-limit");
    const r = await checkRateLimit("register", "ip:1.2.3.4");

    expect(r).toEqual({ allowed: true });
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe("checkRateLimit — Upstash configured", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
  });

  it("returns {allowed: false} when the limiter rejects the request", async () => {
    limitMock.mockResolvedValue({
      success: false,
      reset: 1234567890,
      remaining: 0,
    });

    const { checkRateLimit } = await import("./rate-limit");
    const r = await checkRateLimit("login", "user@example.com");

    expect(r.allowed).toBe(false);
    expect(r.reset).toBe(1234567890);
    expect(r.remaining).toBe(0);
    expect(limitMock).toHaveBeenCalledWith("user@example.com");
  });

  it("returns {allowed: true} with quota metadata when the limiter accepts", async () => {
    limitMock.mockResolvedValue({
      success: true,
      reset: 999,
      remaining: 4,
    });

    const { checkRateLimit } = await import("./rate-limit");
    const r = await checkRateLimit("invoiceMutate", "user-123");

    expect(r).toEqual({ allowed: true, reset: 999, remaining: 4 });
  });

  it("fails open (allowed: true) and logs when Upstash throws", async () => {
    limitMock.mockRejectedValue(new Error("network down"));
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const { checkRateLimit } = await import("./rate-limit");
    const r = await checkRateLimit("email", "user-456");

    expect(r).toEqual({ allowed: true });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("failing open"),
      expect.objectContaining({ kind: "email", message: "network down" }),
    );

    consoleSpy.mockRestore();
  });
});

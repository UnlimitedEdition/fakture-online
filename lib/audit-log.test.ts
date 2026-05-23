import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
const createClientMock = vi.fn(async () => ({ rpc: rpcMock }));
const getRequestMetaMock = vi.fn(async () => ({
  ip: "127.0.0.1",
  userAgent: "vitest-ua",
  origin: "http://localhost",
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/request-meta", () => ({
  getRequestMeta: getRequestMetaMock,
}));

// Import AFTER mocks are registered
const { logAudit } = await import("./audit-log");

describe("logAudit", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: null, error: null });
    createClientMock.mockClear();
    getRequestMetaMock.mockClear();
  });

  it("calls fo_log_audit RPC with the expected argument shape", async () => {
    await logAudit({
      action: "login.success",
      resourceType: "user",
      resourceId: "abc-123",
      metadata: { foo: "bar" },
      success: true,
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("fo_log_audit", {
      p_action: "login.success",
      p_resource_type: "user",
      p_resource_id: "abc-123",
      p_ip: "127.0.0.1",
      p_user_agent: "vitest-ua",
      p_metadata: { foo: "bar" },
      p_success: true,
    });
  });

  it("defaults p_metadata to {} when not provided", async () => {
    await logAudit({ action: "logout" });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    const call = rpcMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(call.p_metadata).toEqual({});
  });

  it("defaults p_success to true when not provided", async () => {
    await logAudit({ action: "invoice.created" });

    const call = rpcMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(call.p_success).toBe(true);
  });

  it("propagates success=false when explicitly set", async () => {
    await logAudit({ action: "login.failed", success: false });

    const call = rpcMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(call.p_success).toBe(false);
  });

  it("nulls out resource_type and resource_id when not provided", async () => {
    await logAudit({ action: "admin.access" });

    const call = rpcMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(call.p_resource_type).toBeNull();
    expect(call.p_resource_id).toBeNull();
  });

  it("propagates ip/userAgent from getRequestMeta into the RPC payload", async () => {
    getRequestMetaMock.mockResolvedValueOnce({
      ip: "10.0.0.1",
      userAgent: "Mozilla/5.0",
      origin: null,
    });
    await logAudit({ action: "register.success" });

    const call = rpcMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(call.p_ip).toBe("10.0.0.1");
    expect(call.p_user_agent).toBe("Mozilla/5.0");
  });

  it("swallows exceptions thrown by createClient (must never break the caller)", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    createClientMock.mockRejectedValueOnce(new Error("supabase down"));

    await expect(logAudit({ action: "logout" })).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("swallows exceptions thrown by the rpc call", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    rpcMock.mockRejectedValueOnce(new Error("rpc boom"));

    await expect(
      logAudit({ action: "invoice.deleted" }),
    ).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[audit] write failed",
      expect.objectContaining({ action: "invoice.deleted", message: "rpc boom" }),
    );

    consoleSpy.mockRestore();
  });

  it("swallows exceptions thrown by getRequestMeta", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    getRequestMetaMock.mockRejectedValueOnce(new Error("no headers"));

    await expect(
      logAudit({ action: "profile.updated" }),
    ).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

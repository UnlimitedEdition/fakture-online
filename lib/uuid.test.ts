import { describe, it, expect } from "vitest";
import { isUuid, assertUuid } from "./uuid";

describe("isUuid", () => {
  it("accepts a canonical v4 UUID", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("accepts a v1 UUID", () => {
    expect(isUuid("c232ab00-9414-11ec-b3c8-9e6bdeced846")).toBe(true);
  });

  it("accepts uppercase hex", () => {
    expect(isUuid("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("rejects empty string and null/undefined", () => {
    expect(isUuid("")).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });

  it("rejects garbage strings", () => {
    expect(isUuid("xxx")).toBe(false);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("550e8400-e29b-41d4-a716")).toBe(false); // too short
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000-extra")).toBe(false);
  });

  it("rejects SQL injection-shaped input", () => {
    expect(isUuid("'; drop table--")).toBe(false);
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000'; --")).toBe(false);
    expect(isUuid("1 OR 1=1")).toBe(false);
  });

  it("rejects non-string types", () => {
    expect(isUuid(123)).toBe(false);
    expect(isUuid({})).toBe(false);
    expect(isUuid([])).toBe(false);
  });

  it("rejects UUIDs with non-hex characters", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-44665544000g")).toBe(false);
  });
});

describe("assertUuid", () => {
  it("returns the value when valid", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(assertUuid(id)).toBe(id);
  });

  it("throws on invalid input", () => {
    expect(() => assertUuid("xxx")).toThrow(/Invalid id/);
    expect(() => assertUuid(null, "userId")).toThrow(/Invalid userId/);
  });
});

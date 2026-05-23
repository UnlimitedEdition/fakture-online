// Constant-time string comparison helpers.
// Plain `===` short-circuits per byte → timing oracle for header/secret auth.

import { timingSafeEqual } from "node:crypto";

export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null) return false;
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Still do a constant-time compare against a fixed-length buffer to avoid
    // length-leak via timing on the early-return path.
    const sink = Buffer.alloc(ab.length || 1);
    timingSafeEqual(ab.length ? ab : Buffer.alloc(1), sink.length ? sink : Buffer.alloc(1));
    return false;
  }
  return timingSafeEqual(ab, bb);
}

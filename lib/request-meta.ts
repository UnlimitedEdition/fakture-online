import { headers } from "next/headers";

export async function getRequestMeta() {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for") ?? "";
  const ip =
    forwardedFor.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    null;
  const userAgent = h.get("user-agent") || null;
  const origin = h.get("origin") || null;
  return { ip, userAgent, origin };
}

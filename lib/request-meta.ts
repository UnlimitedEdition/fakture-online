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

// Resolve the site URL used in transactional email links. Prefers the
// configured NEXT_PUBLIC_SITE_URL; falls back to inferring from the forwarded
// host so the app keeps working before the env var is set in Vercel.
export async function getSiteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host");
  if (host) return `${proto}://${host}`;
  return "";
}

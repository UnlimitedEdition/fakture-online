import { NextResponse } from "next/server";
import { validateEnv } from "@/lib/env";

// Public health probe. Lists which required env vars are missing or have
// an invalid format — does NOT reveal values. Safe to leave publicly
// reachable.
export const dynamic = "force-dynamic";

export async function GET() {
  const errors = validateEnv();
  return NextResponse.json(
    {
      status: errors.length === 0 ? "ok" : "misconfigured",
      env_errors: errors,
      ts: new Date().toISOString(),
    },
    {
      status: errors.length === 0 ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

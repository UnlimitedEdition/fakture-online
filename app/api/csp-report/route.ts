// CSP violation report receiver. Logs to console; later wire to a real
// reporter (Sentry, Logflare, Axiom).

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Tight rate of body parsing — CSP reports can spike.
const MAX_BODY = 16 * 1024;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    if (body.length > MAX_BODY) {
      return NextResponse.json({ ok: true }, { status: 204 });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = body.slice(0, 1024);
    }
    console.warn("[csp-report]", parsed);
  } catch {
    // swallow
  }
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return new NextResponse(null, { status: 405 });
}

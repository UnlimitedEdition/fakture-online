// Daily cron: refresh fo_sef_companies_registry from SEF + fo_kjs_registry from Treasury.
// Trigger: Vercel cron at 03:00 UTC. Auth via X-Cron-Secret header.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { loadSefCredentials } from "@/lib/sef/credentials";
import {
  sefListAllCompanies,
  unwrapCompanies,
  normaliseCompany,
} from "@/lib/sef/api/list-companies";

export const dynamic = "force-dynamic";

function authOk(req: NextRequest): boolean {
  const expected = process.env.SEF_CRON_SECRET;
  if (!expected) return false;
  return req.headers.get("x-cron-secret") === expected;
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Cron requires SUPABASE_SERVICE_ROLE_KEY.");
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const svc = serviceClient();

  // ---- SEF companies registry (uses any one user's API key — registry is global) ----
  const { data: profile } = await svc
    .from("fo_profiles")
    .select("id")
    .not("sef_api_key_encrypted", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let companiesUpdated = 0;
  if (profile) {
    const creds = await loadSefCredentials(profile.id);
    if (creds) {
      const res = await sefListAllCompanies(creds);
      if (res.ok) {
        const rows = unwrapCompanies(res.data);
        const normalised = rows
          .map(normaliseCompany)
          .filter((r) => r.pib);

        // Upsert in chunks of 500.
        for (let i = 0; i < normalised.length; i += 500) {
          const chunk = normalised.slice(i, i + 500).map((r) => ({
            pib: r.pib!,
            name: r.name,
            jbkjs: r.jbkjs,
            is_budget_user: r.isBudgetUser,
            refreshed_at: new Date().toISOString(),
          }));
          const { error: upErr } = await svc
            .from("fo_sef_companies_registry")
            .upsert(chunk, { onConflict: "pib" });
          if (upErr) {
            console.error("[cron.sef-refresh-registries.companies]", { code: upErr.code, message: upErr.message });
          } else {
            companiesUpdated += chunk.length;
          }
        }
      } else {
        console.error("[cron.sef-refresh-registries.list]", {
          status: res.httpStatus,
          message: res.errorMessage,
        });
      }
    }
  }

  // ---- KJS registry (Treasury public list) ----
  // The Treasury exposes downloadable XML/CSV at kjs.trezor.gov.rs. We fetch
  // the JSON endpoint when available; if not configured, skip with warning.
  let kjsUpdated = 0;
  const kjsUrl = process.env.KJS_REGISTRY_URL;
  if (kjsUrl) {
    try {
      const r = await fetch(kjsUrl, { signal: AbortSignal.timeout(60_000) });
      if (r.ok) {
        const list = (await r.json()) as Array<Record<string, unknown>>;
        for (let i = 0; i < list.length; i += 500) {
          const chunk = list.slice(i, i + 500).map((row) => ({
            jbkjs: String(row.jbkjs ?? row.JBKJS ?? "").trim(),
            name: String(row.name ?? row.naziv ?? row.Naziv ?? ""),
            pib: row.pib ? String(row.pib) : null,
            city: row.city ? String(row.city) : null,
            level: row.level ? String(row.level) : null,
            active: row.active !== false,
            refreshed_at: new Date().toISOString(),
          })).filter((row) => row.jbkjs);
          const { error: kErr } = await svc
            .from("fo_kjs_registry")
            .upsert(chunk, { onConflict: "jbkjs" });
          if (kErr) {
            console.error("[cron.sef-refresh-registries.kjs]", { message: kErr.message });
          } else {
            kjsUpdated += chunk.length;
          }
        }
      }
    } catch (err) {
      console.error("[cron.sef-refresh-registries.kjs.fetch]", {
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    sef_companies_updated: companiesUpdated,
    kjs_updated: kjsUpdated,
  });
}

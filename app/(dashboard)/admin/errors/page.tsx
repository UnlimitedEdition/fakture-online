import { requireUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit-log";

type ClientErrorRow = {
  id: string;
  digest: string | null;
  message: string | null;
  path: string | null;
  user_agent: string | null;
  ip: string | null;
  fatal: boolean;
  created_at: string;
};

const ALLOWED_LIMITS = [50, 100, 200, 500, 1000] as const;
type AllowedLimit = (typeof ALLOWED_LIMITS)[number];

function clampLimit(raw: string | undefined): AllowedLimit {
  const n = parseInt(raw ?? "200", 10);
  if (ALLOWED_LIMITS.includes(n as AllowedLimit)) return n as AllowedLimit;
  return 200;
}

function sanitizeQuery(raw: string | undefined): string {
  if (!raw) return "";
  return raw.trim().slice(0, 200);
}

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

function formatRelative(iso: string): string {
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) return "—";
  const diffMs = Date.now() - created;
  const diffSec = Math.max(0, Math.round(diffMs / 1000));
  if (diffSec < 60) return `pre ${diffSec} s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `pre ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `pre ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `pre ${diffD} d`;
  const diffMo = Math.round(diffD / 30);
  if (diffMo < 12) return `pre ${diffMo} mes`;
  const diffY = Math.round(diffMo / 12);
  return `pre ${diffY} god`;
}

function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("sr-RS", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function buildHref(params: {
  limit?: AllowedLimit;
  fatal?: boolean;
  q?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.limit && params.limit !== 200) sp.set("limit", String(params.limit));
  if (params.fatal) sp.set("fatal", "1");
  if (params.q) sp.set("q", params.q);
  const qs = sp.toString();
  return qs ? `/admin/errors?${qs}` : "/admin/errors";
}

export default async function AdminErrorsPage(props: {
  searchParams: Promise<{
    limit?: string;
    fatal?: string;
    q?: string;
  }>;
}) {
  const { supabase, user } = await requireUser();
  const params = await props.searchParams;

  const { data: profile } = await supabase.rpc("fo_get_profile");
  if (!isAdmin(user.email, profile?.is_admin)) {
    await logAudit({
      action: "admin.denied",
      metadata: { path: "/admin/errors" },
      success: false,
    });
    redirect("/dashboard");
  }

  await logAudit({
    action: "admin.access",
    metadata: { path: "/admin/errors" },
  });

  const limit = clampLimit(params.limit);
  const fatalOnly = params.fatal === "1";
  const query = sanitizeQuery(params.q);

  const hasSearchOrFatal = query.length > 0 || fatalOnly;

  const rpc = hasSearchOrFatal
    ? await supabase.rpc("fo_admin_client_errors_search", {
        p_query: query.length > 0 ? query : null,
        p_limit: limit,
        p_fatal_only: fatalOnly,
      })
    : await supabase.rpc("fo_admin_client_errors", { p_limit: limit });

  if (rpc.error) {
    console.error("[admin.errors]", {
      user_id: user.id,
      code: rpc.error.code,
      message: rpc.error.message,
    });
  }

  const rows = (rpc.data as ClientErrorRow[] | null) ?? [];
  const fatalCount = rows.filter((r) => r.fatal).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-800">
              Klijent-side greške
            </h1>
            <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
              ADMIN
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            Prikazano: {rows.length}
            {fatalCount > 0 && (
              <span className="ml-2 text-red-500">
                ({fatalCount} fatalnih)
              </span>
            )}{" "}
            • limit {limit}
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          &larr; Nazad na pregled
        </Link>
      </div>

      {/* Toolbar: filter chips + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref({ limit, q: query })}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              !fatalOnly
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-gray-200 hover:border-slate-300"
            }`}
          >
            Sve
          </Link>
          <Link
            href={buildHref({ limit, fatal: true, q: query })}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              fatalOnly
                ? "bg-red-600 text-white border-red-600"
                : "bg-red-50 text-red-600 border-red-100 hover:border-red-300"
            }`}
          >
            Samo FATAL
          </Link>
        </div>

        <form
          method="GET"
          action="/admin/errors"
          className="flex items-center gap-2"
        >
          {/* Preserve current filters on submit */}
          {limit !== 200 && (
            <input type="hidden" name="limit" value={String(limit)} />
          )}
          {fatalOnly && <input type="hidden" name="fatal" value="1" />}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Pretraži poruku…"
            maxLength={200}
            className="text-sm px-3 py-1.5 rounded-xl border border-gray-200 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 w-56"
          />
          <button
            type="submit"
            className="text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition-colors"
          >
            Traži
          </button>
          {query && (
            <Link
              href={buildHref({ limit, fatal: fatalOnly })}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              očisti
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">
            {query || fatalOnly
              ? "Nema rezultata za zadati filter."
              : "Nema prijavljenih grešaka u poslednje vreme. Zdrav sistem ✓"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <Th>Vreme</Th>
                  <Th>Tip</Th>
                  <Th>Putanja</Th>
                  <Th>Poruka</Th>
                  <Th>Digest</Th>
                  <Th>User-Agent</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-50 ${
                      row.fatal
                        ? "bg-red-50/30 hover:bg-red-50/50"
                        : "hover:bg-gray-50/50"
                    }`}
                  >
                    <td
                      className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap"
                      title={formatAbsolute(row.created_at)}
                    >
                      <span className="font-mono">
                        {formatRelative(row.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {row.fatal ? (
                        <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                          FATAL
                        </span>
                      ) : (
                        <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                          error
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-teal-700">
                      {row.path || "—"}
                    </td>
                    <td
                      className="px-5 py-3 text-sm text-slate-700 max-w-md"
                      title={row.message ?? ""}
                    >
                      {row.message ? truncate(row.message, 80) : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-slate-500">
                      {row.digest ?? "—"}
                    </td>
                    <td
                      className="px-5 py-3 text-xs text-slate-400"
                      title={row.user_agent ?? ""}
                    >
                      {row.user_agent ? truncate(row.user_agent, 40) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Limit picker */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Prikazati:</span>
        {ALLOWED_LIMITS.map((n) => (
          <Link
            key={n}
            href={buildHref({ limit: n, fatal: fatalOnly, q: query })}
            className={`px-2 py-1 rounded font-medium ${
              limit === n
                ? "bg-slate-800 text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {n}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">
      {children}
    </th>
  );
}

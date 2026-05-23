import { requireUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit-log";

type AuditRow = {
  id: number;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  success: boolean;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  "login.success": "Prijava",
  "login.failed": "Neuspela prijava",
  "register.success": "Registracija",
  "register.failed": "Neuspela registracija",
  logout: "Odjava",
  "admin.access": "Pristup admin panelu",
  "admin.denied": "Odbijen admin pristup",
  "invoice.created": "Faktura kreirana",
  "invoice.updated": "Faktura izmenjena",
  "invoice.status_changed": "Status fakture",
  "invoice.deleted": "Faktura obrisana",
  "invoice.email_sent": "Email poslat",
  "client.created": "Klijent dodat",
  "client.updated": "Klijent izmenjen",
  "client.deleted": "Klijent obrisan",
  "profile.updated": "Profil izmenjen",
  "signup.received": "Lead prijava",
};

export default async function AuditPage(props: {
  searchParams: Promise<{ action?: string; limit?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { action: actionFilter, limit: limitParam } = await props.searchParams;

  const { data: profile } = await supabase.rpc("fo_get_profile");
  if (!isAdmin(user.email, profile?.is_admin)) {
    await logAudit({
      action: "admin.denied",
      metadata: { path: "/admin/audit" },
      success: false,
    });
    redirect("/dashboard");
  }

  await logAudit({
    action: "admin.access",
    metadata: { path: "/admin/audit" },
  });

  const limit = Math.min(Math.max(parseInt(limitParam ?? "200", 10) || 200, 50), 1000);

  const { data: rows, error } = await supabase.rpc("fo_admin_audit", {
    p_limit: limit,
  });

  if (error) {
    console.error("[admin.audit]", {
      user_id: user.id,
      code: error.code,
      message: error.message,
    });
  }

  const all = (rows as AuditRow[] | null) ?? [];
  const filtered = actionFilter
    ? all.filter((r) => r.action === actionFilter)
    : all;

  const counts = all.reduce<Record<string, number>>((acc, r) => {
    acc[r.action] = (acc[r.action] ?? 0) + 1;
    return acc;
  }, {});

  const failures = all.filter((r) => !r.success).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-800">Audit log</h1>
            <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
              ADMIN
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            Poslednjih {limit} događaja. Prikazano: {filtered.length}
            {failures > 0 && (
              <span className="ml-2 text-red-500">
                ({failures} neuspela)
              </span>
            )}
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          &larr; Nazad na pregled
        </Link>
      </div>

      {/* Action filter chips */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/audit"
          className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
            !actionFilter
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-600 border-gray-200 hover:border-slate-300"
          }`}
        >
          Sve ({all.length})
        </Link>
        {Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([action, count]) => (
            <Link
              key={action}
              href={`/admin/audit?action=${encodeURIComponent(action)}`}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                actionFilter === action
                  ? "bg-slate-800 text-white border-slate-800"
                  : action.includes("failed") || action.includes("denied")
                  ? "bg-red-50 text-red-600 border-red-100 hover:border-red-300"
                  : "bg-white text-slate-600 border-gray-200 hover:border-slate-300"
              }`}
            >
              {ACTION_LABELS[action] ?? action} ({count})
            </Link>
          ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">
            Nema događaja za prikaz.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <Th>Vreme</Th>
                  <Th>Akcija</Th>
                  <Th>Korisnik</Th>
                  <Th>Resurs</Th>
                  <Th>IP</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-50 ${
                      row.success
                        ? "hover:bg-gray-50/50"
                        : "bg-red-50/30 hover:bg-red-50/50"
                    }`}
                  >
                    <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap font-mono">
                      {formatTimestamp(row.created_at)}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <span className="font-medium text-slate-800">
                        {ACTION_LABELS[row.action] ?? row.action}
                      </span>
                      {row.metadata && Object.keys(row.metadata).length > 0 && (
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {summarizeMetadata(row.metadata)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 font-mono">
                      {row.user_id ? row.user_id.slice(0, 8) : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {row.resource_type ? (
                        <span>
                          {row.resource_type}
                          {row.resource_id && (
                            <span className="font-mono ml-1">
                              ({row.resource_id.slice(0, 8)})
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 font-mono">
                      {row.ip ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      {row.success ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full">
                          OK
                        </span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full">
                          FAIL
                        </span>
                      )}
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
        {[100, 200, 500, 1000].map((n) => (
          <Link
            key={n}
            href={`/admin/audit?${actionFilter ? `action=${actionFilter}&` : ""}limit=${n}`}
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

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("sr-RS", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function summarizeMetadata(metadata: Record<string, unknown>): string {
  const pairs = Object.entries(metadata).map(([k, v]) => {
    const value =
      typeof v === "string" ? v : v == null ? "null" : JSON.stringify(v);
    return `${k}=${value.length > 32 ? value.slice(0, 32) + "…" : value}`;
  });
  return pairs.slice(0, 3).join(" • ");
}

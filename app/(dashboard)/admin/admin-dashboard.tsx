"use client";

import { useState } from "react";

interface UserRow {
  id: string;
  email: string;
  owner_name: string;
  company_name: string;
  created_at: string;
  is_admin: boolean;
}

interface LeadRow {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  created_at: string;
}

interface AdminStats {
  total_users: number;
  total_clients: number;
  total_invoices: number;
  total_revenue: number;
  invoices_by_status: Record<string, number> | null;
  recent_signups: UserRow[] | null;
  lead_signups_count: number;
  recent_leads: LeadRow[] | null;
}

const statusLabels: Record<string, string> = {
  draft: "Nacrt",
  sent: "Poslato",
  paid: "Plaćeno",
  overdue: "Kasni",
  cancelled: "Otkazano",
};

export function AdminDashboard({ stats }: { stats: AdminStats }) {
  const [tab, setTab] = useState<"users" | "leads">("users");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
          <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
            ADMIN
          </span>
        </div>
        <p className="text-slate-500 text-sm">Pregled celokupne platforme</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Registrovani korisnici"
          value={stats.total_users.toString()}
          color="teal"
        />
        <StatCard
          label="Lead prijave (landing)"
          value={stats.lead_signups_count.toString()}
          color="amber"
        />
        <StatCard
          label="Ukupno faktura"
          value={stats.total_invoices.toString()}
          color="slate"
        />
        <StatCard
          label="Ukupno klijenata"
          value={stats.total_clients.toString()}
          color="slate"
        />
        <StatCard
          label="Ukupan prihod (plaćeno)"
          value={`${Number(stats.total_revenue).toLocaleString("sr-RS")} RSD`}
          color="emerald"
        />
      </div>

      {/* Invoice status breakdown */}
      {stats.invoices_by_status && Object.keys(stats.invoices_by_status).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Fakture po statusu</h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(stats.invoices_by_status).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  status === "paid" ? "bg-emerald-400" :
                  status === "sent" ? "bg-amber-400" :
                  status === "overdue" ? "bg-red-400" :
                  status === "draft" ? "bg-slate-300" :
                  "bg-gray-300"
                }`} />
                <span className="text-sm text-slate-600">
                  {statusLabels[status] || status}: <strong>{count}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-gray-100 mb-6">
          <button
            onClick={() => setTab("users")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "users"
                ? "border-teal-500 text-teal-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Korisnici ({stats.total_users})
          </button>
          <button
            onClick={() => setTab("leads")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "leads"
                ? "border-teal-500 text-teal-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Lead prijave ({stats.lead_signups_count})
          </button>
        </div>

        {tab === "users" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {!stats.recent_signups || stats.recent_signups.length === 0 ? (
              <p className="p-8 text-center text-slate-400 text-sm">Nema registrovanih korisnika.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">Korisnik</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">Email</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">Firma</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">Registrovan</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">Uloga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_signups.map((user) => (
                      <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-xs">
                              {(user.owner_name || user.email || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-slate-800">{user.owner_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600">{user.email}</td>
                        <td className="px-5 py-3 text-sm text-slate-500">{user.company_name || "—"}</td>
                        <td className="px-5 py-3 text-sm text-slate-400">
                          {new Date(user.created_at).toLocaleDateString("sr-RS")}
                        </td>
                        <td className="px-5 py-3">
                          {user.is_admin ? (
                            <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">Admin</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">Korisnik</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "leads" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {!stats.recent_leads || stats.recent_leads.length === 0 ? (
              <p className="p-8 text-center text-slate-400 text-sm">Nema lead prijava sa landing stranice.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">Firma</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">Kontakt</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">Email</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">Telefon</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">Grad</th>
                      <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-3">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-sm font-medium text-slate-800">{lead.business_name || "—"}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">{lead.contact_name || "—"}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">{lead.email || "—"}</td>
                        <td className="px-5 py-3 text-sm text-slate-500">{lead.phone || "—"}</td>
                        <td className="px-5 py-3 text-sm text-slate-500">{lead.city || "—"}</td>
                        <td className="px-5 py-3 text-sm text-slate-400">
                          {new Date(lead.created_at).toLocaleDateString("sr-RS")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    teal: "border-teal-200 bg-teal-50",
    amber: "border-amber-200 bg-amber-50",
    emerald: "border-emerald-200 bg-emerald-50",
    red: "border-red-200 bg-red-50",
    slate: "border-gray-100 bg-white",
  };

  return (
    <div className={`rounded-2xl border p-5 ${colors[color] || colors.slate}`}>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

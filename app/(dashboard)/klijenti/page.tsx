import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function KlijentiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clients } = await supabase
    .from("fo_clients")
    .select("*")
    .eq("user_id", user.id)
    .order("company_name");

  const list = clients || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Klijenti</h1>
          <p className="text-slate-500 text-sm mt-1">
            {list.length} {list.length === 1 ? "klijent" : "klijenata"}
          </p>
        </div>
        <Link
          href="/klijenti/novi"
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Dodaj klijenta
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Nemate još klijenata</h3>
          <p className="text-slate-400 text-sm mb-6">Dodajte prvog klijenta da biste mogli da kreirate fakture.</p>
          <Link
            href="/klijenti/novi"
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Dodaj klijenta
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((client) => (
            <Link
              key={client.id}
              href={`/klijenti/${client.id}`}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-teal-200 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-semibold text-sm flex-shrink-0">
                  {client.company_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-slate-800 truncate">{client.company_name}</h3>
                  {client.contact_name && (
                    <p className="text-sm text-slate-400 truncate">{client.contact_name}</p>
                  )}
                  <div className="mt-2 space-y-1">
                    {client.email && (
                      <p className="text-xs text-slate-400 truncate">{client.email}</p>
                    )}
                    {client.phone && (
                      <p className="text-xs text-slate-400">{client.phone}</p>
                    )}
                    {client.city && (
                      <p className="text-xs text-slate-400">{client.city}</p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

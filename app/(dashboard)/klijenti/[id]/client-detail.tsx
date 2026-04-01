"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateClientAction, deleteClient } from "@/app/actions/clients";
import type { Client } from "@/lib/types";

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Nacrt", color: "bg-slate-100 text-slate-600" },
  sent: { label: "Poslato", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Plaćeno", color: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Kasni", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Otkazano", color: "bg-gray-100 text-gray-500" },
};

interface InvoiceRow {
  id: string;
  invoice_number: string;
  issue_date: string;
  total: number;
  status: string;
  currency: string;
}

export function ClientDetail({
  client,
  invoices,
}: {
  client: Client;
  invoices: InvoiceRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const boundUpdate = updateClientAction.bind(null, client.id);
  const [state, action, pending] = useActionState(boundUpdate, null);

  const handleDelete = async () => {
    if (!confirm("Da li ste sigurni? Klijent se može obrisati samo ako nema fakture."))
      return;
    setDeleting(true);
    const result = await deleteClient(client.id);
    if (result?.error) {
      alert(result.error);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{client.company_name}</h1>
          {client.contact_name && (
            <p className="text-slate-500 text-sm mt-1">{client.contact_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="text-sm font-medium px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-slate-600 transition-colors"
          >
            {editing ? "Otkaži" : "Izmeni"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            {deleting ? "..." : "Obriši"}
          </button>
        </div>
      </div>

      {editing ? (
        <form action={action} className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-5">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {state.error}
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="company_name" className="block text-sm font-medium text-slate-700 mb-1">Naziv *</label>
              <input id="company_name" name="company_name" type="text" required defaultValue={client.company_name} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-800" />
            </div>
            <div>
              <label htmlFor="contact_name" className="block text-sm font-medium text-slate-700 mb-1">Kontakt</label>
              <input id="contact_name" name="contact_name" type="text" defaultValue={client.contact_name} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-800" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input id="email" name="email" type="email" defaultValue={client.email} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-800" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
              <input id="phone" name="phone" type="tel" defaultValue={client.phone} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-800" />
            </div>
            <div>
              <label htmlFor="pib" className="block text-sm font-medium text-slate-700 mb-1">PIB</label>
              <input id="pib" name="pib" type="text" defaultValue={client.pib} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-800" />
            </div>
            <div>
              <label htmlFor="maticni_broj" className="block text-sm font-medium text-slate-700 mb-1">Matični broj</label>
              <input id="maticni_broj" name="maticni_broj" type="text" defaultValue={client.maticni_broj} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-800" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">Adresa</label>
              <input id="address" name="address" type="text" defaultValue={client.address} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-800" />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1">Grad</label>
              <input id="city" name="city" type="text" defaultValue={client.city} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-800" />
            </div>
            <div>
              <label htmlFor="zip_code" className="block text-sm font-medium text-slate-700 mb-1">Poštanski broj</label>
              <input id="zip_code" name="zip_code" type="text" defaultValue={client.zip_code} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-800" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">Beleška</label>
              <textarea id="notes" name="notes" rows={2} defaultValue={client.notes} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-800 resize-none" />
            </div>
          </div>
          <button type="submit" disabled={pending} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-8 rounded-xl transition-colors disabled:opacity-50">
            {pending ? "Čuvam..." : "Sačuvaj izmene"}
          </button>
        </form>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {client.email && <Info label="Email" value={client.email} />}
            {client.phone && <Info label="Telefon" value={client.phone} />}
            {client.pib && <Info label="PIB" value={client.pib} />}
            {client.maticni_broj && <Info label="Matični broj" value={client.maticni_broj} />}
            {client.address && <Info label="Adresa" value={client.address} />}
            {client.city && <Info label="Grad" value={`${client.zip_code ? client.zip_code + " " : ""}${client.city}`} />}
            {client.notes && (
              <div className="sm:col-span-2">
                <Info label="Beleška" value={client.notes} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client invoices */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">
            Fakture ({invoices.length})
          </h2>
          <Link
            href="/fakture/nova"
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            + Nova
          </Link>
        </div>
        {invoices.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">
            Nema faktura za ovog klijenta.
          </p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => {
              const s = statusConfig[inv.status] || statusConfig.draft;
              return (
                <Link
                  key={inv.id}
                  href={`/fakture/${inv.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-teal-600">
                      {inv.invoice_number}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">{inv.issue_date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-800">
                      {Number(inv.total).toLocaleString("sr-RS")} {inv.currency}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                      {s.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Link href="/klijenti" className="inline-block text-sm text-teal-600 hover:text-teal-700 font-medium">
        &larr; Nazad na klijente
      </Link>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}

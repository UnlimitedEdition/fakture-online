"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateClientAction, deleteClient } from "@/app/actions/clients";
import { checkClientSefEligibility } from "@/app/actions/sef";
import { getInvoiceStatus } from "@/lib/invoice-status";
import type { Client } from "@/lib/types";

interface SefExtra {
  sef_registered: boolean | null;
  sef_last_checked_at: string | null;
  is_budget_user: boolean;
  jbkjs: string | null;
  is_foreign: boolean;
  country_code: string;
}

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
  sef,
  sefEnabled,
}: {
  client: Client;
  invoices: InvoiceRow[];
  sef: SefExtra;
  sefEnabled: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checkingSef, startCheckSef] = useTransition();
  const [sefMessage, setSefMessage] = useState<string | null>(null);

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

  const handleCheckSef = () => {
    setSefMessage(null);
    startCheckSef(async () => {
      try {
        const res = await checkClientSefEligibility(client.id);
        if ("error" in res && res.error) {
          setSefMessage(res.error);
        } else if ("registered" in res) {
          setSefMessage(
            res.registered
              ? "Klijent je registrovan na SEF-u."
              : "Klijent NIJE registrovan na SEF-u — ne možete mu poslati elektronsku fakturu.",
          );
          router.refresh();
        }
      } catch {
        setSefMessage("Greška pri proveri SEF registracije. Pokušajte ponovo.");
      }
    });
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
            <div className="sm:col-span-2 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">SEF i strani klijenti</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input type="checkbox" name="is_budget_user" value="true" defaultChecked={sef.is_budget_user} className="w-4 h-4 rounded border-gray-300" />
                  Budžetski korisnik (B2G)
                </label>
                <div>
                  <label htmlFor="jbkjs" className="block text-sm font-medium text-slate-700 mb-1">JBKJS</label>
                  <input id="jbkjs" name="jbkjs" type="text" defaultValue={sef.jbkjs ?? ""} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 font-mono text-sm" />
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input type="checkbox" name="is_foreign" value="true" defaultChecked={sef.is_foreign} className="w-4 h-4 rounded border-gray-300" />
                  Strana firma (izvoz)
                </label>
                <div>
                  <label htmlFor="country_code" className="block text-sm font-medium text-slate-700 mb-1">Država (ISO 2-slova)</label>
                  <input id="country_code" name="country_code" type="text" defaultValue={sef.country_code || "RS"} maxLength={2} className="w-24 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 font-mono text-sm uppercase" />
                </div>
              </div>
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
        <>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {client.email && <Info label="Email" value={client.email} />}
              {client.phone && <Info label="Telefon" value={client.phone} />}
              {client.pib && <Info label="PIB" value={client.pib} />}
              {client.maticni_broj && <Info label="Matični broj" value={client.maticni_broj} />}
              {client.address && <Info label="Adresa" value={client.address} />}
              {client.city && <Info label="Grad" value={`${client.zip_code ? client.zip_code + " " : ""}${client.city}`} />}
              {sef.country_code && sef.country_code !== "RS" && (
                <Info label="Država" value={sef.country_code} />
              )}
              {sef.is_budget_user && sef.jbkjs && (
                <Info label="JBKJS" value={sef.jbkjs} />
              )}
              {client.notes && (
                <div className="sm:col-span-2">
                  <Info label="Beleška" value={client.notes} />
                </div>
              )}
            </div>
          </div>

          {sefEnabled && client.pib && !sef.is_foreign && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">SEF registracija</h3>
                  {sef.sef_registered === null ? (
                    <p className="text-sm text-slate-500">Nije provereno.</p>
                  ) : sef.sef_registered ? (
                    <p className="text-sm text-emerald-700">
                      ✓ Klijent je registrovan na SEF-u
                      {sef.sef_last_checked_at && (
                        <span className="text-slate-400 ml-1">
                          (provereno {new Date(sef.sef_last_checked_at).toLocaleDateString("sr-RS")})
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-red-600">
                      ✗ Klijent NIJE registrovan na SEF-u
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCheckSef}
                  disabled={checkingSef}
                  className="text-sm font-medium px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors disabled:opacity-50"
                >
                  {checkingSef ? "..." : "Proveri sada"}
                </button>
              </div>
              {sefMessage && (
                <p className="mt-3 text-xs text-slate-600">{sefMessage}</p>
              )}
            </div>
          )}
        </>
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
              const s = getInvoiceStatus(inv.status);
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

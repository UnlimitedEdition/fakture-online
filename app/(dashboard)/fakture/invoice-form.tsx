"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Client, InvoiceItem } from "@/lib/types";
import { createInvoice, updateInvoice } from "@/app/actions/invoices";

interface ItemRow {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

const emptyItem: ItemRow = {
  description: "",
  quantity: 1,
  unit: "kom",
  unit_price: 0,
};

export function InvoiceForm({
  clients,
  initialData,
  invoiceId,
}: {
  clients: Client[];
  initialData?: {
    client_id: string;
    issue_date: string;
    due_date: string;
    tax_rate: number;
    notes: string;
    payment_method: string;
    items: InvoiceItem[];
  };
  invoiceId?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [clientId, setClientId] = useState(initialData?.client_id || "");
  const [issueDate, setIssueDate] = useState(
    initialData?.issue_date || new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(initialData?.due_date || "");
  const [taxRate, setTaxRate] = useState(initialData?.tax_rate ?? 0);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [paymentMethod, setPaymentMethod] = useState(initialData?.payment_method || "");
  const [items, setItems] = useState<ItemRow[]>(
    initialData?.items?.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unit: i.unit,
      unit_price: Number(i.unit_price),
    })) || [{ ...emptyItem }]
  );

  const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxAmount = Math.round(subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  // Warnings — surface SEF rejection traps BEFORE the user clicks Save.
  const today = new Date().toISOString().split("T")[0];
  const issueDateIsToday = issueDate === today;
  const issueYear = issueDate?.slice(0, 4);
  const currentYear = new Date().getFullYear().toString();
  const yearMismatch = issueYear && issueYear !== currentYear;
  const dueBeforeIssue = dueDate && issueDate && dueDate < issueDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!clientId) {
      setError("Izaberite klijenta.");
      return;
    }

    if (items.some((i) => !i.description || i.unit_price <= 0)) {
      setError("Svaka stavka mora imati opis i cenu.");
      return;
    }

    setSaving(true);
    try {
      const data = {
        client_id: clientId,
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate: taxRate,
        notes,
        payment_method: paymentMethod,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit: i.unit,
          unit_price: i.unit_price,
        })),
      };

      const result = invoiceId
        ? await updateInvoice(invoiceId, data)
        : await createInvoice(data);

      if (result?.error) {
        setError(result.error);
        setSaving(false);
      }
      // redirect happens in the server action
    } catch (err) {
      // Re-throw Next.js navigation errors so the framework can handle them.
      if (err && typeof err === "object" && "digest" in err) throw err;
      setError("Greška pri čuvanju fakture.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* SEF rejection-trap warnings — surface before the user wastes time */}
      {(!issueDateIsToday || yearMismatch || dueBeforeIssue) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm space-y-1">
          <p className="font-semibold">⚠️ Pažnja pre slanja na SEF:</p>
          <ul className="list-disc list-inside text-xs">
            {!issueDateIsToday && (
              <li>
                Datum izdavanja nije današnji ({today}). SEF odbija back-dated fakture
                — ako šaljete na SEF, postavite današnji datum.
              </li>
            )}
            {yearMismatch && (
              <li>
                Godina iz datuma izdavanja ({issueYear}) ≠ trenutne ({currentYear}).
                Broj fakture mora biti jedinstven uz godinu (npr. <code>FAK-{currentYear}-0001</code>).
              </li>
            )}
            {dueBeforeIssue && (
              <li>Rok plaćanja ({dueDate}) je pre datuma izdavanja — verovatno greška.</li>
            )}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6">
        <h2 className="font-semibold text-slate-800">Osnovni podaci</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="client_id" className="block text-sm font-medium text-slate-700 mb-1">
              Klijent *
            </label>
            <select
              id="client_id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800 bg-white"
            >
              <option value="">Izaberite klijenta...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                  {c.contact_name ? ` (${c.contact_name})` : ""}
                </option>
              ))}
            </select>
            {clients.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Nemate klijenata.{" "}
                <Link href="/klijenti/novi" className="underline">
                  Dodajte prvog
                </Link>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="issue_date" className="block text-sm font-medium text-slate-700 mb-1">
              Datum izdavanja
            </label>
            <input
              id="issue_date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
            />
          </div>

          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-slate-700 mb-1">
              Rok plaćanja
            </label>
            <input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
            />
          </div>

          <div>
            <label htmlFor="tax_rate" className="block text-sm font-medium text-slate-700 mb-1">
              PDV (%)
            </label>
            <select
              id="tax_rate"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800 bg-white"
            >
              <option value={0}>Bez PDV-a (0%)</option>
              <option value={10}>10%</option>
              <option value={20}>20%</option>
            </select>
          </div>

          <div>
            <label htmlFor="payment_method" className="block text-sm font-medium text-slate-700 mb-1">
              Način plaćanja
            </label>
            <input
              id="payment_method"
              type="text"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="Prenos na račun"
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Stavke</h2>
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            + Dodaj stavku
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid gap-3 sm:grid-cols-12 items-end p-4 bg-gray-50 rounded-xl"
            >
              <div className="sm:col-span-5">
                <label className="block text-xs font-medium text-slate-500 mb-1">Opis *</label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-base sm:text-sm text-slate-800"
                  placeholder="Usluga/proizvod"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Kol.</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0.01}
                  step={0.01}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-base sm:text-sm text-slate-800"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Jed.</label>
                <input
                  type="text"
                  value={item.unit}
                  onChange={(e) => updateItem(index, "unit", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-base sm:text-sm text-slate-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Cena</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={item.unit_price}
                  onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-base sm:text-sm text-slate-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Ukupno</label>
                <p className="px-3 py-2.5 text-sm font-medium text-slate-800">
                  {(item.quantity * item.unit_price).toLocaleString("sr-RS")} RSD
                </p>
              </div>
              <div className="sm:col-span-1 flex justify-end">
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Ukloni stavku"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Osnovica:</span>
            <span className="text-slate-800 font-medium">{subtotal.toLocaleString("sr-RS")} RSD</span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">PDV ({taxRate}%):</span>
              <span className="text-slate-800 font-medium">{taxAmount.toLocaleString("sr-RS")} RSD</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t border-gray-100 pt-2">
            <span className="text-slate-800">Ukupno:</span>
            <span className="text-teal-600">{total.toLocaleString("sr-RS")} RSD</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
          Napomena (opciono)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800 resize-none"
          placeholder="Napomena na fakturi..."
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-8 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving
            ? "Čuvam..."
            : invoiceId
            ? "Sačuvaj izmene"
            : "Kreiraj fakturu"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full md:w-auto text-slate-500 hover:text-slate-700 font-medium py-3 px-6 rounded-xl transition-colors"
        >
          Otkaži
        </button>
      </div>
    </form>
  );
}

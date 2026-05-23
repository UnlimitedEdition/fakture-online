"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSchedule } from "@/app/actions/recurring";

interface Client {
  id: string;
  company_name: string;
}

interface ItemRow {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

const emptyItem: ItemRow = { description: "", quantity: 1, unit: "kom", unit_price: 0 };

export function ScheduleForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [dueDays, setDueDays] = useState(15);
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItem }]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxAmount = Math.round(subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  const updateItem = (i: number, field: keyof ItemRow, value: string | number) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (i: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!clientId) return setError("Izaberite klijenta.");
    if (!name.trim()) return setError("Naziv šeme je obavezan.");
    if (items.some((i) => !i.description || i.unit_price <= 0)) {
      return setError("Svaka stavka mora imati opis i cenu.");
    }

    setSaving(true);
    try {
      const res = await createSchedule({
        client_id: clientId,
        name: name.trim(),
        frequency,
        start_date: startDate,
        end_date: endDate || null,
        tax_rate: taxRate,
        notes,
        payment_method: paymentMethod,
        due_days: dueDays,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit: i.unit,
          unit_price: i.unit_price,
        })),
      });
      if (res?.error) {
        setError(res.error);
        setSaving(false);
      }
    } catch (err) {
      if (err && typeof err === "object" && "digest" in err) throw err;
      setError("Greška pri čuvanju.");
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

      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6">
        <h2 className="font-semibold text-slate-800">Osnovni podaci</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Naziv šeme *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800"
              placeholder="Mesečni retainer ACME"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Klijent *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 bg-white"
            >
              <option value="">Izaberite klijenta...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
            {clients.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Nemate klijenata.{" "}
                <Link href="/klijenti/novi" className="underline">Dodajte prvog</Link>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Frekvencija *</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as typeof frequency)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 bg-white"
            >
              <option value="weekly">Nedeljno</option>
              <option value="monthly">Mesečno</option>
              <option value="quarterly">Kvartalno</option>
              <option value="yearly">Godišnje</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Datum starta *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Datum kraja (opciono)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rok plaćanja (dani od izdavanja)</label>
            <input
              type="number"
              min={0}
              max={365}
              value={dueDays}
              onChange={(e) => setDueDays(Number(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PDV (%)</label>
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 bg-white"
            >
              <option value={0}>0%</option>
              <option value={10}>10%</option>
              <option value={20}>20%</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Način plaćanja</label>
            <input
              type="text"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800"
              placeholder="Prenos na račun"
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Stavke (ponavljaju se na svakoj fakturi)</h2>
          <button type="button" onClick={addItem} className="text-sm text-teal-600 hover:text-teal-700 font-medium">
            + Dodaj stavku
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="grid gap-3 sm:grid-cols-12 items-end p-4 bg-gray-50 rounded-xl">
              <div className="sm:col-span-5">
                <label className="block text-xs font-medium text-slate-500 mb-1">Opis *</label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-slate-800"
                  placeholder="Mesečno održavanje sajta"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Kol.</label>
                <input
                  type="number" min={0.01} step={0.01} value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-slate-800"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Jed.</label>
                <input
                  type="text" value={item.unit}
                  onChange={(e) => updateItem(idx, "unit", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-slate-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Cena</label>
                <input
                  type="number" min={0} step={0.01} value={item.unit_price}
                  onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-slate-800"
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
                  <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Ukloni">
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Osnovica:</span>
            <span className="font-medium">{subtotal.toLocaleString("sr-RS")} RSD</span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">PDV ({taxRate}%):</span>
              <span className="font-medium">{taxAmount.toLocaleString("sr-RS")} RSD</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t border-gray-100 pt-2">
            <span>Ukupno po fakturi:</span>
            <span className="text-teal-600">{total.toLocaleString("sr-RS")} RSD</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
        <label className="block text-sm font-medium text-slate-700 mb-1">Napomena (opciono)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 resize-none"
          placeholder="Pojavljuje se na svakoj generisanoj fakturi..."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-8 rounded-xl disabled:opacity-50"
        >
          {saving ? "Čuvam..." : "Kreiraj šemu"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-slate-500 hover:text-slate-700 font-medium py-3 px-6"
        >
          Otkaži
        </button>
      </div>
    </form>
  );
}

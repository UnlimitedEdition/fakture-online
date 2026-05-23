"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getInvoiceStatus } from "@/lib/invoice-status";
import { BulkActionsBar } from "./bulk-actions-bar";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  issue_date: string;
  total: number | string;
  currency: string;
  status: string;
  client: { company_name: string | null } | null;
}

export function InvoiceListClient({ invoices }: { invoices: InvoiceRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => invoices.map((i) => i.id), [invoices]);
  const allSelected = selected.size > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === allIds.length ? new Set() : new Set(allIds),
    );
  };

  const clearSelection = () => setSelected(new Set());

  const selectedIds = Array.from(selected);

  return (
    <div className="space-y-4">
      <BulkActionsBar selectedIds={selectedIds} onClear={clearSelection} />

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    aria-label="Odaberi sve fakture"
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">
                  Broj
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">
                  Klijent
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">
                  Datum
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">
                  Iznos
                </th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const s = getInvoiceStatus(inv.status);
                const isChecked = selected.has(inv.id);
                return (
                  <tr
                    key={inv.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                      isChecked ? "bg-teal-50/30" : ""
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(inv.id)}
                        aria-label={`Odaberi fakturu ${inv.invoice_number}`}
                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/fakture/${inv.id}`}
                        className="text-sm font-medium text-teal-600 hover:text-teal-700"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {inv.client?.company_name || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {inv.issue_date}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                      {Number(inv.total).toLocaleString("sr-RS")} {inv.currency}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/fakture/${inv.id}`}
                        className="text-sm text-slate-400 hover:text-teal-600 transition-colors"
                      >
                        Pogledaj
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {invoices.map((inv) => {
            const s = getInvoiceStatus(inv.status);
            const isChecked = selected.has(inv.id);
            return (
              <div
                key={inv.id}
                className={`flex items-start gap-3 p-4 ${
                  isChecked ? "bg-teal-50/40" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleOne(inv.id)}
                  aria-label={`Odaberi fakturu ${inv.invoice_number}`}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <Link
                  href={`/fakture/${inv.id}`}
                  className="block flex-1 hover:bg-gray-50 transition-colors -m-1 p-1 rounded"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-teal-600">
                      {inv.invoice_number}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      {inv.client?.company_name || "—"}
                    </span>
                    <span className="text-sm font-medium text-slate-800">
                      {Number(inv.total).toLocaleString("sr-RS")} {inv.currency}
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkMarkPaid, bulkSendEmails } from "@/app/actions/invoices-bulk";

interface Props {
  selectedIds: string[];
  onClear: () => void;
}

export function BulkActionsBar({ selectedIds, onClear }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  if (selectedIds.length === 0) return null;

  const handleMarkPaid = () => {
    if (
      !confirm(
        `Označiti ${selectedIds.length} ${selectedIds.length === 1 ? "fakturu" : "faktura"} kao plaćeno?`,
      )
    ) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await bulkMarkPaid(selectedIds);
      if ("error" in res && res.error) {
        setMessage({ kind: "err", text: res.error });
        return;
      }
      if ("success" in res) {
        setMessage({
          kind: "ok",
          text: `Označeno ${res.updated ?? 0} ${res.updated === 1 ? "faktura" : "faktura"} kao plaćeno.`,
        });
        onClear();
        router.refresh();
      }
    });
  };

  const handleSendEmails = () => {
    if (
      !confirm(
        `Poslati email za ${selectedIds.length} ${selectedIds.length === 1 ? "fakturu" : "faktura"}?`,
      )
    ) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await bulkSendEmails(selectedIds);
      if ("error" in res && res.error) {
        setMessage({ kind: "err", text: res.error });
        return;
      }
      if ("success" in res) {
        const failedText = res.failed
          ? `, ${res.failed} neuspešno (klijent bez email-a ili greška).`
          : ".";
        setMessage({
          kind: "ok",
          text: `Poslato ${res.sent ?? 0} email-a${failedText}`,
        });
        onClear();
        router.refresh();
      }
    });
  };

  return (
    <div className="sticky top-2 z-20">
      <div className="bg-white rounded-2xl border border-teal-200 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-50 text-teal-700 text-sm font-semibold">
              {selectedIds.length}
            </span>
            <span className="text-sm font-medium text-slate-700">
              {selectedIds.length === 1
                ? "faktura odabrana"
                : "faktura odabrano"}
            </span>
            <button
              type="button"
              onClick={onClear}
              disabled={pending}
              className="text-xs text-slate-400 hover:text-slate-600 underline disabled:opacity-50"
            >
              Poništi izbor
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={pending}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
            >
              {pending ? "Obrada..." : "Označi kao plaćeno"}
            </button>
            <button
              type="button"
              onClick={handleSendEmails}
              disabled={pending}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50"
            >
              {pending ? "Šaljem..." : "Pošalji email"}
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`px-4 py-2 rounded-xl text-sm border ${
              message.kind === "ok"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importBankFile, rematchAll } from "@/app/actions/bank";

interface OpenInvoice {
  id: string;
  invoice_number: string;
  total: number;
  currency: string;
}

export function BankActions({ openInvoices }: { openInvoices: OpenInvoice[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const onImport = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await importBankFile(formData);
        if ("success" in res) {
          setMessage({
            kind: "ok",
            text: `Uvezeno ${res.inserted} transakcija, ${res.matched} odmah upareno sa otvorenim fakturama.`,
          });
          router.refresh();
        } else {
          setMessage({ kind: "err", text: res.error });
        }
      } catch {
        setMessage({ kind: "err", text: "Greška pri uvozu." });
      }
    });
  };

  const onRematch = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await rematchAll();
      if ("success" in res) {
        setMessage({
          kind: "ok",
          text: `Pokušano ${res.total_unmatched ?? 0}, novo upareno ${res.newly_matched ?? 0}.`,
        });
        router.refresh();
      } else {
        setMessage({ kind: "err", text: res.error });
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm border ${
          message.kind === "ok"
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid sm:grid-cols-[1fr,auto] gap-4 items-end">
        <form action={onImport} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Format banke
            </label>
            <select
              name="format"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-800 text-sm"
            >
              <option value="generic_csv">Generic CSV (datum, iznos, poziv)</option>
              <option value="intesa_csv">Banca Intesa</option>
              <option value="nlb_csv">NLB Komercijalna banka</option>
              <option value="raiffeisen_csv">Raiffeisen banka</option>
              <option value="otp_csv">OTP banka</option>
              <option value="procredit_csv">ProCredit banka</option>
              <option value="aik_csv">AIK banka</option>
              <option value="mt940">SWIFT MT940</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Izvod (CSV / MT940)
            </label>
            <input
              type="file"
              name="file"
              accept=".csv,.txt,.mt940"
              required
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-6 rounded-xl text-sm disabled:opacity-50"
          >
            {pending ? "Uvozim..." : "Uvezi izvod"}
          </button>
        </form>

        <button
          type="button"
          onClick={onRematch}
          disabled={pending || openInvoices.length === 0}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 rounded-xl text-sm disabled:opacity-50"
        >
          Pokušaj ponovo upariti
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Sistem uparuje uplate sa fakturama čije se cifre iz broja poklapaju sa pozivom
        na broj <strong>i</strong> iznosom (±0.01 RSD). Otvorenih faktura: {openInvoices.length}.
      </p>
    </div>
  );
}

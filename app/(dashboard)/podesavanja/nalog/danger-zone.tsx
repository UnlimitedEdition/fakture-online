"use client";

import { useState, useTransition } from "react";
import { deleteMyAccount } from "@/app/actions/account";

export function DangerZone({ accountEmail }: { accountEmail: string }) {
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await deleteMyAccount(formData);
        if ("error" in res && res.error) setError(res.error);
      } catch (err) {
        if (err && typeof err === "object" && "digest" in err) throw err;
        setError("Greška pri brisanju naloga.");
      }
    });
  };

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="text-sm font-medium text-red-600 hover:text-red-800 underline"
      >
        Obriši moj nalog
      </button>
    );
  }

  return (
    <form action={onSubmit} className="space-y-3 bg-white rounded-xl p-4 border border-red-300">
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Email naloga: <strong>{accountEmail}</strong>
      </p>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Otkucajte tačno: <code>OBRISI MOJ NALOG</code>
        </label>
        <input
          name="confirmation"
          type="text"
          required
          autoComplete="off"
          className="w-full px-4 py-3 rounded-xl border border-red-200 focus:ring-2 focus:ring-red-400 outline-none text-sm text-slate-800 font-mono"
          placeholder="OBRISI MOJ NALOG"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Vaša lozinka (za potvrdu)
        </label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full px-4 py-3 rounded-xl border border-red-200 focus:ring-2 focus:ring-red-400 outline-none text-sm text-slate-800"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm disabled:opacity-50"
        >
          {pending ? "Brišem..." : "Trajno obriši nalog"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowForm(false);
            setError(null);
          }}
          disabled={pending}
          className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2.5"
        >
          Otkaži
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { setSefApiKey, removeSefApiKey } from "@/app/actions/sef";

export function SefSettingsForm({
  hasKey,
  demoMode,
  isBudgetUser,
  jbkjs,
  callbackUrl,
  callbackSecret,
}: {
  hasKey: boolean;
  demoMode: boolean;
  isBudgetUser: boolean;
  jbkjs: string;
  callbackUrl: string | null;
  callbackSecret: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const onSubmit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await setSefApiKey(formData);
        if ("error" in res && res.error) {
          setMessage({ kind: "err", text: res.error });
        } else if ("success" in res && res.success) {
          setMessage({ kind: "ok", text: "Sačuvano." });
        }
      } catch {
        setMessage({ kind: "err", text: "Greška pri čuvanju. Pokušajte ponovo." });
      }
    });
  };

  const onRemove = () => {
    if (!confirm("Da li želite da uklonite SEF API ključ?")) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await removeSefApiKey();
        if ("error" in res && res.error) {
          setMessage({ kind: "err", text: res.error });
        } else {
          setMessage({ kind: "ok", text: "Ključ uklonjen." });
        }
      } catch {
        setMessage({ kind: "err", text: "Greška pri uklanjanju ključa." });
      }
    });
  };

  return (
    <form action={onSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-5">
      {message && (
        <div
          className={`px-4 py-3 rounded-xl text-sm border ${
            message.kind === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label htmlFor="api_key" className="block text-sm font-medium text-slate-700 mb-1">
          SEF API ključ {hasKey && <span className="text-emerald-600 text-xs">(postavljen)</span>}
        </label>
        <input
          id="api_key"
          name="api_key"
          type="password"
          autoComplete="off"
          placeholder={hasKey ? "Unesite novi ključ da prepišete postojeći" : "ApiKey iz portala"}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-800 font-mono text-sm"
          required={!hasKey}
        />
        <p className="text-xs text-slate-400 mt-1">
          Ključ se čuva enkriptovano (AES-GCM). Nikada se ne prikazuje u plain-text-u.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="demo_mode"
          name="demo_mode"
          type="checkbox"
          value="true"
          defaultChecked={demoMode}
          className="w-4 h-4 rounded border-gray-300"
        />
        <label htmlFor="demo_mode" className="text-sm text-slate-700">
          Koristi demo okruženje (<code className="text-xs">demoefaktura.mfin.gov.rs</code>)
        </label>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="is_budget_user"
          name="is_budget_user"
          type="checkbox"
          value="true"
          defaultChecked={isBudgetUser}
          className="w-4 h-4 rounded border-gray-300"
        />
        <label htmlFor="is_budget_user" className="text-sm text-slate-700">
          Moja firma je budžetski korisnik (B2G izdavalac)
        </label>
      </div>

      <div>
        <label htmlFor="jbkjs" className="block text-sm font-medium text-slate-700 mb-1">
          JBKJS (ako ste budžetski korisnik)
        </label>
        <input
          id="jbkjs"
          name="jbkjs"
          type="text"
          defaultValue={jbkjs}
          placeholder="npr. 12345"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-800 font-mono text-sm"
        />
      </div>

      {callbackUrl && (
        <div className="space-y-2 border-t border-gray-100 pt-4">
          <label className="block text-sm font-medium text-slate-700">
            Callback URL (opciono — postavite u SEF portalu pod API menadžment)
          </label>
          <input
            type="text"
            readOnly
            value={callbackUrl}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-slate-600 font-mono text-xs"
          />
          {callbackSecret && (
            <>
              <label className="block text-xs font-medium text-slate-500 mt-2">
                Pošaljite kroz <code>X-Callback-Secret</code> header (NE kao URL parametar):
              </label>
              <input
                type="text"
                readOnly
                value={callbackSecret}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-slate-600 font-mono text-xs"
              />
            </>
          )}
          <p className="text-xs text-slate-400">
            Bez ovog, koristimo dnevni polling — status promene se vide sa ~1 dan zakašnjenja.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-8 rounded-xl transition-colors disabled:opacity-50"
        >
          {pending ? "Čuvam..." : hasKey ? "Ažuriraj" : "Sačuvaj"}
        </button>
        {hasKey && (
          <button
            type="button"
            onClick={onRemove}
            disabled={pending}
            className="text-sm text-red-500 hover:text-red-700 font-medium px-4 py-3"
          >
            Ukloni ključ
          </button>
        )}
      </div>
    </form>
  );
}

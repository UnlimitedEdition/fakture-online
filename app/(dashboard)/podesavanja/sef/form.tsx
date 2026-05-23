"use client";

import { useState, useTransition } from "react";
import { setSefApiKey, removeSefApiKey } from "@/app/actions/sef";

export function SefSettingsForm({
  hasKey,
  demoMode,
  isBudgetUser,
  jbkjs,
  callbackUrl,
  hasCallbackSecret,
}: {
  hasKey: boolean;
  demoMode: boolean;
  isBudgetUser: boolean;
  jbkjs: string;
  callbackUrl: string | null;
  hasCallbackSecret: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const onSubmit = (formData: FormData) => {
    setMessage(null);
    setRevealedSecret(null);
    startTransition(async () => {
      try {
        const res = await setSefApiKey(formData);
        if ("error" in res && res.error) {
          setMessage({ kind: "err", text: res.error });
        } else if ("success" in res && res.success) {
          setMessage({ kind: "ok", text: "Sačuvano." });
          if (res.callbackSecret) {
            setRevealedSecret(res.callbackSecret);
          }
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

      {revealedSecret && callbackUrl && (
        <div className="space-y-3 border-2 border-amber-300 bg-amber-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-900">
            ⚠️ Novi callback secret — sačuvajte sad, više neće biti prikazan
          </p>
          <p className="text-xs text-amber-800">
            U DB čuvamo samo SHA-256 hash, ne plain. Ako ga izgubite, morate
            generisati novi (Ažuriraj sa &quot;Rotiraj callback secret&quot;).
          </p>
          <label className="block text-xs font-medium text-amber-900">
            Callback URL (postavite u SEF portalu pod API menadžment):
          </label>
          <input
            type="text"
            readOnly
            value={callbackUrl}
            className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-slate-700 font-mono text-xs"
          />
          <label className="block text-xs font-medium text-amber-900">
            Secret (šalje se kroz <code>X-Callback-Secret</code> header):
          </label>
          <input
            type="text"
            readOnly
            value={revealedSecret}
            className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-slate-700 font-mono text-xs"
          />
        </div>
      )}

      {callbackUrl && hasCallbackSecret && !revealedSecret && (
        <div className="space-y-2 border-t border-gray-100 pt-4">
          <label className="block text-sm font-medium text-slate-700">
            Callback URL
          </label>
          <input
            type="text"
            readOnly
            value={callbackUrl}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-slate-600 font-mono text-xs"
          />
          <p className="text-xs text-slate-400">
            Callback secret je već generisan i čuva se samo kao hash. Ako vam treba ponovo,
            čekirajte &quot;Rotiraj secret&quot; ispod i sačuvajte.
          </p>
          <label className="flex items-center gap-3 text-sm text-slate-700 pt-2">
            <input
              type="checkbox"
              name="rotate_callback"
              value="true"
              className="w-4 h-4 rounded border-gray-300"
            />
            Rotiraj callback secret (stari hash se zamenjuje novim)
          </label>
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

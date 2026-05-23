"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteOrgMember } from "@/app/actions/orgs";

export function InviteForm({ orgId }: { orgId: string }) {
  const action = inviteOrgMember.bind(null, orgId);
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Reset the form fields after a successful submit. Using a ref avoids
  // calling setState() inside the effect (which is the lint rule). We don't
  // need to track the token in state — it's read directly off `state.token`.
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state?.success]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const acceptUrl =
    state?.success && state.token && origin
      ? `${origin}/orgs/accept?token=${state.token}`
      : null;

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-sm space-y-2">
          <p>Poziv je kreiran. Pošaljite ovaj link osobi koju pozivate:</p>
          {acceptUrl && (
            <code className="block bg-white border border-emerald-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 break-all">
              {acceptUrl}
            </code>
          )}
          <p className="text-xs text-emerald-600">
            Važi 7 dana. Kada se prijavi tom email adresom i otvori link, biva
            automatski dodat/a kao član vaše firme.
          </p>
        </div>
      )}
      <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          placeholder="email@firma.rs"
          className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
        />
        <select
          name="role"
          defaultValue="accountant"
          className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
        >
          <option value="accountant">Računovođa</option>
          <option value="admin">Administrator</option>
          <option value="viewer">Član (samo pregled)</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Šaljem..." : "Pozovi"}
        </button>
      </div>
    </form>
  );
}

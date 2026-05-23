"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);

  return (
    <form action={action} className="space-y-3">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
          Lozinka je promenjena.
        </div>
      )}

      <input
        name="current_password"
        type="password"
        autoComplete="current-password"
        required
        placeholder="Trenutna lozinka"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-sm text-slate-800"
      />
      <input
        name="new_password"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        placeholder="Nova lozinka (min 12 karaktera)"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-sm text-slate-800"
      />
      <input
        name="new_password_confirm"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        placeholder="Potvrdite novu lozinku"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-sm text-slate-800"
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm disabled:opacity-50"
      >
        {pending ? "Menjam..." : "Promeni lozinku"}
      </button>
    </form>
  );
}

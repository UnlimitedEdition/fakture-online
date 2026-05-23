"use client";

import { useActionState } from "react";
import { completeMfaChallenge } from "@/app/actions/mfa";

export function TwoFactorChallengeForm() {
  const [state, action, pending] = useActionState(completeMfaChallenge, null);

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="code"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Kod (6 cifara)
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800 tracking-widest text-center text-lg font-mono"
          placeholder="000000"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Provera..." : "Potvrdi"}
      </button>

      <p className="text-xs text-slate-500 text-center">
        Ako ste izgubili pristup autentifikatoru, kontaktirajte podršku.
      </p>
    </form>
  );
}

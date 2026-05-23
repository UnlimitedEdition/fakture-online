"use client";

import { requestPasswordReset } from "@/app/actions/auth";
import Link from "next/link";
import { useActionState } from "react";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  return (
    <>
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-teal-700">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          FaktureOnline
        </Link>
        <p className="text-slate-500 mt-2">Zaboravljena lozinka</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        {state?.success ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-700">
              Ako vaš email postoji u sistemu, link za reset lozinke je poslat.
            </p>
            <p className="text-xs text-slate-400">
              Proverite inbox i Spam folder. Link je aktivan 1 sat.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              Nazad na prijavu
            </Link>
          </div>
        ) : (
          <form action={action} className="space-y-5">
            <p className="text-sm text-slate-600">
              Unesite vašu email adresu — poslaćemo vam link za postavljanje nove lozinke.
            </p>

            {state?.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {state.error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800"
                placeholder="vas@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
            >
              {pending ? "Šaljem..." : "Pošalji reset link"}
            </button>

            <div className="text-center text-sm">
              <Link href="/login" className="text-slate-500 hover:text-slate-700">
                ← Nazad na prijavu
              </Link>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

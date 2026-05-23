"use client";

import { register } from "@/app/actions/auth";
import Link from "next/link";
import { useActionState } from "react";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, null);

  return (
    <>
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-teal-700">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          FaktureOnline
        </Link>
        <p className="text-slate-500 mt-2">Kreirajte besplatan nalog</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <form action={action} className="space-y-5">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {state.error}
            </div>
          )}

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-slate-700 mb-1">
              Ime i prezime
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="Marko Marković"
            />
          </div>

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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="vas@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Lozinka
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="Min 12 karaktera, slova + brojevi + simbol"
            />
            <p className="text-xs text-slate-400 mt-1">
              Bank-grade: najmanje 12 karaktera, kombinacija slova, brojeva i bar jednog simbola.
            </p>
          </div>

          {/* Honeypot — invisible to humans, bots fill every field */}
          <div className="absolute -left-[9999px] -top-[9999px]" aria-hidden="true">
            <label htmlFor="website">Vaš sajt (ostavite prazno)</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Kreiranje naloga...
              </span>
            ) : (
              "Kreirajte nalog besplatno"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Već imate nalog?{" "}
          <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
            Prijavite se
          </Link>
        </div>
      </div>
    </>
  );
}

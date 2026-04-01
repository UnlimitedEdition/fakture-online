"use client";

import { createClientAction } from "@/app/actions/clients";
import { useActionState } from "react";
import Link from "next/link";

export default function NoviKlijentPage() {
  const [state, action, pending] = useActionState(createClientAction, null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Novi klijent</h1>
        <p className="text-slate-500 text-sm mt-1">Dodajte novog klijenta u bazu</p>
      </div>

      <form action={action} className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6 max-w-2xl">
        {state?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {state.error}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="company_name" className="block text-sm font-medium text-slate-700 mb-1">
              Naziv firme / klijenta *
            </label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              required
              autoComplete="organization"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="Naziv firme d.o.o."
            />
          </div>

          <div>
            <label htmlFor="contact_name" className="block text-sm font-medium text-slate-700 mb-1">
              Kontakt osoba
            </label>
            <input
              id="contact_name"
              name="contact_name"
              type="text"
              autoComplete="name"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="Ime i prezime"
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="firma@email.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
              Telefon
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="+381 60 123 4567"
            />
          </div>

          <div>
            <label htmlFor="pib" className="block text-sm font-medium text-slate-700 mb-1">
              PIB
            </label>
            <input
              id="pib"
              name="pib"
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="123456789"
            />
          </div>

          <div>
            <label htmlFor="maticni_broj" className="block text-sm font-medium text-slate-700 mb-1">
              Matični broj
            </label>
            <input
              id="maticni_broj"
              name="maticni_broj"
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="12345678"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
              Adresa
            </label>
            <input
              id="address"
              name="address"
              type="text"
              autoComplete="street-address"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="Ulica i broj"
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1">
              Grad
            </label>
            <input
              id="city"
              name="city"
              type="text"
              autoComplete="address-level2"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="Beograd"
            />
          </div>

          <div>
            <label htmlFor="zip_code" className="block text-sm font-medium text-slate-700 mb-1">
              Poštanski broj
            </label>
            <input
              id="zip_code"
              name="zip_code"
              type="text"
              autoComplete="postal-code"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="11000"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
              Beleška
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800 resize-none"
              placeholder="Interna beleška o klijentu..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-8 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Čuvam..." : "Sačuvaj klijenta"}
          </button>
          <Link
            href="/klijenti"
            className="text-slate-500 hover:text-slate-700 font-medium py-3 px-6 rounded-xl transition-colors"
          >
            Otkaži
          </Link>
        </div>
      </form>
    </div>
  );
}

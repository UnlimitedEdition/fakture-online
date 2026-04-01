"use client";

import { updateProfile } from "@/app/actions/settings";
import { useActionState } from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function PodesavanjaPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, action, pending] = useActionState(updateProfile, null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("fo_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-8 w-8 text-teal-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Podešavanja</h1>
        <p className="text-slate-500 text-sm mt-1">Podaci o vašoj firmi koji se prikazuju na fakturama</p>
      </div>

      <form action={action} className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6 max-w-2xl">
        {state?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
            Podešavanja su sačuvana.
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="company_name" className="block text-sm font-medium text-slate-700 mb-1">
              Naziv firme
            </label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              defaultValue={profile?.company_name}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="Vaša firma d.o.o."
            />
          </div>

          <div>
            <label htmlFor="owner_name" className="block text-sm font-medium text-slate-700 mb-1">
              Ime vlasnika / kontakt
            </label>
            <input
              id="owner_name"
              name="owner_name"
              type="text"
              defaultValue={profile?.owner_name}
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
              defaultValue={profile?.email}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="firma@email.com"
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
              defaultValue={profile?.pib}
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
              defaultValue={profile?.maticni_broj}
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
              defaultValue={profile?.address}
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
              defaultValue={profile?.city}
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
              defaultValue={profile?.zip_code}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="11000"
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
              defaultValue={profile?.phone}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="+381 60 123 4567"
            />
          </div>

          <div>
            <label htmlFor="bank_account" className="block text-sm font-medium text-slate-700 mb-1">
              Tekući račun
            </label>
            <input
              id="bank_account"
              name="bank_account"
              type="text"
              defaultValue={profile?.bank_account}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="160-0000000000000-00"
            />
          </div>

          <div>
            <label htmlFor="invoice_prefix" className="block text-sm font-medium text-slate-700 mb-1">
              Prefiks fakture
            </label>
            <input
              id="invoice_prefix"
              name="invoice_prefix"
              type="text"
              defaultValue={profile?.invoice_prefix || "FAK"}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
              placeholder="FAK"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-8 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Čuvam..." : "Sačuvaj podešavanja"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/settings";
import type { Profile } from "@/lib/types";

interface FieldProps {
  id: keyof Profile;
  label: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  colSpan?: boolean;
}

function Field({ id, label, type = "text", placeholder, defaultValue, colSpan }: FieldProps) {
  return (
    <div className={colSpan ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
      />
    </div>
  );
}

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, action, pending] = useActionState(updateProfile, null);

  return (
    <form
      action={action}
      className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6 max-w-2xl"
    >
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
        <Field
          id="company_name"
          label="Naziv firme"
          placeholder="Vaša firma d.o.o."
          defaultValue={profile?.company_name}
          colSpan
        />
        <Field
          id="owner_name"
          label="Ime vlasnika / kontakt"
          placeholder="Marko Marković"
          defaultValue={profile?.owner_name}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          placeholder="firma@email.com"
          defaultValue={profile?.email}
        />
        <Field id="pib" label="PIB" placeholder="123456789" defaultValue={profile?.pib} />
        <Field
          id="maticni_broj"
          label="Matični broj"
          placeholder="12345678"
          defaultValue={profile?.maticni_broj}
        />
        <Field
          id="address"
          label="Adresa"
          placeholder="Ulica i broj"
          defaultValue={profile?.address}
          colSpan
        />
        <Field id="city" label="Grad" placeholder="Beograd" defaultValue={profile?.city} />
        <Field
          id="zip_code"
          label="Poštanski broj"
          placeholder="11000"
          defaultValue={profile?.zip_code}
        />
        <Field
          id="phone"
          label="Telefon"
          type="tel"
          placeholder="+381 60 123 4567"
          defaultValue={profile?.phone}
        />
        <Field
          id="bank_account"
          label="Tekući račun"
          placeholder="160-0000000000000-00"
          defaultValue={profile?.bank_account}
        />
        <Field
          id="invoice_prefix"
          label="Prefiks fakture"
          placeholder="FAK"
          defaultValue={profile?.invoice_prefix || "FAK"}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-8 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Čuvam..." : "Sačuvaj podešavanja"}
      </button>
    </form>
  );
}

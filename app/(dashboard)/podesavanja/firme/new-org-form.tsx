"use client";

import { useActionState, useEffect, useRef } from "react";
import { createOrg } from "@/app/actions/orgs";

export function NewOrgForm() {
  const [state, action, pending] = useActionState(createOrg, null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-sm">
          Firma je uspešno kreirana.
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          name="name"
          type="text"
          required
          maxLength={200}
          placeholder="Naziv firme, npr. „Druga firma d.o.o.“"
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-slate-800"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {pending ? "Kreiram..." : "Kreiraj firmu"}
        </button>
      </div>
    </form>
  );
}

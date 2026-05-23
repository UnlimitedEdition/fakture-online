"use client";

import { useState, useTransition } from "react";
import { uploadLogo, removeLogo } from "@/app/actions/profile-logo";
import { useRouter } from "next/navigation";

export function LogoForm({ currentLogoUrl }: { currentLogoUrl: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const onUpload = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await uploadLogo(formData);
        if ("error" in res && res.error) {
          setMessage({ kind: "err", text: res.error });
        } else {
          setMessage({ kind: "ok", text: "Logo je sačuvan." });
          router.refresh();
        }
      } catch {
        setMessage({ kind: "err", text: "Greška pri uploadu." });
      }
    });
  };

  const onRemove = () => {
    if (!confirm("Ukloniti trenutni logo?")) return;
    setMessage(null);
    startTransition(async () => {
      try {
        await removeLogo();
        setMessage({ kind: "ok", text: "Logo uklonjen." });
        router.refresh();
      } catch {
        setMessage({ kind: "err", text: "Greška pri uklanjanju." });
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-4 max-w-2xl">
      <div>
        <h2 className="font-semibold text-slate-800 mb-1">Logo firme</h2>
        <p className="text-xs text-slate-500">
          Logo se prikazuje na fakturi i PDF-u za štampu. PNG / JPEG / WebP / SVG, max 1 MB.
        </p>
      </div>

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

      {currentLogoUrl && (
        <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentLogoUrl}
            alt="Trenutni logo"
            className="h-20 w-auto max-w-[200px] object-contain"
          />
          <button
            type="button"
            onClick={onRemove}
            disabled={pending}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Ukloni
          </button>
        </div>
      )}

      <form action={onUpload} className="space-y-3">
        <input
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          required
          className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm disabled:opacity-50"
        >
          {pending ? "Otpremam..." : currentLogoUrl ? "Promeni logo" : "Otpremi logo"}
        </button>
      </form>
    </div>
  );
}

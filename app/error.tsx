"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Best-effort client-side error report — fire-and-forget, no PII.
    if (typeof window === "undefined") return;
    fetch("/api/internal/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        digest: error.digest ?? null,
        message: error.message?.slice(0, 200) ?? "",
        path: window.location.pathname,
        ua: navigator.userAgent.slice(0, 256),
      }),
      keepalive: true,
    }).catch(() => {
      /* monitoring is best-effort */
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-amber-50 p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Greška u aplikaciji</h1>
        <p className="text-slate-500 text-sm">
          Nešto je krenulo naopako. Pokušajte ponovo, ili nas obavestite o problemu.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono">
            ID greške: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm"
          >
            Pokušaj ponovo
          </button>
          <Link
            href="/dashboard"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-6 rounded-xl text-sm inline-flex items-center justify-center"
          >
            Nazad na pregled
          </Link>
        </div>

        <div className="pt-4 mt-4 border-t border-gray-100 text-xs text-slate-500">
          <p className="mb-1">Treba Vam pomoć?</p>
          <a
            href={`mailto:podrska@faktureonline.rs?subject=${encodeURIComponent(
              "Greška u aplikaciji" + (error.digest ? ` (ID ${error.digest})` : ""),
            )}&body=${encodeURIComponent(
              "Opišite šta ste pokušali kada je greška iskočila:\n\n\n---\n" +
                (error.digest ? `ID greške: ${error.digest}\n` : ""),
            )}`}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            podrska@faktureonline.rs
          </a>
        </div>
      </div>
    </div>
  );
}

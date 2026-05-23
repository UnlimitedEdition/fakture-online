"use client";

import { useState, useTransition } from "react";
import { enrollTotp, verifyTotp, unenrollTotp } from "@/app/actions/mfa";

type EnrollState = {
  factorId: string;
  qrSvg: string;
  secret: string;
};

type Props = {
  hasVerifiedFactor: boolean;
  verifiedFactorId: string | null;
};

function formatSecret(secret: string): string {
  // Group in 4-char chunks for readability when the user has to type it.
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

export function MfaSection({ hasVerifiedFactor, verifiedFactorId }: Props) {
  const [pending, startTransition] = useTransition();
  const [enroll, setEnroll] = useState<EnrollState | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // -------------------- VERIFIED STATE --------------------
  if (hasVerifiedFactor && verifiedFactorId) {
    return (
      <div className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}
        {info && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
            {info}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">2FA je uključeno</span>
        </div>
        <p className="text-xs text-slate-500">
          Prilikom prijave biće potreban 6-cifren kod iz vaše autentifikator
          aplikacije (Google Authenticator, 1Password, Authy itd.).
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setInfo(null);
            if (!confirm("Sigurno isključujete 2FA?")) return;
            startTransition(async () => {
              const res = await unenrollTotp(verifiedFactorId);
              if (res.error) setError(res.error);
              else setInfo("2FA je isključeno.");
            });
          }}
          className="text-sm font-medium text-red-600 hover:text-red-800 underline disabled:opacity-50"
        >
          {pending ? "Isključujem..." : "Isključi 2FA"}
        </button>
      </div>
    );
  }

  // -------------------- ENROLL FLOW --------------------
  if (!enroll) {
    return (
      <div className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}
        <p className="text-xs text-slate-500">
          Dodatno obezbedite nalog preko jednokratnih kodova iz autentifikator
          aplikacije. Pri prijavi se traži i 6-cifren kod, pored lozinke.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setInfo(null);
            startTransition(async () => {
              const res = await enrollTotp();
              if ("error" in res) {
                setError(res.error);
                return;
              }
              setEnroll(res);
            });
          }}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm disabled:opacity-50"
        >
          {pending ? "Pripremam..." : "Uključi 2FA"}
        </button>
      </div>
    );
  }

  // -------------------- VERIFY FLOW --------------------
  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <p className="text-xs text-slate-600">
          Skenirajte QR kod u vašoj autentifikator aplikaciji
          (Google Authenticator, 1Password, Authy...).
        </p>
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enroll.qrSvg}
            alt="QR kod za 2FA"
            className="w-48 h-48 bg-white rounded-lg border border-slate-200"
          />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-600 mb-1">
            Šifra ako QR ne radi:
          </div>
          <code className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono break-all select-all text-slate-800">
            {formatSecret(enroll.secret)}
          </code>
        </div>
      </div>

      <div>
        <label
          htmlFor="totp-code"
          className="block text-xs font-medium text-slate-700 mb-1"
        >
          Unesite 6-cifren kod iz aplikacije
        </label>
        <input
          id="totp-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 tracking-widest text-center font-mono"
          placeholder="000000"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending || code.length !== 6}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await verifyTotp(enroll.factorId, code);
              if (res.error) {
                setError(res.error);
                return;
              }
              setEnroll(null);
              setCode("");
              setInfo("2FA je uspešno uključeno.");
            });
          }}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm disabled:opacity-50"
        >
          {pending ? "Proveravam..." : "Potvrdi i uključi"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            // Cancel: drop the unverified factor server-side too.
            startTransition(async () => {
              await unenrollTotp(enroll.factorId);
              setEnroll(null);
              setCode("");
              setError(null);
            });
          }}
          className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2.5 disabled:opacity-50"
        >
          Otkaži
        </button>
      </div>
    </div>
  );
}

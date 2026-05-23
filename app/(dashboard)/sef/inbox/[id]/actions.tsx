"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptSefInbound, rejectSefInbound } from "@/app/actions/sef";

export function InboxActions({ inboxId }: { inboxId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onAccept = () => {
    if (!confirm("Da li želite da prihvatite ovu fakturu? Akcija se ne može poništiti.")) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await acceptSefInbound(inboxId);
        if ("error" in res && res.error) {
          setError(res.error);
        } else {
          router.refresh();
        }
      } catch {
        setError("Greška pri prihvatanju fakture. Pokušajte ponovo.");
      }
    });
  };

  const onReject = () => {
    if (reason.trim().length < 3) {
      setError("Razlog odbijanja je obavezan.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await rejectSefInbound(inboxId, reason.trim());
        if ("error" in res && res.error) {
          setError(res.error);
        } else {
          setRejecting(false);
          router.refresh();
        }
      } catch {
        setError("Greška pri odbijanju fakture. Pokušajte ponovo.");
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <h2 className="font-semibold text-slate-800">Odluka</h2>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}
      {!rejecting ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAccept}
            disabled={pending}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
          >
            {pending ? "..." : "Prihvati fakturu"}
          </button>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            disabled={pending}
            className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
          >
            Odbij fakturu
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Razlog odbijanja (obavezno)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-400 outline-none text-sm text-slate-800 resize-none"
            placeholder="npr. Pogrešno obračunat PDV, neispravne stavke..."
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReject}
              disabled={pending}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
            >
              {pending ? "..." : "Potvrdi odbijanje"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
                setReason("");
                setError(null);
              }}
              disabled={pending}
              className="text-sm text-slate-500 hover:text-slate-700 px-4 py-3"
            >
              Otkaži
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

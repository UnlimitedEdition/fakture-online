"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateInvoiceStatus,
  deleteInvoice,
  sendInvoiceEmail,
} from "@/app/actions/invoices";
import {
  sendInvoiceToSef,
  cancelSefInvoice,
  stornoSefInvoice,
  checkSefStatus,
} from "@/app/actions/sef";
import {
  canSendToSef,
  canCancelSef,
  canStornoSef,
} from "@/lib/sef/status-config";
import { SEF_STATUS_LABEL, SEF_STATUS_COLOR, type SefStatus } from "@/lib/sef/types";

export function InvoiceActions({
  invoiceId,
  status,
  hasClientEmail,
  sefStatus,
  sefEnabled,
}: {
  invoiceId: string;
  status: string;
  hasClientEmail: boolean;
  sefStatus: SefStatus | null;
  sefEnabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState("");

  const handleStatus = async (newStatus: string) => {
    setLoading(newStatus);
    const result = await updateInvoiceStatus(invoiceId, newStatus);
    if (result?.error) alert(result.error);
    setLoading("");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Da li ste sigurni da želite da obrišete ovu fakturu?")) return;
    setLoading("delete");
    try {
      const result = (await deleteInvoice(invoiceId)) as
        | { error?: string }
        | undefined;
      if (result?.error) {
        alert(result.error);
        setLoading("");
      }
    } catch (err) {
      if (err && typeof err === "object" && "digest" in err) throw err;
      alert("Greška pri brisanju.");
      setLoading("");
    }
  };

  const handleSendEmail = async () => {
    setLoading("email");
    const result = (await sendInvoiceEmail(invoiceId)) as {
      success?: boolean;
      warning?: string;
      error?: string;
    };
    if (result?.error) alert(result.error);
    else if (result?.warning) alert(result.warning);
    else if (result?.success) alert("Email je poslat klijentu.");
    setLoading("");
    router.refresh();
  };

  const handleSendSef = async () => {
    setLoading("sef-send");
    try {
      const res = await sendInvoiceToSef(invoiceId);
      if ("error" in res && res.error) {
        alert(res.error);
      } else if ("success" in res) {
        alert("Faktura je poslata na SEF.");
      }
    } catch (err) {
      if (err && typeof err === "object" && "digest" in err) throw err;
      alert("Greška pri slanju na SEF.");
    } finally {
      setLoading("");
      router.refresh();
    }
  };

  const handleCancelSef = async () => {
    const rawComment = prompt("Razlog otkazivanja (opciono):");
    if (rawComment === null) return;
    const comment = rawComment || undefined;
    setLoading("sef-cancel");
    try {
      const res = await cancelSefInvoice(invoiceId, comment);
      if ("error" in res && res.error) alert(res.error);
      else alert("Faktura je otkazana na SEF-u.");
    } catch (err) {
      if (err && typeof err === "object" && "digest" in err) throw err;
      alert("Greška pri otkazivanju.");
    } finally {
      setLoading("");
      router.refresh();
    }
  };

  const handleStornoSef = async () => {
    if (!confirm("Storniraćete ovu fakturu na SEF-u. Akcija je trajna. Nastaviti?")) return;
    const comment = prompt("Razlog storniranja (opciono):") ?? undefined;
    setLoading("sef-storno");
    try {
      const res = await stornoSefInvoice(invoiceId, comment);
      if ("error" in res && res.error) alert(res.error);
      else alert("Faktura je stornirana.");
    } catch (err) {
      if (err && typeof err === "object" && "digest" in err) throw err;
      alert("Greška pri storniranju.");
    } finally {
      setLoading("");
      router.refresh();
    }
  };

  const handleCheckSef = async () => {
    setLoading("sef-check");
    try {
      const res = await checkSefStatus(invoiceId);
      if ("error" in res && res.error) alert(res.error);
      else if ("success" in res && res.success) alert(`Status: ${res.status}`);
    } catch (err) {
      if (err && typeof err === "object" && "digest" in err) throw err;
      alert("Greška pri proveri statusa.");
    } finally {
      setLoading("");
      router.refresh();
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col gap-3 print:hidden">
      {/* SEF status pill (if any) */}
      {sefStatus && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-wider">SEF:</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${SEF_STATUS_COLOR[sefStatus]}`}>
            {SEF_STATUS_LABEL[sefStatus]}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Local status actions */}
        {status === "draft" && (
          <button
            onClick={() => handleStatus("sent")}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
          >
            {loading === "sent" ? "..." : "Označi kao poslato"}
          </button>
        )}
        {(status === "sent" || status === "overdue") && (
          <button
            onClick={() => handleStatus("paid")}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
          >
            {loading === "paid" ? "..." : "Označi kao plaćeno"}
          </button>
        )}
        {status === "sent" && (
          <button
            onClick={() => handleStatus("overdue")}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
          >
            {loading === "overdue" ? "..." : "Kasni"}
          </button>
        )}

        {/* SEF actions */}
        {sefEnabled && canSendToSef(sefStatus) && (
          <button
            onClick={handleSendSef}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50"
          >
            {loading === "sef-send" ? "..." : "Pošalji na SEF"}
          </button>
        )}
        {sefEnabled && sefStatus && sefStatus !== "nacrt" && (
          <button
            onClick={handleCheckSef}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
          >
            {loading === "sef-check" ? "..." : "Proveri SEF status"}
          </button>
        )}
        {sefEnabled && canCancelSef(sefStatus) && (
          <button
            onClick={handleCancelSef}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-700 transition-colors disabled:opacity-50"
          >
            {loading === "sef-cancel" ? "..." : "Otkaži SEF"}
          </button>
        )}
        {sefEnabled && canStornoSef(sefStatus) && (
          <button
            onClick={handleStornoSef}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
          >
            {loading === "sef-storno" ? "..." : "Storniraj na SEF-u"}
          </button>
        )}

        {/* Email */}
        {hasClientEmail && status !== "cancelled" && (
          <button
            onClick={handleSendEmail}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            {loading === "email" ? "Šaljem..." : "Pošalji email"}
          </button>
        )}

        {/* Download PDF (server-rendered) */}
        <a
          href={`/api/invoices/${invoiceId}/pdf`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Preuzmi PDF
        </a>

        {/* Print */}
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-slate-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
          </svg>
          Štampaj
        </button>

        {/* Edit */}
        {(status === "draft" || status === "sent") && (
          <Link
            href={`/fakture/${invoiceId}/izmeni`}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-slate-600 transition-colors"
          >
            Izmeni
          </Link>
        )}

        {/* Delete */}
        {status === "draft" && !sefStatus && (
          <button
            onClick={handleDelete}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            {loading === "delete" ? "..." : "Obriši"}
          </button>
        )}
      </div>
    </div>
  );
}

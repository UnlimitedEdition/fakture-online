"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateInvoiceStatus,
  deleteInvoice,
  sendInvoiceEmail,
} from "@/app/actions/invoices";

export function InvoiceActions({
  invoiceId,
  status,
  hasClientEmail,
}: {
  invoiceId: string;
  status: string;
  hasClientEmail: boolean;
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {/* Status actions */}
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

      {/* Print */}
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-slate-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
        </svg>
        Štampaj / PDF
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
      {status === "draft" && (
        <button
          onClick={handleDelete}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          {loading === "delete" ? "..." : "Obriši"}
        </button>
      )}
    </div>
  );
}

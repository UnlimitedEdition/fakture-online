import type { InvoiceStatus } from "./types";

export const invoiceStatusConfig: Record<
  InvoiceStatus,
  { label: string; color: string }
> = {
  draft: { label: "Nacrt", color: "bg-slate-100 text-slate-600" },
  sent: { label: "Poslato", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Plaćeno", color: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Kasni", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Otkazano", color: "bg-gray-100 text-gray-500" },
};

export function getInvoiceStatus(status: string) {
  return invoiceStatusConfig[status as InvoiceStatus] ?? invoiceStatusConfig.draft;
}

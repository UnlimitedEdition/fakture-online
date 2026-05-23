import { sefRequest } from "./client";
import { PATH } from "./endpoints";
import type { SefApiResponse, SefCredentials } from "../types";

export interface ChangedInvoice {
  SalesInvoiceId?: string;
  InvoiceId?: string;
  InvoiceNumber?: string;
  Status?: string;
  DateChanged?: string;
}

export interface ListChangesResponse {
  // SEF response shape; tolerant to either array root or wrapped object.
  Items?: ChangedInvoice[];
  Result?: ChangedInvoice[];
}

// NOTE: SEF only returns changes for dates STRICTLY in the past.
// dateFrom / dateTo must be ISO date strings (YYYY-MM-DDTHH:mm:ss).
export async function sefListSalesChanges(args: {
  creds: SefCredentials;
  dateFrom: string;
  dateTo: string;
}): Promise<SefApiResponse<ListChangesResponse | ChangedInvoice[]>> {
  return sefRequest<ListChangesResponse | ChangedInvoice[]>({
    creds: args.creds,
    method: "POST",
    path: PATH.salesInvoiceChanges,
    contentType: "application/json",
    body: JSON.stringify({ dateFrom: args.dateFrom, dateTo: args.dateTo }),
  });
}

export async function sefListPurchaseChanges(args: {
  creds: SefCredentials;
  dateFrom: string;
  dateTo: string;
}): Promise<SefApiResponse<ListChangesResponse | ChangedInvoice[]>> {
  return sefRequest<ListChangesResponse | ChangedInvoice[]>({
    creds: args.creds,
    method: "POST",
    path: PATH.purchaseInvoiceChanges,
    contentType: "application/json",
    body: JSON.stringify({ dateFrom: args.dateFrom, dateTo: args.dateTo }),
  });
}

export function unwrapChanges(
  data: ListChangesResponse | ChangedInvoice[] | undefined,
): ChangedInvoice[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.Items ?? data.Result ?? [];
}

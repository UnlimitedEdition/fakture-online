import { sefRequest } from "./client";
import { PATH } from "./endpoints";
import type { SefApiResponse, SefCredentials } from "../types";

export interface InboxIdRow {
  PurchaseInvoiceId?: string;
  InvoiceId?: string;
  InvoiceNumber?: string;
  Status?: string;
  DateSent?: string;
  ContractorName?: string;
  ContractorPib?: string;
  Amount?: number;
  CurrencyCode?: string;
}

export interface InboxListResponse {
  Items?: InboxIdRow[];
  Result?: InboxIdRow[];
  TotalCount?: number;
}

export async function sefListInbox(args: {
  creds: SefCredentials;
  dateFrom: string;       // ISO datetime
  dateTo: string;
  status?: string;        // optional filter (e.g. "Slanje", "Poslato")
  pageIndex?: number;
  pageSize?: number;
}): Promise<SefApiResponse<InboxListResponse | InboxIdRow[]>> {
  return sefRequest<InboxListResponse | InboxIdRow[]>({
    creds: args.creds,
    method: "POST",
    path: PATH.purchaseInvoiceIds,
    contentType: "application/json",
    body: JSON.stringify({
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
      status: args.status ?? null,
      pageIndex: args.pageIndex ?? 0,
      pageSize: args.pageSize ?? 100,
    }),
  });
}

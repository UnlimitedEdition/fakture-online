import { sefRequest } from "./client";
import { PATH } from "./endpoints";
import type { SefApiResponse, SefCredentials, SefStatus } from "../types";
import { mapSefRemoteStatus } from "../types";

export interface InvoiceStatusResponse {
  SalesInvoiceId?: string;
  InvoiceId?: string;
  InvoiceNumber?: string;
  Status?: string;
  DateSent?: string;
  DueDate?: string;
  Amount?: number;
  CurrencyCode?: string;
  ContractorName?: string;
  ContractorPib?: string;
  // SEF returns Errors[] when status is Greska
  Errors?: string[];
}

export interface ParsedStatus {
  raw: string | null;
  status: SefStatus | null;
  errorMessage: string | null;
}

export async function sefGetInvoice(args: {
  creds: SefCredentials;
  salesInvoiceId: string;
}): Promise<SefApiResponse<InvoiceStatusResponse>> {
  return sefRequest<InvoiceStatusResponse>({
    creds: args.creds,
    method: "GET",
    path: PATH.salesInvoice,
    query: { invoiceId: args.salesInvoiceId },
  });
}

export function parseStatusResponse(res: SefApiResponse<InvoiceStatusResponse>): ParsedStatus {
  if (!res.ok || !res.data) {
    return { raw: null, status: null, errorMessage: res.errorMessage ?? null };
  }
  const raw = res.data.Status ?? null;
  return {
    raw,
    status: mapSefRemoteStatus(raw),
    errorMessage: res.data.Errors?.[0] ?? null,
  };
}

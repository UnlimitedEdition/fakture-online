import { sefRequest } from "./client";
import { PATH } from "./endpoints";
import type { SefApiResponse, SefCredentials } from "../types";

export interface CancelResponse {
  Status?: string;
  Message?: string;
}

export async function sefCancelInvoice(args: {
  creds: SefCredentials;
  salesInvoiceId: string;
  comment?: string;
}): Promise<SefApiResponse<CancelResponse>> {
  return sefRequest<CancelResponse>({
    creds: args.creds,
    method: "POST",
    path: PATH.salesInvoiceCancel,
    query: { invoiceId: args.salesInvoiceId, comment: args.comment },
  });
}

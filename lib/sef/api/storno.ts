import { sefRequest } from "./client";
import { PATH } from "./endpoints";
import type { SefApiResponse, SefCredentials } from "../types";

export interface StornoResponse {
  Status?: string;
  Message?: string;
}

// Storno acts on an already-sent invoice (Poslato/Odobreno/Odbijeno). It
// transitions the doc to Storniran. The actual credit-note XML is sent
// separately via sefSendInvoice with documentType='credit_note'.
export async function sefStornoInvoice(args: {
  creds: SefCredentials;
  salesInvoiceId: string;
  comment?: string;
}): Promise<SefApiResponse<StornoResponse>> {
  return sefRequest<StornoResponse>({
    creds: args.creds,
    method: "POST",
    path: PATH.salesInvoiceStorno,
    query: { invoiceId: args.salesInvoiceId, comment: args.comment },
  });
}

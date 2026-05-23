import { sefRequest } from "./client";
import { PATH } from "./endpoints";
import type { SefApiResponse, SefCredentials } from "../types";

export interface SendInvoiceResponse {
  SalesInvoiceId?: string;
  InvoiceId?: string;          // alternative naming
  Status?: string;
  InvoiceNumber?: string;
  ErrorMessages?: string[];
}

export async function sefSendInvoice(args: {
  creds: SefCredentials;
  xml: string;
  invoiceNumber: string;
  // Demo-mode flag for the request:
  sendToCir?: boolean;         // additional flag to also route to CRF for B2G
  idempotencyKey?: string;
}): Promise<SefApiResponse<SendInvoiceResponse>> {
  return sefRequest<SendInvoiceResponse>({
    creds: args.creds,
    method: "POST",
    path: PATH.salesInvoiceUbl,
    query: args.sendToCir ? { requestId: args.invoiceNumber, sendToCir: "true" } : { requestId: args.invoiceNumber },
    contentType: "application/xml",
    body: args.xml,
    acceptJson: true,
    idempotencyKey: args.idempotencyKey,
    // Sending is idempotent IF we set requestId — SEF de-dupes by it.
  });
}

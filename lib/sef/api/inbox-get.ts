import { sefRequest } from "./client";
import { PATH } from "./endpoints";
import type { SefApiResponse, SefCredentials } from "../types";

// Retrieve the raw UBL XML of a received invoice (returned in `raw`).
export async function sefGetInboxXml(args: {
  creds: SefCredentials;
  purchaseInvoiceId: string;
}): Promise<SefApiResponse<unknown>> {
  return sefRequest<unknown>({
    creds: args.creds,
    method: "GET",
    path: PATH.purchaseInvoiceXml,
    query: { invoiceId: args.purchaseInvoiceId },
    acceptJson: false,
  });
}

export async function sefGetInboxMeta(args: {
  creds: SefCredentials;
  purchaseInvoiceId: string;
}): Promise<SefApiResponse<Record<string, unknown>>> {
  return sefRequest<Record<string, unknown>>({
    creds: args.creds,
    method: "GET",
    path: PATH.purchaseInvoice,
    query: { invoiceId: args.purchaseInvoiceId },
  });
}

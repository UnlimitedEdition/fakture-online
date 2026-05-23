import { sefRequest } from "./client";
import { PATH } from "./endpoints";
import type { SefApiResponse, SefCredentials } from "../types";

// Retrieves the SEF-signed copy of a sent invoice (returns raw XML in `raw`).
export async function sefGetSignedXml(args: {
  creds: SefCredentials;
  salesInvoiceId: string;
}): Promise<SefApiResponse<unknown>> {
  return sefRequest<unknown>({
    creds: args.creds,
    method: "GET",
    path: PATH.salesInvoiceXml,
    query: { invoiceId: args.salesInvoiceId },
    acceptJson: false,
  });
}

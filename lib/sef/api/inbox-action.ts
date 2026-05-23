import { sefRequest } from "./client";
import { PATH } from "./endpoints";
import type { SefApiResponse, SefCredentials } from "../types";

export type InboxActionType = "Accept" | "Reject";

export async function sefInboxAction(args: {
  creds: SefCredentials;
  purchaseInvoiceId: string;
  action: InboxActionType;
  comment?: string;
}): Promise<SefApiResponse<{ Status?: string; Message?: string }>> {
  return sefRequest<{ Status?: string; Message?: string }>({
    creds: args.creds,
    method: "POST",
    path: PATH.purchaseInvoiceAction,
    query: {
      invoiceId: args.purchaseInvoiceId,
      action: args.action,
      comment: args.comment,
    },
  });
}

import { sefRequest } from "./client";
import { PATH } from "./endpoints";
import type { SefApiResponse, SefCredentials } from "../types";

export interface CompanyCheckResponse {
  Registered?: boolean;
  CompanyName?: string;
  Pib?: string;
  JBKJS?: string;
  IsBudgetUser?: boolean;
}

export async function sefCheckCompany(args: {
  creds: SefCredentials;
  pib: string;
  jbkjs?: string;
}): Promise<SefApiResponse<CompanyCheckResponse>> {
  return sefRequest<CompanyCheckResponse>({
    creds: args.creds,
    method: "POST",
    path: PATH.checkCompany,
    contentType: "application/json",
    body: JSON.stringify({ Tin: args.pib, Jbkjs: args.jbkjs ?? null }),
  });
}

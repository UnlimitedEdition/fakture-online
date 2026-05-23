import { sefRequest } from "./client";
import { PATH } from "./endpoints";
import type { SefApiResponse, SefCredentials } from "../types";

export interface SefCompanyRow {
  Pib?: string;
  Tin?: string;
  Name?: string;
  CompanyName?: string;
  JBKJS?: string;
  Jbkjs?: string;
  IsBudgetUser?: boolean;
}

export interface CompaniesListResponse {
  Items?: SefCompanyRow[];
  Result?: SefCompanyRow[];
}

// Bulk fetch of all companies registered on SEF. Used for daily registry refresh.
export async function sefListAllCompanies(
  creds: SefCredentials,
): Promise<SefApiResponse<CompaniesListResponse | SefCompanyRow[]>> {
  return sefRequest<CompaniesListResponse | SefCompanyRow[]>({
    creds,
    method: "GET",
    path: PATH.getAllCompanies,
    timeoutMs: 120_000, // can be a large payload
  });
}

export function unwrapCompanies(
  data: CompaniesListResponse | SefCompanyRow[] | undefined,
): SefCompanyRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.Items ?? data.Result ?? [];
}

export function normaliseCompany(row: SefCompanyRow): {
  pib: string | null;
  name: string | null;
  jbkjs: string | null;
  isBudgetUser: boolean;
} {
  return {
    pib: row.Pib ?? row.Tin ?? null,
    name: row.CompanyName ?? row.Name ?? null,
    jbkjs: row.JBKJS ?? row.Jbkjs ?? null,
    isBudgetUser: row.IsBudgetUser === true || (!!row.JBKJS && row.JBKJS.length > 0),
  };
}

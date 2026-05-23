import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/uuid";

export const ACTIVE_ORG_COOKIE = "fo_active_org";

export type OrgRow = {
  org_id: string;
  name: string;
  role: string;
  owner_user_id: string;
  created_at: string;
};

// Loads the caller's orgs (via fo_my_orgs RPC) and resolves which one is the
// "active" org for this request — the cookie value if it points to an org the
// user actually belongs to, else the first owner-role org, else the first row.
// Returns both so layouts/pages can render the switcher without an extra query.
export async function loadActiveOrg(
  supabase: SupabaseClient,
): Promise<{ orgs: OrgRow[]; activeOrgId: string | null }> {
  const { data, error } = await supabase.rpc("fo_my_orgs");
  if (error) {
    console.error("[active-org.load]", { code: error.code, message: error.message });
    return { orgs: [], activeOrgId: null };
  }
  const orgs = (data ?? []) as OrgRow[];
  if (orgs.length === 0) return { orgs, activeOrgId: null };

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;

  const fromCookie = cookieValue && isUuid(cookieValue)
    ? orgs.find((o) => o.org_id === cookieValue)
    : undefined;
  if (fromCookie) return { orgs, activeOrgId: fromCookie.org_id };

  const owned = orgs.find((o) => o.role === "owner");
  return { orgs, activeOrgId: (owned ?? orgs[0]).org_id };
}

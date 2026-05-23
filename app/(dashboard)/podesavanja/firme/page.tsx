import { requireUser } from "@/lib/supabase/server";
import { loadActiveOrg } from "@/lib/active-org";
import type { OrgRow } from "@/lib/active-org";
import { NewOrgForm } from "./new-org-form";
import { InviteForm } from "./invite-form";
import { CancelInviteButton } from "./cancel-invite-button";
import Link from "next/link";

type MemberRow = {
  member_id: string;
  user_id: string;
  email: string | null;
  role: string;
  invited_at: string;
  accepted_at: string | null;
};

type InviteRow = {
  id: string;
  email: string;
  role: string;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  owner: "vlasnik",
  admin: "administrator",
  accountant: "računovođa",
  viewer: "član",
};

function roleClasses(role: string) {
  switch (role) {
    case "owner":
      return "bg-teal-50 text-teal-700";
    case "admin":
      return "bg-indigo-50 text-indigo-700";
    case "accountant":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("sr-Latn-RS", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export default async function FirmePage() {
  const { supabase, user } = await requireUser();
  const { orgs } = await loadActiveOrg(supabase);

  // Fetch members + invites for each org in parallel. For non-owner orgs the
  // invites RPC will raise — we swallow the error and render an empty list.
  const detailsByOrg = await Promise.all(
    orgs.map(async (o: OrgRow) => {
      const { data: members, error: mErr } = await supabase.rpc(
        "fo_org_members_list",
        { p_org_id: o.org_id },
      );
      if (mErr) {
        console.error("[firme.members]", {
          user_id: user.id,
          org_id: o.org_id,
          code: mErr.code,
        });
      }
      let invites: InviteRow[] = [];
      if (o.role === "owner") {
        const { data: inv, error: iErr } = await supabase.rpc(
          "fo_org_invites_list",
          { p_org_id: o.org_id },
        );
        if (iErr) {
          console.error("[firme.invites]", {
            user_id: user.id,
            org_id: o.org_id,
            code: iErr.code,
          });
        }
        invites = ((inv ?? []) as InviteRow[]).filter((x) => x.accepted_at === null);
      }
      return {
        org: o,
        members: (members ?? []) as MemberRow[],
        invites,
      };
    }),
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/podesavanja"
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Nazad na Podešavanja
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 mt-2">Firme i članovi</h1>
        <p className="text-slate-500 text-sm mt-1">
          Upravljajte firmama (orgs) i pozivajte računovođe. Za svaku firmu u
          kojoj ste vlasnik možete dodati članove sa ulogama
          administrator/računovođa/član.
        </p>
      </div>

      {/* Nova firma */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-800">Nova firma</h2>
          <p className="text-xs text-slate-500 mt-1">
            Kreiranjem nove firme postajete njen vlasnik. Možete prebacivati
            aktivnu firmu kroz birač u sidebaru.
          </p>
        </div>
        <NewOrgForm />
      </section>

      {/* Postojeće firme */}
      <section className="space-y-4">
        <h2 className="font-semibold text-slate-800">Vaše firme</h2>
        {detailsByOrg.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm">
            Nemate nijednu firmu. Kreirajte je iznad ili sačekajte poziv od
            vlasnika.
          </div>
        )}
        {detailsByOrg.map(({ org, members, invites }) => (
          <div
            key={org.org_id}
            className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800 text-lg truncate">
                  {org.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${roleClasses(org.role)}`}
                  >
                    Vi ste: {ROLE_LABEL[org.role] ?? org.role}
                  </span>
                  <span className="text-xs text-slate-400">
                    {members.length} {members.length === 1 ? "član" : "članova"}
                  </span>
                </div>
              </div>
            </div>

            {/* Članovi */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                Članovi
              </p>
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {members.map((m) => (
                  <li
                    key={m.member_id}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-xs shrink-0">
                      {(m.email ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 truncate">
                        {m.email ?? "(nepoznat email)"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {m.accepted_at
                          ? `Pristupio ${formatDate(m.accepted_at)}`
                          : "Čeka prihvatanje"}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${roleClasses(m.role)}`}
                    >
                      {ROLE_LABEL[m.role] ?? m.role}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Owner-only: pozivi */}
            {org.role === "owner" && (
              <>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                    Pozovi računovođu
                  </p>
                  <InviteForm orgId={org.org_id} />
                </div>

                {invites.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                      Pozivi na čekanju
                    </p>
                    <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                      {invites.map((i) => (
                        <li
                          key={i.id}
                          className="flex items-center gap-3 px-3 py-2.5 text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-800 truncate">{i.email}</p>
                            <p className="text-xs text-slate-400">
                              Poslat {formatDate(i.invited_at)} • Ističe{" "}
                              {formatDate(i.expires_at)}
                            </p>
                          </div>
                          <span
                            className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${roleClasses(i.role)}`}
                          >
                            {ROLE_LABEL[i.role] ?? i.role}
                          </span>
                          <CancelInviteButton inviteId={i.id} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

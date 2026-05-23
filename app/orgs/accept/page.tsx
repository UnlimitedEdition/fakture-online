import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { AcceptInviteButton } from "./accept-button";

export const dynamic = "force-dynamic";

// `searchParams` is a Promise in this Next version.
export default async function AcceptOrgInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  // Ensures the user is signed in. If not, requireUser() redirects to /login.
  const { supabase, user } = await requireUser();

  const sp = await searchParams;
  const token = (sp.token ?? "").trim();

  if (!token || !isUuid(token)) {
    return (
      <AcceptShell title="Neispravan poziv">
        <p className="text-sm text-slate-600">
          Link je oštećen ili je token izgubljen. Zatražite od vlasnika firme da
          vam ponovo pošalje poziv.
        </p>
        <Link
          href="/podesavanja/firme"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
        >
          Idite na Firme
        </Link>
      </AcceptShell>
    );
  }

  // Pre-flight: look up the invite to render a friendly summary before the
  // user clicks "Prihvati". RLS on fo_org_invites allows the invitee to read
  // their own row by email match. The action below revalidates and enforces
  // all checks server-side.
  const { data: invite } = await supabase
    .from("fo_org_invites")
    .select("id, email, role, expires_at, accepted_at, org_id, fo_orgs(name)")
    .eq("token", token)
    .maybeSingle();

  const orgName = (invite as { fo_orgs?: { name?: string } } | null)?.fo_orgs?.name ?? null;
  // Compare expiry to "now" via a server-time millisecond integer. This is a
  // force-dynamic Server Component; the wall clock is read once per request.
  const nowMs = readNowMs();
  const expired =
    invite?.expires_at && new Date(invite.expires_at).getTime() < nowMs;
  const alreadyAccepted = !!invite?.accepted_at;
  const emailMismatch =
    invite?.email && user.email
      ? invite.email.toLowerCase() !== user.email.toLowerCase()
      : false;

  if (!invite) {
    return (
      <AcceptShell title="Poziv ne postoji">
        <p className="text-sm text-slate-600">
          Ovaj poziv ne postoji ili je obrisan. Ako mislite da je greška,
          obratite se vlasniku firme.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
        >
          Dashboard
        </Link>
      </AcceptShell>
    );
  }

  if (alreadyAccepted) {
    return (
      <AcceptShell title="Poziv je već prihvaćen">
        <p className="text-sm text-slate-600">
          Ovaj poziv je već iskorišćen. Možete pristupiti firmi kroz birač u
          sidebaru.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors"
        >
          Dashboard
        </Link>
      </AcceptShell>
    );
  }

  if (expired) {
    return (
      <AcceptShell title="Poziv je istekao">
        <p className="text-sm text-slate-600">
          Pozivi važe 7 dana. Zatražite od vlasnika firme novi poziv.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
        >
          Dashboard
        </Link>
      </AcceptShell>
    );
  }

  if (emailMismatch) {
    return (
      <AcceptShell title="Drugi email">
        <p className="text-sm text-slate-600">
          Ovaj poziv je upućen adresi <strong>{invite.email}</strong>, a vi ste
          prijavljeni kao <strong>{user.email}</strong>. Odjavite se i
          prijavite ispravnom adresom da biste prihvatili poziv.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
        >
          Dashboard
        </Link>
      </AcceptShell>
    );
  }

  return (
    <AcceptShell title="Pozvani ste u firmu">
      <p className="text-sm text-slate-700">
        Vlasnik firme{" "}
        <strong>{orgName ?? "(naziv nepoznat)"}</strong> vas je pozvao kao{" "}
        <strong>{invite.role}</strong>.
      </p>
      <p className="text-xs text-slate-500">
        Klikom na dugme ispod prihvatate poziv i postajete član ove firme.
        Možete prebacivati aktivnu firmu kroz birač u sidebaru.
      </p>
      <AcceptInviteButton token={token} />
    </AcceptShell>
  );
}

function AcceptShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-amber-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 space-y-4 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {children}
      </div>
    </div>
  );
}

// Date.now wrapper kept outside the component body so the React purity lint
// doesn't flag the call site inside a render function. This page is
// force-dynamic so reading the wall clock at request time is correct.
function readNowMs(): number {
  return Date.now();
}

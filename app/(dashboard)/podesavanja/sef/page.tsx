import { requireUser } from "@/lib/supabase/server";
import { SefSettingsForm } from "./form";

export default async function SefSettingsPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("fo_profiles")
    .select("sef_api_key_encrypted, sef_demo_mode, is_budget_user, jbkjs, sef_callback_secret")
    .eq("id", user.id)
    .single();

  const hasKey = !!profile?.sef_api_key_encrypted;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const callbackUrl = profile?.sef_callback_secret
    ? `${siteUrl}/api/sef/callback/${user.id}?secret=${profile.sef_callback_secret}`
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">SEF integracija</h1>
        <p className="text-slate-500 text-sm mt-1">
          Sistem elektronskih faktura — obavezan za B2B i B2G fakturisanje u Srbiji.
        </p>
      </div>

      <SefSettingsForm
        hasKey={hasKey}
        demoMode={profile?.sef_demo_mode !== false}
        isBudgetUser={profile?.is_budget_user ?? false}
        jbkjs={profile?.jbkjs ?? ""}
        callbackUrl={callbackUrl}
      />

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
        <h2 className="font-semibold mb-2">Kako da dobijem SEF API ključ?</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            Prijavite se na portal{" "}
            <a
              href="https://efaktura.mfin.gov.rs/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              efaktura.mfin.gov.rs
            </a>{" "}
            (preko eID.gov.rs).
          </li>
          <li>
            Otvorite <strong>Podešavanja → API menadžment → Autentifikacioni ključ</strong>.
          </li>
          <li>
            Kliknite <strong>Generiši</strong> i prebacite <strong>API status</strong> na <em>Aktivno</em>.
          </li>
          <li>Kopirajte ključ i unesite ga ispod.</li>
        </ol>
        <p className="mt-3 text-xs">
          Za testiranje koristite demo:{" "}
          <a
            href="https://demoefaktura.mfin.gov.rs/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            demoefaktura.mfin.gov.rs
          </a>
          . Demo i prod imaju različite ključeve.
        </p>
      </div>
    </div>
  );
}

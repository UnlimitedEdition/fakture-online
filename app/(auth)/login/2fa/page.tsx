import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TwoFactorChallengeForm } from "./form";

export default async function LoginTwoFactorPage() {
  const supabase = await createClient();

  // The user must be at least AAL1 (i.e. password sign-in already happened).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // If they've already cleared MFA (AAL2) or don't have a verified factor at
  // all, there is nothing to challenge — send them straight to the app.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal) redirect("/dashboard");

  if (aal.currentLevel === "aal2") redirect("/dashboard");
  if (aal.nextLevel !== "aal2") redirect("/dashboard");

  return (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-2xl font-bold text-teal-700">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          Dvofaktorska potvrda
        </div>
        <p className="text-slate-500 mt-2 text-sm">
          Unesite 6-cifren kod iz vaše autentifikator aplikacije.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <TwoFactorChallengeForm />
      </div>
    </>
  );
}

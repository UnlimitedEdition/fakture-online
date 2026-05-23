"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptOrgInvite } from "@/app/actions/orgs";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await acceptOrgInvite(token);
            if ("error" in result && result.error) {
              setError(result.error);
              return;
            }
            router.push("/podesavanja/firme?accepted=1");
          });
        }}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Prihvatam..." : "Prihvati poziv"}
      </button>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { cancelOrgInvite } from "@/app/actions/orgs";

export function CancelInviteButton({ inviteId }: { inviteId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Da li ste sigurni da želite da otkažete poziv?")) return;
        startTransition(async () => {
          await cancelOrgInvite(inviteId);
        });
      }}
      className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Otkazujem..." : "Otkaži poziv"}
    </button>
  );
}

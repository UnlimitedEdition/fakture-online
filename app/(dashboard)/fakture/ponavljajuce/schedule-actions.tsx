"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { pauseSchedule, resumeSchedule, deleteSchedule } from "@/app/actions/recurring";

export function ScheduleActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onPauseResume = () => {
    startTransition(async () => {
      try {
        if (status === "active") await pauseSchedule(id);
        else await resumeSchedule(id);
        router.refresh();
      } catch (err) {
        if (err && typeof err === "object" && "digest" in err) throw err;
      }
    });
  };

  const onDelete = () => {
    if (!confirm("Obrisati šemu? Postojeće generisane fakture ostaju.")) return;
    startTransition(async () => {
      try {
        await deleteSchedule(id);
        router.refresh();
      } catch (err) {
        if (err && typeof err === "object" && "digest" in err) throw err;
      }
    });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {status !== "ended" && (
        <button
          type="button"
          onClick={onPauseResume}
          disabled={pending}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1"
        >
          {status === "active" ? "Pauziraj" : "Aktiviraj"}
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1"
      >
        Obriši
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { setActiveOrg } from "@/app/actions/orgs";
import type { OrgRow } from "@/lib/active-org";

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

export function OrgSwitcher({
  orgs,
  activeOrgId,
  onItemClick,
}: {
  orgs: OrgRow[];
  activeOrgId: string | null;
  onItemClick?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (orgs.length === 0) {
    return (
      <div className="px-6 py-4 border-b border-gray-100">
        <Link
          href="/podesavanja/firme"
          onClick={onItemClick}
          className="block w-full text-center text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl px-3 py-2 transition-colors"
        >
          + Dodaj firmu
        </Link>
      </div>
    );
  }

  const active = orgs.find((o) => o.org_id === activeOrgId) ?? orgs[0];

  return (
    <div ref={ref} className="px-4 py-3 border-b border-gray-100 relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-colors disabled:opacity-60"
      >
        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-sm shrink-0">
          {active.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {active.name}
          </p>
          <span
            className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${roleClasses(active.role)}`}
          >
            {ROLE_LABEL[active.role] ?? active.role}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-4 right-4 top-full mt-2 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          <ul className="max-h-72 overflow-y-auto py-1">
            {orgs.map((o) => {
              const isActive = o.org_id === active.org_id;
              return (
                <li key={o.org_id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    disabled={pending || isActive}
                    onClick={() => {
                      if (isActive) {
                        setOpen(false);
                        return;
                      }
                      startTransition(async () => {
                        await setActiveOrg(o.org_id);
                        setOpen(false);
                      });
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      isActive ? "bg-teal-50" : "hover:bg-stone-50"
                    } disabled:cursor-default`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-xs shrink-0">
                      {o.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {o.name}
                      </p>
                      <span
                        className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${roleClasses(o.role)}`}
                      >
                        {ROLE_LABEL[o.role] ?? o.role}
                      </span>
                    </div>
                    {isActive && (
                      <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-gray-100">
            <Link
              href="/podesavanja/firme"
              onClick={() => {
                setOpen(false);
                onItemClick?.();
              }}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Dodaj firmu
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

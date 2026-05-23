"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function KpoYearPicker({ currentYear }: { currentYear: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => thisYear - i);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("year", e.target.value);
    router.push(`/knjige/kpo?${sp.toString()}`);
  };

  return (
    <select
      value={currentYear}
      onChange={onChange}
      className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 bg-white text-slate-700"
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}

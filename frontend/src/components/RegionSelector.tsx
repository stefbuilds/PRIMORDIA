"use client";

import type { Region } from "@/types";

interface Props {
  regions: Region[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function RegionSelector({ regions, selected, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {regions.map((region) => (
        <button
          key={region.id}
          onClick={() => onSelect(region.id)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            selected === region.id
              ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
          title={region.description}
        >
          {region.name}
        </button>
      ))}
    </div>
  );
}

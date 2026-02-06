"use client";

import type { Regime, RegimeInfo } from "@/types";

interface Props {
  currentRegime: Regime | null;
  allRegimes: RegimeInfo[];
  selectedDate: string;
}

const regimeConfig: Record<string, { label: string; color: string; icon: string }> = {
  HYPE_PUMP: {
    label: "Hype Pump",
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    icon: "📈",
  },
  SUPPLY_SHOCK: {
    label: "Supply Shock",
    color: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    icon: "⚠️",
  },
  PANIC_SELL: {
    label: "Panic Sell",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    icon: "📉",
  },
  REAL_GROWTH: {
    label: "Real Growth",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: "🌱",
  },
  MEAN_REVERSION: {
    label: "Mean Reversion",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: "⚖️",
  },
};

export default function SimulationState({
  currentRegime,
  allRegimes,
  selectedDate,
}: Props) {
  return (
    <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Simulation State
        </h4>
        <span className="text-xs text-slate-500">{selectedDate}</span>
      </div>

      {/* Current regime */}
      {currentRegime ? (
        <div
          className={`rounded-lg p-3 border ${
            regimeConfig[currentRegime.type]?.color || "bg-slate-700/30 text-slate-300 border-slate-600/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {regimeConfig[currentRegime.type]?.icon || "🔄"}
            </span>
            <div>
              <div className="font-semibold text-sm">
                {regimeConfig[currentRegime.type]?.label || currentRegime.type}
              </div>
              <div className="text-xs opacity-75">
                Progress: {(currentRegime.progress * 100).toFixed(0)}% •
                Intensity: {(currentRegime.intensity * 100).toFixed(0)}%
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-black/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-current opacity-50 transition-all"
              style={{ width: `${currentRegime.progress * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg p-3 bg-slate-700/20 border border-slate-600/30 text-slate-400 text-sm">
          <span className="text-lg mr-2">😴</span>
          No active regime — baseline conditions
        </div>
      )}

      {/* All regimes in window */}
      {allRegimes.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-slate-500 mb-2">
            Regimes in 30-day window:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allRegimes.map((r, i) => (
              <div
                key={i}
                className={`text-xs px-2 py-1 rounded ${
                  regimeConfig[r.type]?.color || "bg-slate-700/30 text-slate-300"
                }`}
                title={`${r.start_date} to ${r.end_date} (${r.duration} days)`}
              >
                {regimeConfig[r.type]?.icon} {r.start_date.slice(5)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

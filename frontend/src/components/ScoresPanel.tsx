"use client";

import type { Signals } from "@/types";

interface Props {
  signals: Signals | null;
  loading: boolean;
}

function ScoreBar({
  label,
  value,
  confidence,
  colorPositive,
  colorNegative,
}: {
  label: string;
  value: number;
  confidence: number;
  colorPositive: string;
  colorNegative: string;
}) {
  const percent = ((value + 1) / 2) * 100; // Map [-1, 1] to [0, 100]
  const isPositive = value >= 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            conf: {(confidence * 100).toFixed(0)}%
          </span>
          <span
            className={`font-mono font-semibold ${
              isPositive ? colorPositive : colorNegative
            }`}
          >
            {value >= 0 ? "+" : ""}
            {value.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-500 z-10" />
        <div
          className={`absolute top-0 bottom-0 transition-all duration-300 ${
            isPositive
              ? colorPositive.replace("text-", "bg-")
              : colorNegative.replace("text-", "bg-")
          }`}
          style={{
            left: isPositive ? "50%" : `${percent}%`,
            width: isPositive ? `${percent - 50}%` : `${50 - percent}%`,
            opacity: 0.3 + confidence * 0.7,
          }}
        />
      </div>
    </div>
  );
}

function DivergenceMeter({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 70) return "text-red-400";
    if (score >= 45) return "text-amber-400";
    if (score >= 25) return "text-yellow-400";
    return "text-emerald-400";
  };

  const getLabel = () => {
    if (score >= 70) return "CRITICAL";
    if (score >= 45) return "ELEVATED";
    if (score >= 25) return "MODERATE";
    return "LOW";
  };

  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
      <div className="text-center">
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">
          Divergence Score
        </div>
        <div className={`text-5xl font-bold ${getColor()} font-mono`}>
          {score.toFixed(0)}
        </div>
        <div className={`text-sm font-semibold mt-1 ${getColor()}`}>
          {getLabel()}
        </div>
      </div>
      <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            score >= 70
              ? "bg-red-500"
              : score >= 45
              ? "bg-amber-500"
              : score >= 25
              ? "bg-yellow-500"
              : "bg-emerald-500"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
}

export default function ScoresPanel({ signals, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="bg-slate-800/50 rounded-xl h-32" />
        <div className="bg-slate-800/50 rounded-lg h-16" />
        <div className="bg-slate-800/50 rounded-lg h-16" />
      </div>
    );
  }

  if (!signals) {
    return (
      <div className="text-slate-500 text-center py-12">
        <div className="text-4xl mb-2">📡</div>
        <div>Select a region to analyze signals</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DivergenceMeter score={signals.divergence_score} />

      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-4">
        <ScoreBar
          label="🛰️ Satellite Signal"
          value={signals.satellite_score}
          confidence={signals.satellite_raw.confidence}
          colorPositive="text-emerald-400"
          colorNegative="text-red-400"
        />
        <ScoreBar
          label="📰 News Signal"
          value={signals.news_score}
          confidence={signals.news_raw.confidence}
          colorPositive="text-emerald-400"
          colorNegative="text-red-400"
        />
      </div>

      {/* Compact raw data */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-300 flex items-center gap-2">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          Raw Data
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800/30 rounded p-2 border border-slate-700/50">
            <div className="text-sky-400 font-semibold mb-1">Satellite</div>
            <div className="space-y-0.5 text-slate-400">
              <div>Activity: {signals.satellite_raw.activity_delta_pct.toFixed(0)}%</div>
              <div>Lights: {signals.satellite_raw.night_light_delta_pct.toFixed(0)}%</div>
              <div>Anomaly: {(signals.satellite_raw.anomaly_strength * 100).toFixed(0)}%</div>
            </div>
          </div>
          <div className="bg-slate-800/30 rounded p-2 border border-slate-700/50">
            <div className="text-violet-400 font-semibold mb-1">News</div>
            <div className="space-y-0.5 text-slate-400">
              <div>Hype: {signals.news_raw.hype_intensity.toFixed(0)}%</div>
              <div>Volume: {signals.news_raw.headline_volume}</div>
              <div>Diversity: {(signals.news_raw.source_diversity * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

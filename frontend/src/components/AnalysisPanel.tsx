"use client";

import type { Region, Signals } from "@/types";
import SignalMeter from "./SignalMeter";
import RiskSignals from "./RiskSignals";
import AgentInsights from "./AgentInsights";

interface Props {
  signals: Signals | null;
  region: Region | null;
  loading: boolean;
  error: string | null;
}

function DivergenceDisplay({ score }: { score: number }) {
  const intensity = score >= 60 ? "critical" : score >= 35 ? "elevated" : "normal";
  
  const config = {
    critical: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-400",
      label: "CRITICAL DIVERGENCE",
      glow: "shadow-[0_0_30px_rgba(239,68,68,0.15)]",
    },
    elevated: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      label: "ELEVATED DIVERGENCE",
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.1)]",
    },
    normal: {
      bg: "bg-slate-800/50",
      border: "border-slate-700",
      text: "text-emerald-400",
      label: "SIGNALS ALIGNED",
      glow: "",
    },
  }[intensity];

  return (
    <div className={`rounded-lg p-4 ${config.bg} border ${config.border} ${config.glow}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
          Divergence Index
        </span>
        <span className={`text-[10px] uppercase tracking-wider font-semibold ${config.text}`}>
          {config.label}
        </span>
      </div>
      <div className="mt-2 flex items-end gap-3">
        <span className={`text-4xl font-bold tabular-nums ${config.text}`}>
          {score.toFixed(0)}
        </span>
        <span className="text-slate-500 text-sm mb-1">/ 100</span>
      </div>
      <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            intensity === "critical"
              ? "bg-gradient-to-r from-red-600 to-red-400"
              : intensity === "elevated"
              ? "bg-gradient-to-r from-amber-600 to-amber-400"
              : "bg-gradient-to-r from-emerald-600 to-emerald-400"
          }`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}

function DataSourceBadge({ mode }: { mode: string }) {
  const config = {
    LIVE: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "LIVE DATA" },
    PARTIAL: { bg: "bg-amber-500/20", text: "text-amber-400", label: "PARTIAL DATA" },
  }[mode] || { bg: "bg-emerald-500/20", text: "text-emerald-400", label: mode };

  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded ${config.bg} ${config.text} font-medium uppercase tracking-wider`}>
      {config.label}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-800 rounded w-1/2" />
        <div className="h-24 bg-slate-800/50 rounded-lg" />
        <div className="h-16 bg-slate-800/50 rounded-lg" />
        <div className="h-16 bg-slate-800/50 rounded-lg" />
      </div>
      <div className="text-center text-slate-500 text-xs mt-4">
        Fetching live data...
      </div>
    </div>
  );
}

export default function AnalysisPanel({ signals, region, loading, error }: Props) {
  if (loading && !signals) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-red-400 text-sm font-medium">Connection Error</div>
          <div className="text-slate-500 text-xs mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (!signals || !region) {
    return <LoadingState />;
  }

  const timestamp = new Date(signals.timestamp).toLocaleString();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/80">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{region.name}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{region.description}</p>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <DataSourceBadge mode={signals.data_mode} />
            <div className="text-[10px] text-slate-500 tabular-nums">
              {timestamp}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Divergence - Hero metric */}
          <DivergenceDisplay score={signals.divergence_score} />

          {/* Reality Check - Signal comparison */}
          <div className="space-y-3">
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
              Reality Check
            </h3>
            
            <SignalMeter
              label="Physical Activity"
              sublabel={`${signals.satellite_raw.data_source} • ${signals.satellite_raw.baseline_window_days}d baseline`}
              value={signals.satellite_score}
              confidence={signals.satellite_raw.confidence}
              color="blue"
              delta={signals.satellite_raw.activity_delta_pct}
            />
            
            <SignalMeter
              label="Market Narrative"
              sublabel={`${signals.news_raw.headline_volume} headlines analyzed`}
              value={signals.news_score}
              confidence={signals.news_raw.confidence}
              color="amber"
              hype={signals.news_raw.hype_intensity}
            />
          </div>

          {/* Headlines Preview */}
          {signals.news_raw.top_headlines.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                Top Headlines
              </h3>
              <div className="space-y-1.5">
                {signals.news_raw.top_headlines.slice(0, 3).map((h, i) => (
                  <div key={i} className="bg-slate-800/20 rounded p-2 border border-slate-800/50">
                    <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                      {h.title}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-slate-500">{h.source}</span>
                      <span className={`text-[10px] tabular-nums ${
                        h.sentiment > 0.1 ? "text-emerald-400" : 
                        h.sentiment < -0.1 ? "text-red-400" : "text-slate-400"
                      }`}>
                        {h.sentiment >= 0 ? "+" : ""}{h.sentiment.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Signals */}
          <RiskSignals alerts={signals.alerts} />

          {/* Agent Insights */}
          <AgentInsights explanation={signals.explanation} />
        </div>
      </div>
    </div>
  );
}

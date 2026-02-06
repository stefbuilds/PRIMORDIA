"use client";

import type { Alert } from "@/types";

interface Props {
  alerts: Alert[];
}

export default function RiskSignals({ alerts }: Props) {
  // Always show something - never empty
  const displayAlerts = alerts.length > 0 ? alerts : [{
    level: "info" as const,
    title: "All Systems Normal",
    message: "No divergence anomalies detected. Physical activity and market narrative are aligned within expected parameters.",
    category: "system"
  }];

  // Sort by severity
  const sorted = [...displayAlerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2, ok: 3 };
    return (order[a.level] ?? 2) - (order[b.level] ?? 2);
  });

  const criticalCount = alerts.filter(a => a.level === 'critical').length;
  const warningCount = alerts.filter(a => a.level === 'warning').length;

  const levelConfig = {
    critical: {
      dot: "bg-red-500",
      text: "text-red-300",
      bg: "bg-red-500/5",
      border: "border-red-500/20",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    warning: {
      dot: "bg-amber-500",
      text: "text-amber-300",
      bg: "bg-amber-500/5",
      border: "border-amber-500/20",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
    info: {
      dot: "bg-slate-500",
      text: "text-slate-300",
      bg: "bg-slate-800/30",
      border: "border-slate-700/50",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      ),
    },
    ok: {
      dot: "bg-emerald-500",
      text: "text-emerald-300",
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/20",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
          Risk Signals
        </h3>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded font-medium">
              {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-medium">
              {warningCount} Warning
            </span>
          )}
          {criticalCount === 0 && warningCount === 0 && (
            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-medium">
              All Clear
            </span>
          )}
        </div>
      </div>
      
      <div className="space-y-1.5">
        {sorted.map((alert, i) => {
          const config = levelConfig[alert.level] || levelConfig.info;
          return (
            <div
              key={i}
              className={`rounded-lg p-2.5 ${config.bg} border ${config.border}`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex-shrink-0">
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`text-xs font-medium ${config.text}`}>
                      {alert.title || alert.message.slice(0, 40)}
                    </div>
                    {alert.category && (
                      <span className="text-[9px] px-1 py-0.5 bg-slate-800 text-slate-500 rounded uppercase">
                        {alert.category}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {alert.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

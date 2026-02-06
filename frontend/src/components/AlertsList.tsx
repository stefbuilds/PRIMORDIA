"use client";

import type { Alert } from "@/types";

interface Props {
  alerts: Alert[];
}

const levelConfig = {
  critical: {
    bg: "bg-red-500/15",
    border: "border-red-500/50",
    text: "text-red-300",
    icon: "🔴",
    badge: "bg-red-500/30 text-red-200",
  },
  warning: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/50",
    text: "text-amber-300",
    icon: "🟡",
    badge: "bg-amber-500/30 text-amber-200",
  },
  info: {
    bg: "bg-slate-500/15",
    border: "border-slate-500/50",
    text: "text-slate-300",
    icon: "🔵",
    badge: "bg-slate-500/30 text-slate-200",
  },
  ok: {
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/50",
    text: "text-emerald-300",
    icon: "🟢",
    badge: "bg-emerald-500/30 text-emerald-200",
  },
};

export default function AlertsList({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="text-slate-500 text-sm text-center py-4">
        No alerts for this region
      </div>
    );
  }

  // Sort by severity
  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2, ok: 3 };
    return order[a.level] - order[b.level];
  });

  return (
    <div className="space-y-2">
      {sortedAlerts.map((alert, idx) => {
        const config = levelConfig[alert.level];
        return (
          <div
            key={idx}
            className={`rounded-lg p-3 ${config.bg} border ${config.border}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-sm flex-shrink-0">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-semibold text-sm ${config.text}`}>
                    {alert.title}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded uppercase font-medium ${config.badge}`}
                  >
                    {alert.level}
                  </span>
                </div>
                <p className={`text-sm ${config.text} opacity-90`}>
                  {alert.message}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

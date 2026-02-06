"use client";

import { useMemo } from "react";
import type { DaySnapshot, RegimeInfo } from "@/types";

interface Props {
  days: DaySnapshot[];
  regimes: RegimeInfo[];
  selectedDate: string;
}

export default function SignalChart({ days, regimes, selectedDate }: Props) {
  const chartData = useMemo(() => {
    if (days.length === 0) return null;

    const width = 100;
    const height = 50;
    const padding = { top: 5, bottom: 5, left: 0, right: 0 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Scale functions
    const xScale = (i: number) =>
      padding.left + (i / (days.length - 1)) * chartWidth;
    const yScale = (v: number) =>
      padding.top + ((1 - v) / 2) * chartHeight; // Map [-1, 1] to [height, 0]

    // Generate paths
    const satPath = days
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.satellite_score)}`)
      .join(" ");
    const newsPath = days
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.news_score)}`)
      .join(" ");

    // Find regime regions
    const regimeRects = regimes.map((r) => {
      const startIdx = days.findIndex((d) => d.date >= r.start_date);
      const endIdx = days.findIndex((d) => d.date > r.end_date);
      const actualEnd = endIdx === -1 ? days.length - 1 : endIdx - 1;
      
      if (startIdx === -1) return null;
      
      return {
        x: xScale(startIdx),
        width: xScale(actualEnd) - xScale(startIdx),
        type: r.type,
      };
    }).filter(Boolean);

    // Selected date marker
    const selectedIdx = days.findIndex((d) => d.date === selectedDate);
    const selectedX = selectedIdx >= 0 ? xScale(selectedIdx) : null;

    return {
      width,
      height,
      padding,
      satPath,
      newsPath,
      regimeRects,
      selectedX,
      yScale,
    };
  }, [days, regimes, selectedDate]);

  if (!chartData) {
    return (
      <div className="h-32 bg-slate-800/30 rounded-lg flex items-center justify-center text-slate-500 text-sm">
        No time series data
      </div>
    );
  }

  const regimeColors: Record<string, string> = {
    HYPE_PUMP: "rgba(239, 68, 68, 0.15)",
    SUPPLY_SHOCK: "rgba(249, 115, 22, 0.15)",
    PANIC_SELL: "rgba(168, 85, 247, 0.15)",
    REAL_GROWTH: "rgba(34, 197, 94, 0.15)",
    MEAN_REVERSION: "rgba(59, 130, 246, 0.15)",
  };

  return (
    <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          30-Day Signal History
        </h4>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-sky-400 rounded" />
            <span className="text-slate-400">Satellite</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-violet-400 rounded" />
            <span className="text-slate-400">News</span>
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${chartData.width} ${chartData.height}`}
        className="w-full h-32"
        preserveAspectRatio="none"
      >
        {/* Regime backgrounds */}
        {chartData.regimeRects.map((rect, i) => (
          rect && (
            <rect
              key={i}
              x={rect.x}
              y={0}
              width={rect.width}
              height={chartData.height}
              fill={regimeColors[rect.type] || "rgba(100,100,100,0.1)"}
            />
          )
        ))}

        {/* Zero line */}
        <line
          x1={chartData.padding.left}
          y1={chartData.yScale(0)}
          x2={chartData.width - chartData.padding.right}
          y2={chartData.yScale(0)}
          stroke="rgba(100, 116, 139, 0.3)"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />

        {/* +0.5 and -0.5 reference lines */}
        <line
          x1={chartData.padding.left}
          y1={chartData.yScale(0.5)}
          x2={chartData.width - chartData.padding.right}
          y2={chartData.yScale(0.5)}
          stroke="rgba(100, 116, 139, 0.15)"
          strokeWidth="0.3"
        />
        <line
          x1={chartData.padding.left}
          y1={chartData.yScale(-0.5)}
          x2={chartData.width - chartData.padding.right}
          y2={chartData.yScale(-0.5)}
          stroke="rgba(100, 116, 139, 0.15)"
          strokeWidth="0.3"
        />

        {/* Satellite line */}
        <path
          d={chartData.satPath}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* News line */}
        <path
          d={chartData.newsPath}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Selected date marker */}
        {chartData.selectedX !== null && (
          <line
            x1={chartData.selectedX}
            y1={0}
            x2={chartData.selectedX}
            y2={chartData.height}
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="0.5"
            strokeDasharray="1 1"
          />
        )}
      </svg>

      {/* Date labels */}
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{days[0]?.date.slice(5)}</span>
        <span>{days[days.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import type { DaySnapshot } from "@/types";

interface Props {
  days: DaySnapshot[];
  selectedDate: string;
}

export default function DivergenceChart({ days, selectedDate }: Props) {
  const chartData = useMemo(() => {
    if (days.length === 0) return null;

    const width = 100;
    const height = 30;
    const padding = { top: 2, bottom: 2, left: 0, right: 0 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const xScale = (i: number) =>
      padding.left + (i / (days.length - 1)) * chartWidth;
    const yScale = (v: number) =>
      padding.top + (1 - v / 100) * chartHeight; // Map [0, 100] to [height, 0]

    // Generate area path
    const areaPath =
      `M ${xScale(0)} ${height} ` +
      days.map((d, i) => `L ${xScale(i)} ${yScale(d.divergence_score)}`).join(" ") +
      ` L ${xScale(days.length - 1)} ${height} Z`;

    const linePath = days
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.divergence_score)}`)
      .join(" ");

    const selectedIdx = days.findIndex((d) => d.date === selectedDate);
    const selectedX = selectedIdx >= 0 ? xScale(selectedIdx) : null;

    return { width, height, areaPath, linePath, selectedX, yScale };
  }, [days, selectedDate]);

  if (!chartData) return null;

  return (
    <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Divergence Trend
      </h4>

      <svg
        viewBox={`0 0 ${chartData.width} ${chartData.height}`}
        className="w-full h-16"
        preserveAspectRatio="none"
      >
        {/* Threshold zones */}
        <rect
          x={0}
          y={chartData.yScale(100)}
          width={chartData.width}
          height={chartData.yScale(70) - chartData.yScale(100)}
          fill="rgba(239, 68, 68, 0.1)"
        />
        <rect
          x={0}
          y={chartData.yScale(70)}
          width={chartData.width}
          height={chartData.yScale(45) - chartData.yScale(70)}
          fill="rgba(251, 191, 36, 0.08)"
        />

        {/* Threshold lines */}
        <line
          x1={0}
          y1={chartData.yScale(70)}
          x2={chartData.width}
          y2={chartData.yScale(70)}
          stroke="rgba(239, 68, 68, 0.3)"
          strokeWidth="0.3"
          strokeDasharray="2 2"
        />
        <line
          x1={0}
          y1={chartData.yScale(45)}
          x2={chartData.width}
          y2={chartData.yScale(45)}
          stroke="rgba(251, 191, 36, 0.3)"
          strokeWidth="0.3"
          strokeDasharray="2 2"
        />

        {/* Area fill */}
        <path d={chartData.areaPath} fill="rgba(251, 146, 60, 0.2)" />

        {/* Line */}
        <path
          d={chartData.linePath}
          fill="none"
          stroke="#fb923c"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Selected marker */}
        {chartData.selectedX !== null && (
          <line
            x1={chartData.selectedX}
            y1={0}
            x2={chartData.selectedX}
            y2={chartData.height}
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="0.5"
          />
        )}
      </svg>

      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>0</span>
        <span className="text-amber-500/70">45</span>
        <span className="text-red-500/70">70</span>
        <span>100</span>
      </div>
    </div>
  );
}

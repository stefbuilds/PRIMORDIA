"use client";

interface Props {
  label: string;
  sublabel: string;
  value: number;
  confidence: number;
  color: "blue" | "amber";
  hype?: number;
  delta?: number;
}

export default function SignalMeter({ label, sublabel, value, confidence, color, hype, delta }: Props) {
  const isPositive = value >= 0;
  const magnitude = Math.abs(value);
  const percent = ((value + 1) / 2) * 100;
  
  const colorConfig = {
    blue: {
      positive: "bg-sky-500",
      negative: "bg-sky-500",
      text: "text-sky-400",
    },
    amber: {
      positive: "bg-amber-500",
      negative: "bg-amber-500",
      text: "text-amber-400",
    },
  }[color];

  const directionLabel = isPositive
    ? magnitude > 0.3 ? "Bullish" : magnitude > 0.1 ? "Slightly Bullish" : "Neutral"
    : magnitude > 0.3 ? "Bearish" : magnitude > 0.1 ? "Slightly Bearish" : "Neutral";

  return (
    <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-800">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs font-medium text-slate-200">{label}</div>
          <div className="text-[10px] text-slate-500">{sublabel}</div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-semibold tabular-nums ${colorConfig.text}`}>
            {value >= 0 ? "+" : ""}{value.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">
            {directionLabel}
          </div>
        </div>
      </div>

      {/* Signal bar */}
      <div className="relative h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600 z-10" />
        <div
          className={`absolute top-0 bottom-0 ${colorConfig.positive} transition-all duration-300`}
          style={{
            left: isPositive ? "50%" : `${percent}%`,
            width: isPositive ? `${percent - 50}%` : `${50 - percent}%`,
            opacity: 0.4 + confidence * 0.6,
          }}
        />
      </div>

      {/* Metadata row */}
      <div className="flex items-center justify-between mt-2 text-[10px]">
        <span className="text-slate-500">
          Confidence: <span className="text-slate-400">{(confidence * 100).toFixed(0)}%</span>
        </span>
        {delta !== undefined && (
          <span className="text-slate-500">
            Δ: <span className={delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-slate-400"}>
              {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
            </span>
          </span>
        )}
        {hype !== undefined && (
          <span className={hype >= 60 ? "text-amber-400" : "text-slate-500"}>
            {hype >= 60 ? "⚠ " : ""}Hype: <span className={hype >= 60 ? "text-amber-300" : "text-slate-400"}>{hype.toFixed(0)}%</span>
          </span>
        )}
      </div>
    </div>
  );
}

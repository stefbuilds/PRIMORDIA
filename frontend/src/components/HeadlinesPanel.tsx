"use client";

import type { Headline } from "@/types";

interface Props {
  headlines: Headline[];
}

function SentimentBadge({ sentiment }: { sentiment: number }) {
  const color =
    sentiment > 0.3
      ? "bg-emerald-500/20 text-emerald-300"
      : sentiment < -0.3
      ? "bg-red-500/20 text-red-300"
      : "bg-slate-500/20 text-slate-300";

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${color}`}>
      {sentiment >= 0 ? "+" : ""}
      {sentiment.toFixed(2)}
    </span>
  );
}

export default function HeadlinesPanel({ headlines }: Props) {
  if (headlines.length === 0) {
    return (
      <div className="text-slate-500 text-sm text-center py-4">
        No headlines available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {headlines.map((h, i) => (
        <div
          key={i}
          className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-slate-200 leading-snug flex-1">
              {h.title}
            </p>
            <SentimentBadge sentiment={h.sentiment} />
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span className="font-medium">{h.source}</span>
            <span>•</span>
            <span>{h.date}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

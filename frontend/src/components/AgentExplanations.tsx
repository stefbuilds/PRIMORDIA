"use client";

import type { Explanation } from "@/types";

interface Props {
  explanation: Explanation | null;
}

function AgentCard({
  icon,
  title,
  color,
  text,
}: {
  icon: string;
  title: string;
  color: string;
  text: string;
}) {
  return (
    <div className={`bg-slate-800/40 rounded-lg border ${color} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <span className={`font-semibold text-sm ${color.replace("border-", "text-").replace("/50", "")}`}>
          {title}
        </span>
      </div>
      <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

export default function AgentExplanations({ explanation }: Props) {
  if (!explanation) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Agent Analysis
      </h3>

      {/* Synthesis (most important) */}
      <div className="bg-gradient-to-r from-slate-800/80 to-slate-800/40 rounded-lg border border-slate-600 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">⚖️</span>
          <span className="font-semibold text-sm text-slate-200">Synthesis</span>
        </div>
        <p className="text-slate-200 text-sm leading-relaxed font-medium">
          {explanation.synthesis}
        </p>
      </div>

      {/* Individual agent views */}
      <div className="grid gap-3">
        <AgentCard
          icon="🛰️"
          title="Satellite Agent"
          color="border-sky-500/50"
          text={explanation.sat_agent}
        />
        <AgentCard
          icon="📰"
          title="News Agent"
          color="border-violet-500/50"
          text={explanation.news_agent}
        />
      </div>
    </div>
  );
}

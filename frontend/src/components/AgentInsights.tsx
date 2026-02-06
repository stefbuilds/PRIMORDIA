"use client";

import type { Explanation } from "@/types";

interface Props {
  explanation: Explanation;
}

export default function AgentInsights({ explanation }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
        Analysis Summary
      </h3>

      {/* Synthesis - Primary insight */}
      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
        <p className="text-xs text-slate-200 leading-relaxed">
          {explanation.synthesis}
        </p>
      </div>

      {/* Agent breakdown - Collapsible detail */}
      <details className="group">
        <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-400 flex items-center gap-1.5 py-1">
          <span className="group-open:rotate-90 transition-transform text-[10px]">▶</span>
          Detailed breakdown by signal type
        </summary>
        
        <div className="mt-2 space-y-2">
          {/* Physical Signal Explanation */}
          <div className="bg-slate-800/20 rounded p-2.5 border border-slate-800/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
                <path d="M13 5l2 2M3 21l9-9M9.5 14.5L11 13M6 18l3-3" />
                <circle cx="17" cy="7" r="4" />
              </svg>
              <div className="text-[10px] text-sky-400/80 font-medium">
                Physical Signal Analysis
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mb-1.5 leading-relaxed">
              Based on satellite imagery: night lights, industrial activity, shipping traffic, and infrastructure patterns
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {explanation.sat_agent}
            </p>
          </div>
          
          {/* Narrative Signal Explanation */}
          <div className="bg-slate-800/20 rounded p-2.5 border border-slate-800/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                <path d="M18 14h-8M18 18h-8M18 10h-8M18 6h-8" />
              </svg>
              <div className="text-[10px] text-amber-400/80 font-medium">
                Narrative Signal Analysis
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mb-1.5 leading-relaxed">
              Based on news sentiment: headlines, media coverage intensity, hype levels, and market narrative trends
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {explanation.news_agent}
            </p>
          </div>

          {/* Market Signal if available */}
          {explanation.market_agent && (
            <div className="bg-slate-800/20 rounded p-2.5 border border-slate-800/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                  <path d="M3 3v18h18" />
                  <path d="M18 9l-5 5-4-4-3 3" />
                </svg>
                <div className="text-[10px] text-emerald-400/80 font-medium">
                  Market Signal Analysis
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mb-1.5 leading-relaxed">
                Based on market data: price action, volume, ETF flows, and trading patterns
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {explanation.market_agent}
              </p>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

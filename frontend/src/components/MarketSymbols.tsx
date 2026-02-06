'use client';

import { useState } from 'react';
import { TradingViewMiniChart } from './TradingViewChart';

export interface MarketSymbol {
  ticker: string;
  name: string;
  type: 'primary' | 'secondary';
  description?: string;
}

interface MarketSymbolsProps {
  symbols: MarketSymbol[];
  regionName: string;
  onSelectSymbol?: (ticker: string) => void;
  selectedTicker?: string;
}

// Static mapping of all region tickers for reference
export const REGION_MARKET_SYMBOLS: Record<string, MarketSymbol[]> = {
  shanghai: [
    { ticker: 'FXI', name: 'China Large-Cap ETF', type: 'primary', description: 'iShares China Large-Cap ETF - tracks top 50 Chinese companies' },
    { ticker: 'KWEB', name: 'China Internet ETF', type: 'secondary', description: 'KraneShares CSI China Internet ETF - tracks Chinese internet sector' },
    { ticker: 'YINN', name: 'China Bull 3X', type: 'secondary', description: 'Direxion Daily FTSE China Bull 3X - leveraged China exposure' },
  ],
  shenzhen: [
    { ticker: 'MCHI', name: 'iShares China ETF', type: 'primary', description: 'iShares MSCI China ETF - broad China market exposure' },
    { ticker: 'CQQQ', name: 'China Tech ETF', type: 'secondary', description: 'Invesco China Technology ETF - Chinese technology companies' },
    { ticker: 'ASHR', name: 'A-Shares ETF', type: 'secondary', description: 'Xtrackers Harvest CSI 300 China A-Shares ETF' },
  ],
  suez: [
    { ticker: 'BDRY', name: 'Dry Bulk Shipping', type: 'primary', description: 'Breakwave Dry Bulk Shipping ETF - tracks dry bulk shipping rates' },
    { ticker: 'USO', name: 'US Oil Fund', type: 'secondary', description: 'United States Oil Fund - tracks WTI crude oil' },
    { ticker: 'BOAT', name: 'Shipping ETF', type: 'secondary', description: 'SonicShares Global Shipping ETF' },
    { ticker: 'GOGL', name: 'Golden Ocean', type: 'secondary', description: 'Golden Ocean Group - dry bulk shipping company' },
  ],
  la_port: [
    { ticker: 'IYT', name: 'Transportation ETF', type: 'primary', description: 'iShares U.S. Transportation ETF - US transport sector' },
    { ticker: 'XLI', name: 'Industrials ETF', type: 'secondary', description: 'Industrial Select Sector SPDR - US industrials' },
    { ticker: 'SBLK', name: 'Star Bulk Carriers', type: 'secondary', description: 'Star Bulk Carriers Corp - dry bulk shipping' },
    { ticker: 'ZIM', name: 'ZIM Shipping', type: 'secondary', description: 'ZIM Integrated Shipping Services' },
  ],
  rotterdam: [
    { ticker: 'EWN', name: 'Netherlands ETF', type: 'primary', description: 'iShares MSCI Netherlands ETF' },
    { ticker: 'UNG', name: 'Natural Gas Fund', type: 'secondary', description: 'United States Natural Gas Fund' },
    { ticker: 'TTF1!', name: 'EU Natural Gas', type: 'secondary', description: 'Dutch TTF Natural Gas Futures' },
    { ticker: 'EWG', name: 'Germany ETF', type: 'secondary', description: 'iShares MSCI Germany ETF' },
  ],
};

export function MarketSymbols({ symbols, regionName, onSelectSymbol, selectedTicker }: MarketSymbolsProps) {
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const handleSelectSymbol = (ticker: string) => {
    if (expandedChart === ticker) {
      setExpandedChart(null);
    } else {
      setExpandedChart(ticker);
    }
    onSelectSymbol?.(ticker);
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Market Symbols
        </h3>
        <span className="text-[10px] text-neutral-600">{regionName}</span>
      </div>

      <div className="space-y-2">
        {symbols.map((symbol) => (
          <div key={symbol.ticker}>
            <button
              onClick={() => handleSelectSymbol(symbol.ticker)}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                expandedChart === symbol.ticker
                  ? 'bg-neutral-800 border border-neutral-700'
                  : 'bg-neutral-900/50 hover:bg-neutral-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-8 rounded-full ${
                    symbol.type === 'primary' ? 'bg-white' : 'bg-neutral-600'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{symbol.ticker}</span>
                      {symbol.type === 'primary' && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-white/10 text-white rounded font-medium">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{symbol.name}</p>
                  </div>
                </div>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={`text-neutral-500 transition-transform ${
                    expandedChart === symbol.ticker ? 'rotate-180' : ''
                  }`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              {symbol.description && (
                <p className="text-[10px] text-neutral-600 mt-2 ml-5 leading-relaxed">
                  {symbol.description}
                </p>
              )}
            </button>

            {/* Expanded mini chart */}
            {expandedChart === symbol.ticker && (
              <div className="mt-2 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900/50">
                <TradingViewMiniChart symbol={symbol.ticker} theme="dark" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="mt-4 pt-3 border-t border-neutral-800">
        <p className="text-[10px] text-neutral-600 mb-2">View on TradingView:</p>
        <div className="flex flex-wrap gap-1.5">
          {symbols.slice(0, 4).map((s) => (
            <a
              key={s.ticker}
              href={`https://www.tradingview.com/symbols/${s.ticker}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-md transition-colors"
            >
              {s.ticker} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// Compact version for sidebar
export function MarketSymbolsCompact({ symbols, onSelectSymbol }: { 
  symbols: MarketSymbol[]; 
  onSelectSymbol?: (ticker: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {symbols.map((s) => (
        <button
          key={s.ticker}
          onClick={() => onSelectSymbol?.(s.ticker)}
          className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
            s.type === 'primary'
              ? 'bg-white/10 text-white hover:bg-white/20'
              : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white'
          }`}
        >
          {s.ticker}
        </button>
      ))}
    </div>
  );
}

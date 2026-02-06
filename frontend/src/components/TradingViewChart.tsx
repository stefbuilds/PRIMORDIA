'use client';

import { useEffect, useRef, memo } from 'react';

interface TradingViewChartProps {
  symbol: string;
  theme?: 'dark' | 'light';
  height?: number;
  autosize?: boolean;
}

function TradingViewChartComponent({ 
  symbol, 
  theme = 'dark',
  height = 400,
  autosize = true 
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = '';

    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = autosize ? '100%' : `${height}px`;
    widgetContainer.style.width = '100%';
    containerRef.current.appendChild(widgetContainer);

    // Create and load TradingView script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: autosize,
      height: autosize ? '100%' : height,
      symbol: symbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'en',
      backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0)' : 'rgba(255, 255, 255, 1)',
      gridColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    });

    containerRef.current.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, theme, height, autosize]);

  return (
    <div 
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: autosize ? '100%' : height, width: '100%' }}
    />
  );
}

export const TradingViewChart = memo(TradingViewChartComponent);

// Mini chart for sidebar
interface MiniChartProps {
  symbol: string;
  theme?: 'dark' | 'light';
}

function TradingViewMiniChartComponent({ symbol, theme = 'dark' }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    containerRef.current.appendChild(widgetContainer);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol,
      width: '100%',
      height: '100%',
      locale: 'en',
      dateRange: '1M',
      colorTheme: theme,
      isTransparent: true,
      autosize: true,
      largeChartUrl: '',
      noTimeScale: false,
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, theme]);

  return (
    <div 
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: '180px', width: '100%' }}
    />
  );
}

export const TradingViewMiniChart = memo(TradingViewMiniChartComponent);

// Ticker tape (horizontal scrolling prices)
interface TickerTapeProps {
  symbols: Array<{ proName: string; title: string }>;
  theme?: 'dark' | 'light';
}

function TradingViewTickerTapeComponent({ symbols, theme = 'dark' }: TickerTapeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: symbols,
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: theme,
      locale: 'en',
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbols, theme]);

  return (
    <div 
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: '46px', width: '100%' }}
    />
  );
}

export const TradingViewTickerTape = memo(TradingViewTickerTapeComponent);

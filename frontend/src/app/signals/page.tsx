'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Region, SignalsResponse, Headline, MarketSymbol } from '@/types';
import ChatBox from '@/components/ChatBox';
import { MarketSymbols, REGION_MARKET_SYMBOLS } from '@/components/MarketSymbols';
import { TradingViewChart, TradingViewTickerTape } from '@/components/TradingViewChart';
import { 
  EntryMotion, 
  MotionHeader, 
  MotionTicker, 
  MotionMap, 
  MotionPanel,
  useEntryMotion 
} from '@/components/EntryMotion';
import { CountUp } from '@/components/CountUp';
import { motion, AnimatePresence } from 'framer-motion';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function SignalsPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [signals, setSignals] = useState<SignalsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewsPopup, setShowNewsPopup] = useState(false);
  const [selectedHeadline, setSelectedHeadline] = useState<Headline | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string>('FXI');
  const [marketSymbols, setMarketSymbols] = useState<MarketSymbol[]>([]);
  const [showChartPanel, setShowChartPanel] = useState(true); // Built-in chart viewer
  const [showMapPanel, setShowMapPanel] = useState(true); // Map visibility
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'globe'>('satellite');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [hasBetaAccess, setHasBetaAccess] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  // Check beta access
  useEffect(() => {
    const access = localStorage.getItem('primordia-beta-access');
    if (access === 'granted') {
      setHasBetaAccess(true);
    }
  }, []);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('primordia-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('primordia-theme', newTheme);
  };


  // Close settings dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    if (settingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen]);

  useEffect(() => {
    fetch(`${API_URL}/regions`)
      .then((r) => r.json())
      .then((data) => {
        setRegions(data.regions);
        if (data.regions.length > 0) setSelectedRegion(data.regions[0]);
      })
      .catch(console.error);
  }, []);

  const loadSignals = useCallback(async (region: Region) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/signals?region_id=${region.id}`);
      const data = await res.json();
      setSignals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRegion) loadSignals(selectedRegion);
  }, [selectedRegion, loadSignals]);

  // Update market symbols when region changes
  useEffect(() => {
    if (selectedRegion) {
      const symbols = REGION_MARKET_SYMBOLS[selectedRegion.id] || [];
      setMarketSymbols(symbols);
      // Set default ticker to primary
      const primary = symbols.find(s => s.type === 'primary');
      if (primary) setSelectedTicker(primary.ticker);
    }
  }, [selectedRegion]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedRegion) loadSignals(selectedRegion);
    }, 120000);
    return () => clearInterval(interval);
  }, [selectedRegion, loadSignals]);

  // Build ticker tape symbols from all regions
  const tickerTapeSymbols = [
    { proName: 'FXI', title: 'China' },
    { proName: 'BDRY', title: 'Shipping' },
    { proName: 'IYT', title: 'Transport' },
    { proName: 'USO', title: 'Oil' },
    { proName: 'UNG', title: 'NatGas' },
    { proName: 'SPY', title: 'S&P 500' },
  ];

  // Show waitlist if no beta access
  if (!hasBetaAccess) {
    return (
      <WaitlistModal onAccess={() => {
        localStorage.setItem('primordia-beta-access', 'granted');
        setHasBetaAccess(true);
      }} />
    );
  }

  return (
    <EntryMotion>
    <div className={`${theme} h-screen w-full flex flex-col overflow-hidden`} style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Navbar */}
      <MotionHeader className="h-14 border-b backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0" style={{ borderColor: 'var(--border)', background: theme === 'dark' ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.95)' }}>
        {/* Left: Logo + Nav Links */}
        <div className="flex items-center gap-8">
          {/* Primordia Text Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <span 
                className="text-[22px] font-bold"
                style={{ 
                  fontFamily: "var(--font-wide)",
                  letterSpacing: '0.04em',
                  color: 'var(--text-primary)'
                }}
              >
                PRIMORDIA
              </span>
            </div>
            <div className="h-5 w-px hidden sm:block" style={{ background: 'var(--border)' }} />
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] hidden sm:inline" style={{ color: 'var(--text-tertiary)' }}>
              Ground Truth Intelligence
            </span>
          </div>
          
          {/* Nav Links - Sidebar Sections */}
          <div className="flex items-center gap-1" style={{ fontFamily: 'var(--font-tech)' }}>
            <button 
              onClick={() => document.getElementById('section-divergence')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-md transition-colors"
            >
              Divergence
            </button>
            <button 
              onClick={() => document.getElementById('section-satellite')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-md transition-colors"
            >
              Satellite
            </button>
            <button 
              onClick={() => document.getElementById('section-signals')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-md transition-colors"
            >
              Signals
            </button>
            <button 
              onClick={() => document.getElementById('section-risk')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-md transition-colors"
            >
              Risk
            </button>
            <button 
              onClick={() => document.getElementById('section-headlines')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-md transition-colors"
            >
              Headlines
            </button>
            <button 
              onClick={() => document.getElementById('section-analysis')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-md transition-colors"
            >
              Analysis
            </button>
          </div>
        </div>
        
        {/* Right: Controls + Status */}
        <div className="flex items-center gap-3">
          {/* View Toggles */}
          <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-1">
            <button
              onClick={() => setShowMapPanel(!showMapPanel)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                showMapPanel 
                  ? 'bg-neutral-700 text-white' 
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Toggle Map"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
              </svg>
              Map
            </button>
            <button
              onClick={() => setShowChartPanel(!showChartPanel)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                showChartPanel 
                  ? 'bg-neutral-700 text-white' 
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Toggle Chart"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="M18 9l-5 5-4-4-3 3" />
              </svg>
              Chart
            </button>
          </div>
          
          {/* Status Badge */}
          {signals?.data_mode && <StatusBadge mode={signals.data_mode} />}
          
          {/* Settings Button */}
          <div className="relative" ref={settingsRef}>
            <button 
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
            >
              <motion.svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                animate={{ rotate: settingsOpen ? 90 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </motion.svg>
            </button>
            
            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-48 border rounded-xl shadow-xl overflow-hidden z-50"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                >
                  <div className="p-1">
                    {/* Theme Toggle */}
                    <button
                      onClick={() => {
                        toggleTheme();
                        setSettingsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-elevated)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      {theme === 'dark' ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="5" />
                            <line x1="12" y1="1" x2="12" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="23" />
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                            <line x1="1" y1="12" x2="3" y2="12" />
                            <line x1="21" y1="12" x2="23" y2="12" />
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                          </svg>
                          Light Mode
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                          </svg>
                          Dark Mode
                        </>
                      )}
                    </button>
                    
                    {/* Divider */}
                    <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />
                    
                    {/* Map Style Toggle */}
                    <button
                      onClick={() => {
                        setMapStyle(mapStyle === 'satellite' ? 'globe' : 'satellite');
                        setSettingsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-elevated)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      {mapStyle === 'satellite' ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                          </svg>
                          Switch to Globe
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 5l2 2M3 21l9-9M9.5 14.5L11 13M6 18l3-3" />
                            <circle cx="17" cy="7" r="4" />
                          </svg>
                          Switch to Satellite
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </MotionHeader>
      
      {/* Ticker Tape */}
      <MotionTicker className="h-[46px] border-b flex-shrink-0 overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <TradingViewTickerTape symbols={tickerTapeSymbols} theme={theme} />
      </MotionTicker>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Map + Chart */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Map Section */}
          <MotionMap 
            className={`relative transition-all duration-300 overflow-hidden ${
              !showMapPanel ? 'h-10' : showChartPanel ? 'flex-1' : 'flex-1'
            }`} 
            style={{ minHeight: showMapPanel ? (showChartPanel ? '50%' : '100%') : '40px', background: 'var(--bg-secondary)' }}
          >
            {/* Map Toggle Bar */}
            <button
              onClick={() => setShowMapPanel(!showMapPanel)}
              className="absolute top-0 left-0 right-0 h-10 z-20 flex items-center justify-between px-4 bg-gradient-to-b from-black/80 to-transparent hover:from-black/90 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span className="text-xs font-medium text-neutral-300">Map</span>
              </div>
              <svg 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className={`text-neutral-500 transition-transform duration-300 ${showMapPanel ? '' : 'rotate-180'}`}
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            
            {showMapPanel && (
              <>
                <Map selectedRegion={selectedRegion} onRegionSelect={setSelectedRegion} regions={regions} mapStyle={mapStyle} />
                
                {/* Region Selector */}
                <div className="absolute top-14 left-4 z-10">
                  <select
                    value={selectedRegion?.id || ''}
                    onChange={(e) => {
                      const r = regions.find((r) => r.id === e.target.value);
                      if (r) setSelectedRegion(r);
                    }}
                    className="glass rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer pr-8"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px' }}
                  >
                    {regions.map((r) => (
                      <option key={r.id} value={r.id} className="bg-neutral-900">{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Loading */}
                {loading && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="glass rounded-2xl px-6 py-4 flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-sm font-medium">Analyzing...</span>
                    </div>
                  </div>
                )}

                {/* Primordia Watermark */}
                <div className="absolute bottom-3 right-3 z-10 pointer-events-none select-none">
                  <span 
                    className="text-sm font-bold text-white/25 uppercase tracking-wider"
                    style={{ fontFamily: 'var(--font-wide)' }}
                  >
                    PRIMORDIA™
                  </span>
                </div>
              </>
            )}
          </MotionMap>

          {/* Built-in Chart Viewer */}
          <ChartPanel
            isOpen={showChartPanel}
            onToggle={() => setShowChartPanel(!showChartPanel)}
            ticker={selectedTicker}
            symbols={marketSymbols}
            onSelectTicker={setSelectedTicker}
            onExpand={() => setShowChartModal(true)}
            theme={theme}
          />
        </div>

        {/* Analysis Panel */}
        <MotionPanel className="w-[440px] border-l overflow-y-auto flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          {signals && selectedRegion ? (
            <AnalysisPanel 
              signals={signals} 
              region={selectedRegion}
              onShowNews={() => setShowNewsPopup(true)}
              onSelectHeadline={(h) => { setSelectedHeadline(h); setShowNewsPopup(true); }}
              marketSymbols={marketSymbols}
              onOpenChart={(ticker) => { setSelectedTicker(ticker); setShowChartModal(true); }}
            />
          ) : (
            <div className="p-6 text-neutral-500 text-center text-sm">
              Initializing...
            </div>
          )}
        </MotionPanel>
      </div>

      {/* News Popup */}
      {showNewsPopup && signals && (
        <NewsPopup
          headlines={signals.news_raw.headlines}
          aiInsight={signals.ai_insight}
          selectedHeadline={selectedHeadline}
          onClose={() => { setShowNewsPopup(false); setSelectedHeadline(null); }}
        />
      )}

      {/* Chart Modal */}
      {showChartModal && (
        <ChartModal
          ticker={selectedTicker}
          symbols={marketSymbols}
          regionName={selectedRegion?.name || 'Global'}
          onSelectTicker={setSelectedTicker}
          onClose={() => setShowChartModal(false)}
          theme={theme}
        />
      )}

      {/* Chat Button - Sova */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-white text-neutral-900 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-105 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] active:scale-95 transition-all duration-200 flex items-center justify-center"
        >
          {/* Dart Icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 22L12 12M22 2L12 12M12 12L18.5 18.5M12 12L5.5 5.5M22 2L22 9M22 2L15 2" />
          </svg>
        </button>
      )}

      {/* Chat Box */}
      <ChatBox
        regionId={selectedRegion?.id || 'shanghai'}
        isOpen={showChat}
        onClose={() => setShowChat(false)}
      />

    </div>
    </EntryMotion>
  );
}

function StatusBadge({ mode }: { mode: string }) {
  const hasSat = mode.includes('SAT');
  const hasNews = mode.includes('NEWS');
  const hasMkt = mode.includes('MKT');
  const hasAI = mode.includes('AI');
  const isLive = hasSat || hasNews || hasMkt || hasAI;
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800">
      <span className={`status-dot ${isLive ? 'status-dot-live' : 'status-dot-partial'}`} />
      <span className="text-xs font-medium text-neutral-300">{mode}</span>
      {hasSat && (
        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-900/50 text-emerald-400 rounded font-semibold">
          VIIRS LIVE
        </span>
      )}
    </div>
  );
}

function AnalysisPanel({ signals, region, onShowNews, onSelectHeadline, marketSymbols, onOpenChart }: { 
  signals: SignalsResponse; 
  region: Region;
  onShowNews: () => void;
  onSelectHeadline: (h: Headline) => void;
  marketSymbols: MarketSymbol[];
  onOpenChart: (ticker: string) => void;
}) {
  const { isAnimating } = useEntryMotion();
  
  return (
    <div className="p-4 space-y-4">
      {/* Region Info */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">{region.name}</h2>
          <p className="text-xs text-neutral-500 mt-0.5">{region.description}</p>
        </div>
        <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-900 px-2 py-1 rounded-md uppercase tracking-wider">
          {region.category}
        </span>
      </div>

      {/* Divergence Score */}
      <div id="section-divergence">
        <DivergenceCard score={signals.divergence_score} />
      </div>

      {/* Satellite Intelligence Panel */}
      <div id="section-satellite">
        <SatellitePanel satellite={signals.satellite_raw} score={signals.satellite_score} region={region} topHeadline={signals.news_raw.headlines[0]} />
      </div>

      {/* Signal Grid - Physical vs Narrative */}
      <div id="section-signals" className="grid grid-cols-2 gap-3">
        <SignalCard
          label="Physical Signal"
          description="Satellite-observed economic activity (night lights, shipping, industrial)"
          value={signals.satellite_score}
          sublabel={signals.satellite_raw.data_source}
          trend={signals.satellite_raw.trend}
          icon="satellite"
        />
        <SignalCard
          label="Narrative Signal"
          description="Media sentiment & market hype from news headlines and reports"
          value={signals.news_score}
          sublabel={`${signals.news_raw.headline_volume} articles`}
          icon="news"
        />
      </div>

      {/* Top Headlines Preview */}
      {signals.news_raw.headlines.length > 0 && (
        <div id="section-headlines" className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Top Headlines</h3>
            <button 
              onClick={onShowNews}
              className="text-xs text-neutral-400 hover:text-white transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {signals.news_raw.headlines.slice(0, 3).map((h, i) => (
              <button
                key={i}
                onClick={() => onSelectHeadline(h)}
                className="w-full text-left p-3 rounded-xl bg-neutral-900/50 hover:bg-neutral-800/50 transition-colors group"
              >
                <div className="flex gap-3">
                  {/* Page Preview */}
                  <ArticlePreview url={h.url} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-200 line-clamp-2 leading-relaxed">{h.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-neutral-500">{h.source}</span>
                      <SentimentDot sentiment={h.sentiment} />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Market */}
      {signals.market_data && (
        <MarketCard data={signals.market_data} />
      )}

      {/* Market Symbols */}
      {marketSymbols.length > 0 && (
        <MarketSymbols
          symbols={marketSymbols}
          regionName={region.name}
          onSelectSymbol={(ticker) => onOpenChart(ticker)}
        />
      )}

      {/* AI Insight */}
      {signals.ai_insight && (
        <AIInsightCard insight={signals.ai_insight} />
      )}

      {/* Risk Signals */}
      <div id="section-risk" className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Risk Monitor</h3>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${
              signals.alerts.some(a => a.level === 'critical') ? 'bg-red-500 animate-pulse' :
              signals.alerts.some(a => a.level === 'warning') ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            <span className="text-[10px] text-neutral-500">
              {signals.alerts.filter(a => a.level === 'critical').length > 0 
                ? `${signals.alerts.filter(a => a.level === 'critical').length} Critical` 
                : signals.alerts.filter(a => a.level === 'warning').length > 0
                ? `${signals.alerts.filter(a => a.level === 'warning').length} Warning`
                : 'All Clear'}
            </span>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-neutral-900 rounded-lg p-2 text-center">
            <CountUp
              value={signals.alerts.length}
              decimals={0}
              shouldAnimate={isAnimating}
              durationMs={600}
              className="text-lg font-bold text-white tabular-nums"
            />
            <div className="text-[9px] text-neutral-500 uppercase">Signals</div>
          </div>
          <div className="bg-neutral-900 rounded-lg p-2 text-center">
            <CountUp
              value={signals.satellite_raw.anomaly_strength * 100}
              decimals={0}
              suffix="%"
              shouldAnimate={isAnimating}
              durationMs={650}
              className={`text-lg font-bold tabular-nums ${
                signals.satellite_raw.anomaly_strength > 0.5 ? 'text-amber-400' : 'text-neutral-400'
              }`}
            />
            <div className="text-[9px] text-neutral-500 uppercase">Anomaly</div>
          </div>
          <div className="bg-neutral-900 rounded-lg p-2 text-center">
            <CountUp
              value={signals.news_raw.hype_intensity * 100}
              decimals={0}
              suffix="%"
              shouldAnimate={isAnimating}
              durationMs={700}
              className={`text-lg font-bold tabular-nums ${
                signals.news_raw.hype_intensity > 0.6 ? 'text-red-400' : 'text-neutral-400'
              }`}
            />
            <div className="text-[9px] text-neutral-500 uppercase">Hype</div>
          </div>
        </div>
        
        <div className="space-y-2">
          {signals.alerts.length > 0 ? (
            signals.alerts.map((alert, i) => (
              <AlertItem key={i} alert={alert} />
            ))
          ) : (
            <div className="p-3 rounded-xl bg-emerald-900/10 border border-emerald-800/30">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="text-xs font-medium text-emerald-400">All Systems Normal</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1.5 ml-[22px]">
                No significant divergence or anomalies detected. Physical and narrative signals are within expected parameters.
              </p>
            </div>
          )}
        </div>
        
        {/* Satellite-specific alerts */}
        {signals.satellite_raw.anomaly_strength > 0.5 && (
          <div className="mt-3 p-3 rounded-xl bg-amber-900/20 border border-amber-800/50">
            <div className="flex items-center gap-2 mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
                <path d="M13 5l2 2M3 21l9-9M9.5 14.5L11 13M6 18l3-3" />
                <circle cx="17" cy="7" r="4" />
              </svg>
              <span className="text-xs font-semibold text-amber-400 uppercase">Satellite Anomaly Detected</span>
            </div>
            <p className="text-sm text-amber-200/80 leading-relaxed">
              {signals.satellite_raw.trend === 'expanding' 
                ? `Unusual increase in night light activity (+${(signals.satellite_raw.anomaly_strength * 100).toFixed(0)}% above baseline). This could indicate unexpected economic acceleration not yet reflected in market narrative.`
                : signals.satellite_raw.trend === 'contracting' 
                ? `Significant decrease in observed activity (${(signals.satellite_raw.anomaly_strength * 100).toFixed(0)}% deviation). Physical indicators suggest slowdown that may not be priced into markets.`
                : `Abnormal pattern detected with ${(signals.satellite_raw.anomaly_strength * 100).toFixed(0)}% deviation from baseline. Further monitoring recommended.`
              }
            </p>
          </div>
        )}
        
        {/* High Hype Warning */}
        {signals.news_raw.hype_intensity > 0.6 && (
          <div className="mt-3 p-3 rounded-xl bg-red-900/10 border border-red-800/30">
            <div className="flex items-center gap-2 mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                <path d="M18 14h-8M18 18h-8M18 10h-8M18 6h-8" />
              </svg>
              <span className="text-xs font-semibold text-red-400 uppercase">High Media Hype</span>
            </div>
            <p className="text-sm text-red-200/80 leading-relaxed">
              News hype intensity at {(signals.news_raw.hype_intensity * 100).toFixed(0)}%. Headlines may be exaggerating market conditions. 
              Cross-reference with physical signals before acting on narrative-driven momentum.
            </p>
          </div>
        )}
      </div>

      {/* Synthesis */}
      <div id="section-analysis" className="card p-4">
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Analysis</h3>
        <p className="text-sm text-neutral-300 leading-relaxed">{signals.explanation.synthesis}</p>
      </div>
    </div>
  );
}

function DivergenceCard({ score }: { score: number }) {
  const { isAnimating } = useEntryMotion();
  const severity = score > 70 ? 'critical' : score > 50 ? 'elevated' : score > 30 ? 'moderate' : 'low';
  const labels = { critical: 'CRITICAL', elevated: 'ELEVATED', moderate: 'MODERATE', low: 'ALIGNED' };
  const descriptions = {
    critical: 'Major gap between ground truth and market narrative',
    elevated: 'Notable discrepancy detected between signals',
    moderate: 'Some divergence present, monitoring recommended',
    low: 'Physical and narrative signals are in agreement'
  };
  
  // Generate fake historical data for mini chart (last 7 data points)
  const [chartData] = useState(() => {
    const base = score;
    return Array.from({ length: 7 }, (_, i) => {
      const variance = Math.sin(i * 0.8) * 15 + Math.random() * 10 - 5;
      return Math.max(0, Math.min(100, base + variance - (6 - i) * 2));
    });
  });
  
  // Generate SVG path for mini sparkline
  const sparklinePath = chartData.map((val, i) => {
    const x = (i / (chartData.length - 1)) * 100;
    const y = 100 - val;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  
  const areaPath = `${sparklinePath} L 100 100 L 0 100 Z`;
  
  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Divergence Index</span>
          <div className="group relative">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-600 cursor-help">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Measures the gap between satellite-observed physical activity and media-driven market narrative. Higher = bigger disconnect.
            </div>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
          severity === 'critical' ? 'bg-white text-black' :
          severity === 'elevated' ? 'bg-neutral-700 text-white' :
          'bg-neutral-800 text-neutral-400'
        }`}>
          {labels[severity]}
        </span>
      </div>
      
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <CountUp
              value={score}
              decimals={0}
              shouldAnimate={isAnimating}
              durationMs={800}
              className={`text-5xl font-bold tabular-nums ${
                severity === 'critical' ? 'text-white' : 'text-neutral-300'
              }`}
            />
            <span className="text-neutral-600 text-lg">/100</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1 max-w-[200px]">
            {descriptions[severity]}
          </p>
        </div>
        
        {/* Mini Chart */}
        <div className="w-24 h-12 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            {/* Threshold zones */}
            <rect x="0" y="0" width="100" height="30" fill="rgba(255,255,255,0.03)" />
            <rect x="0" y="30" width="100" height="20" fill="rgba(255,255,255,0.02)" />
            
            {/* Area fill */}
            <path 
              d={areaPath} 
              fill={severity === 'critical' ? 'rgba(255,255,255,0.1)' : severity === 'elevated' ? 'rgba(161,161,170,0.1)' : 'rgba(82,82,91,0.1)'}
            />
            
            {/* Line */}
            <path 
              d={sparklinePath} 
              fill="none" 
              stroke={severity === 'critical' ? '#fff' : severity === 'elevated' ? '#a1a1aa' : '#52525b'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Current point */}
            <circle 
              cx="100" 
              cy={100 - score} 
              r="3" 
              fill={severity === 'critical' ? '#fff' : severity === 'elevated' ? '#a1a1aa' : '#52525b'}
            />
          </svg>
          <span className="absolute bottom-0 right-0 text-[9px] text-neutral-600">7d</span>
        </div>
      </div>
      
      <div className="mt-4 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-700 rounded-full ${
            severity === 'critical' ? 'bg-white' :
            severity === 'elevated' ? 'bg-neutral-400' :
            'bg-neutral-600'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      
      {/* Scale labels */}
      <div className="flex justify-between mt-1.5 text-[9px] text-neutral-600">
        <span>Aligned</span>
        <span>Moderate</span>
        <span>Critical</span>
      </div>
    </div>
  );
}

function SignalCard({ label, description, value, sublabel, trend, icon }: {
  label: string;
  description?: string;
  value: number;
  sublabel: string;
  trend?: string;
  icon?: 'satellite' | 'news';
}) {
  const { isAnimating } = useEntryMotion();
  const percentage = ((value + 1) / 2) * 100;
  const isPositive = value > 0.05;
  const isNegative = value < -0.05;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {icon === 'satellite' && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
              <path d="M13 5l2 2M3 21l9-9M9.5 14.5L11 13M6 18l3-3" />
              <circle cx="17" cy="7" r="4" />
            </svg>
          )}
          {icon === 'news' && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
              <path d="M18 14h-8M18 18h-8M18 10h-8M18 6h-8" />
            </svg>
          )}
          <span className="text-xs text-neutral-500 font-medium">{label}</span>
        </div>
        {trend && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            trend === 'expanding' ? 'bg-emerald-900/30 text-emerald-400' : 
            trend === 'contracting' ? 'bg-red-900/30 text-red-400' : 'bg-neutral-800 text-neutral-500'
          }`}>
            {trend === 'expanding' ? '↑ Growing' : trend === 'contracting' ? '↓ Declining' : '→ Stable'}
          </span>
        )}
      </div>
      
      {description && (
        <p className="text-[10px] text-neutral-600 mb-2 leading-relaxed">{description}</p>
      )}
      
      <div className={`text-2xl font-bold tabular-nums ${
        isPositive ? 'text-white' : isNegative ? 'text-neutral-400' : 'text-neutral-500'
      }`}>
        <CountUp
          value={Math.abs(value)}
          decimals={2}
          prefix={value > 0 ? '+' : value < 0 ? '-' : ''}
          shouldAnimate={isAnimating}
          durationMs={700}
        />
        <span className="text-xs font-normal text-neutral-600 ml-1">
          {isPositive ? 'bullish' : isNegative ? 'bearish' : 'neutral'}
        </span>
      </div>
      <div className="text-[10px] text-neutral-600 mt-1">{sublabel}</div>
      <div className="mt-3 h-1 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isPositive ? 'bg-white' : isNegative ? 'bg-neutral-500' : 'bg-neutral-600'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MarketCard({ data }: { data: SignalsResponse['market_data'] }) {
  const { isAnimating } = useEntryMotion();
  if (!data) return null;
  const isUp = data.change_1w_pct > 0;
  
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-medium">Market</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              data.trend === 'bullish' ? 'bg-neutral-800 text-white' :
              data.trend === 'bearish' ? 'bg-neutral-900 text-neutral-400' :
              'bg-neutral-900 text-neutral-500'
            }`}>
              {data.trend.toUpperCase()}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <CountUp
              value={data.price}
              decimals={2}
              prefix="$"
              shouldAnimate={isAnimating}
              durationMs={750}
              className="text-xl font-bold tabular-nums"
            />
            <span className="text-xs text-neutral-600">{data.ticker}</span>
          </div>
        </div>
        <div className="text-right">
          <CountUp
            value={Math.abs(data.change_1w_pct)}
            decimals={1}
            prefix={isUp ? '+' : '-'}
            suffix="%"
            shouldAnimate={isAnimating}
            durationMs={700}
            className={`text-lg font-bold tabular-nums ${isUp ? 'text-white' : 'text-neutral-400'}`}
          />
          <div className="text-[10px] text-neutral-600">7-day</div>
        </div>
      </div>
    </div>
  );
}

function AIInsightCard({ insight }: { insight: SignalsResponse['ai_insight'] }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!insight) return null;
  
  return (
    <div className="card p-4 border-neutral-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
            <path d="M9 14v2M15 14v2" />
          </svg>
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">AI Analysis</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-violet-900/30 text-violet-400 rounded">
            {insight.model}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-neutral-500">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Live
        </div>
      </div>
      
      {/* Summary - Always visible */}
      <p className="text-sm text-neutral-300 leading-relaxed">{insight.summary}</p>
      
      {/* Key themes - Always visible */}
      {insight.key_themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {insight.key_themes.map((theme, i) => (
            <span key={i} className="text-[10px] px-2 py-1 bg-neutral-900 text-neutral-400 rounded-md">
              {theme}
            </span>
          ))}
        </div>
      )}
      
      {/* Show More Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 mt-3 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {expanded ? 'Show less' : 'Show more details'}
      </button>
      
      {/* Expanded Content */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-neutral-800 space-y-4 animate-fade-in">
          {/* Confidence Score */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Confidence Level</span>
              <span className="text-xs text-neutral-400 tabular-nums">{(insight.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${insight.confidence * 100}%` }}
              />
            </div>
          </div>
          
          {/* Sentiment Breakdown */}
          <div>
            <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Sentiment Analysis</span>
            <div className="mt-2 flex items-center gap-3">
              <div className={`text-lg font-bold tabular-nums ${
                insight.sentiment_score > 0.1 ? 'text-emerald-400' : 
                insight.sentiment_score < -0.1 ? 'text-red-400' : 'text-neutral-400'
              }`}>
                {insight.sentiment_score > 0 ? '+' : ''}{insight.sentiment_score.toFixed(2)}
              </div>
              <span className="text-xs text-neutral-500">
                {insight.sentiment_score > 0.3 ? 'Strongly Positive' :
                 insight.sentiment_score > 0.1 ? 'Moderately Positive' :
                 insight.sentiment_score < -0.3 ? 'Strongly Negative' :
                 insight.sentiment_score < -0.1 ? 'Moderately Negative' : 'Neutral'}
              </span>
            </div>
          </div>
          
          {/* Risk Factors */}
          {insight.risk_factors.length > 0 && (
            <div>
              <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Risk Factors Identified</span>
              <div className="mt-2 space-y-2">
                {insight.risk_factors.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-red-900/10 border border-red-900/20 rounded-lg">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400 mt-0.5 flex-shrink-0">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p className="text-xs text-neutral-300 leading-relaxed">{risk}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Model Info */}
          <div className="text-[10px] text-neutral-600 flex items-center gap-2">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Analysis powered by {insight.model} • Updated in real-time
          </div>
        </div>
      )}
    </div>
  );
}

function SatellitePanel({ satellite, score, region, topHeadline }: { 
  satellite: SignalsResponse['satellite_raw']; 
  score: number;
  region: Region;
  topHeadline?: Headline;
}) {
  const { isAnimating } = useEntryMotion();
  const [expanded, setExpanded] = useState(false);
  const [lng, lat] = region.centroid;
  
  // Fallback to Mapbox satellite
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapboxUrl = mapboxToken 
    ? `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${expanded ? 10 : 8},0/${expanded ? 800 : 400}x${expanded ? 400 : 200}@2x?access_token=${mapboxToken}`
    : null;
  
  return (
    <div 
      className={`card overflow-hidden cursor-pointer transition-all duration-300 hover:ring-1 hover:ring-white/20 ${expanded ? 'ring-1 ring-white/10' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Satellite Imagery */}
      <div className={`relative bg-neutral-900 overflow-hidden transition-all duration-300 ${expanded ? 'h-64' : 'h-36'}`}>
        {mapboxUrl ? (
          <img 
            src={mapboxUrl}
            alt={`Satellite view of ${region.name}`}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
            <div className="text-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-neutral-600 mb-2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span className="text-[10px] text-neutral-500">Add Mapbox token for imagery</span>
            </div>
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Expand indicator */}
        <div className="absolute top-3 left-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium bg-black/50 text-neutral-300">
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {expanded ? 'Click to collapse' : 'Click to expand'}
          </div>
        </div>
        
        {/* Coordinates */}
        <div className="absolute top-3 right-3 text-[10px] text-neutral-400 font-mono bg-black/50 px-2 py-1 rounded">
          {lat.toFixed(2)}°N, {lng.toFixed(2)}°E
        </div>
        
        {/* Bottom info */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Night Light Analysis</div>
            <CountUp
              value={Math.abs(satellite.activity_delta_pct)}
              decimals={1}
              prefix={satellite.activity_delta_pct > 0 ? '+' : satellite.activity_delta_pct < 0 ? '-' : ''}
              suffix="%"
              shouldAnimate={isAnimating}
              durationMs={800}
              className={`font-bold text-white transition-all duration-300 ${expanded ? 'text-2xl' : 'text-lg'}`}
            />
          </div>
          <div className="text-right">
            <div className="text-[10px] text-neutral-500">vs {satellite.baseline_window_days}-day baseline</div>
            <div className="text-xs text-neutral-300">Last: {satellite.last_observation}</div>
          </div>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="p-3 grid grid-cols-4 gap-2 border-t border-neutral-800">
        <div className="text-center">
          <div className="text-[10px] text-neutral-500 uppercase">Confidence</div>
          <div className="text-sm font-semibold text-white">{(satellite.confidence * 100).toFixed(0)}%</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-neutral-500 uppercase">Anomaly</div>
          <div className={`text-sm font-semibold ${satellite.anomaly_strength > 0.5 ? 'text-amber-400' : 'text-white'}`}>
            {(satellite.anomaly_strength * 100).toFixed(0)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-neutral-500 uppercase">Trend</div>
          <div className={`text-sm font-semibold capitalize ${
            satellite.trend === 'expanding' ? 'text-emerald-400' : 
            satellite.trend === 'contracting' ? 'text-red-400' : 'text-neutral-400'
          }`}>
            {satellite.trend}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-neutral-500 uppercase">Signal</div>
          <div className={`text-sm font-semibold ${score > 0.1 ? 'text-emerald-400' : score < -0.1 ? 'text-red-400' : 'text-neutral-400'}`}>
            {score > 0 ? '+' : ''}{score.toFixed(2)}
          </div>
        </div>
      </div>
      
      {/* Expanded Details */}
      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-3 border-t border-neutral-800 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-900/50 rounded-lg p-3">
              <div className="text-[10px] text-neutral-500 uppercase mb-1">Night Light Delta</div>
              <div className={`text-lg font-bold ${satellite.night_light_delta_pct > 0 ? 'text-emerald-400' : satellite.night_light_delta_pct < 0 ? 'text-red-400' : 'text-white'}`}>
                {satellite.night_light_delta_pct > 0 ? '+' : ''}{satellite.night_light_delta_pct.toFixed(1)}%
              </div>
            </div>
            <div className="bg-neutral-900/50 rounded-lg p-3">
              <div className="text-[10px] text-neutral-500 uppercase mb-1">Top Source</div>
              <div className="text-sm font-semibold text-white truncate">{topHeadline?.source || 'No headlines'}</div>
            </div>
          </div>
          <div className="bg-neutral-900/50 rounded-lg p-3">
            <div className="text-[10px] text-neutral-500 uppercase mb-2">Analysis Summary</div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {satellite.trend === 'expanding' 
                ? `Economic activity in ${region.name} shows expansion with ${satellite.activity_delta_pct.toFixed(1)}% increase in observed indicators. Night light intensity suggests growing industrial and commercial activity.`
                : satellite.trend === 'contracting'
                ? `Economic activity in ${region.name} shows contraction with ${Math.abs(satellite.activity_delta_pct).toFixed(1)}% decrease. Reduced night light patterns may indicate slowing industrial output.`
                : `Economic activity in ${region.name} remains stable with minimal deviation from baseline patterns. Current indicators suggest steady-state operations.`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertItem({ alert }: { alert: SignalsResponse['alerts'][0] }) {
  const styles = {
    ok: 'bg-neutral-900 text-neutral-400 border-neutral-800',
    info: 'bg-neutral-900 text-neutral-400 border-neutral-800',
    warning: 'bg-neutral-900 text-neutral-200 border-neutral-700',
    critical: 'bg-white/5 text-white border-neutral-600',
  };

  return (
    <div className={`p-3 rounded-xl border ${styles[alert.level as keyof typeof styles] || styles.info}`}>
      <p className="text-sm leading-relaxed">{alert.message}</p>
    </div>
  );
}

function SentimentDot({ sentiment }: { sentiment: number }) {
  return (
    <span className={`w-1.5 h-1.5 rounded-full ${
      sentiment > 0.1 ? 'bg-white' : sentiment < -0.1 ? 'bg-neutral-500' : 'bg-neutral-600'
    }`} />
  );
}

function ArticlePreview({ url, size = 'sm' }: { url: string; size?: 'sm' | 'md' }) {
  const [hasError, setHasError] = useState(false);
  const dimensions = size === 'sm' 
    ? { width: 80, height: 60, scale: 0.15 }
    : { width: 120, height: 90, scale: 0.2 };
  
  // Extract domain for fallback display
  const domain = (() => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'article';
    }
  })();

  if (hasError) {
    // Fallback: show domain with icon
    return (
      <div 
        className="flex-shrink-0 rounded-lg bg-neutral-800 border border-neutral-700 flex flex-col items-center justify-center overflow-hidden"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-500 mb-1">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
        <span className="text-[8px] text-neutral-500 truncate max-w-[90%] text-center leading-tight">
          {domain.slice(0, 12)}
        </span>
      </div>
    );
  }

  return (
    <div 
      className="flex-shrink-0 rounded-lg overflow-hidden border border-neutral-700 bg-white relative group-hover:border-neutral-600 transition-colors"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <div 
        style={{ 
          width: dimensions.width / dimensions.scale,
          height: dimensions.height / dimensions.scale,
          transform: `scale(${dimensions.scale})`,
          transformOrigin: 'top left',
        }}
      >
        <iframe
          src={url}
          title="Article preview"
          className="w-full h-full pointer-events-none"
          sandbox="allow-same-origin"
          loading="lazy"
          onError={() => setHasError(true)}
          onLoad={(e) => {
            // Check if iframe loaded properly (some sites block with X-Frame-Options)
            try {
              const iframe = e.target as HTMLIFrameElement;
              // If we can't access contentDocument, it likely loaded fine
              // If it's blocked, it will show blank or error which we can't easily detect
            } catch {
              setHasError(true);
            }
          }}
        />
      </div>
      {/* Overlay to prevent interaction */}
      <div className="absolute inset-0 bg-transparent" />
    </div>
  );
}

function NewsPopup({ headlines, aiInsight, selectedHeadline, onClose }: {
  headlines: Headline[];
  aiInsight: SignalsResponse['ai_insight'];
  selectedHeadline: Headline | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] card-elevated overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold">News Intelligence</h2>
            <p className="text-xs text-neutral-500 mt-0.5">{headlines.length} articles analyzed</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(80vh-80px)]">
          {/* AI Summary */}
          {aiInsight && (
            <div className="mb-6 p-4 bg-neutral-900/50 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">AI Summary</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 text-neutral-500 rounded">
                  {aiInsight.model}
                </span>
              </div>
              <p className="text-sm text-neutral-200 leading-relaxed">{aiInsight.summary}</p>
              {aiInsight.key_themes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {aiInsight.key_themes.map((theme, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 bg-neutral-800 text-neutral-300 rounded-md">
                      {theme}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Headlines */}
          <div className="space-y-3">
            {headlines.map((h, i) => (
              <a
                key={i}
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block p-4 rounded-xl border transition-all group ${
                  selectedHeadline?.title === h.title 
                    ? 'bg-neutral-800 border-neutral-600' 
                    : 'bg-neutral-900/50 border-neutral-800 hover:bg-neutral-800/50 hover:border-neutral-700'
                }`}
              >
                <div className="flex gap-4">
                  {/* Page Preview */}
                  <ArticlePreview url={h.url} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-100 leading-relaxed">{h.title}</p>
                    {h.description && (
                      <p className="text-xs text-neutral-500 mt-2 line-clamp-2">{h.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[10px] text-neutral-500 font-medium">{h.source}</span>
                      <span className="text-[10px] text-neutral-600">{h.published_at}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        h.sentiment > 0.1 ? 'bg-neutral-700 text-neutral-200' : 
                        h.sentiment < -0.1 ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-800 text-neutral-500'
                      }`}>
                        {h.sentiment > 0 ? '+' : ''}{h.sentiment.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SentimentBar({ sentiment }: { sentiment: number }) {
  return (
    <div className="w-1 self-stretch rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
      <div 
        className={`w-full transition-all ${
          sentiment > 0.1 ? 'bg-white' : sentiment < -0.1 ? 'bg-neutral-500' : 'bg-neutral-600'
        }`}
        style={{ height: `${Math.abs(sentiment) * 100}%` }}
      />
    </div>
  );
}

function ChartPanel({ isOpen, onToggle, ticker, symbols, onSelectTicker, onExpand, theme }: {
  isOpen: boolean;
  onToggle: () => void;
  ticker: string;
  symbols: Array<{ ticker: string; name: string; type: string }>;
  onSelectTicker: (ticker: string) => void;
  onExpand: () => void;
  theme: 'dark' | 'light';
}) {
  return (
    <div className={`border-t transition-all duration-300 flex flex-col ${isOpen ? 'h-[220px]' : 'h-10'}`} style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
      {/* Header - Always visible */}
      <div className="h-10 flex-shrink-0 flex items-center justify-between px-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M18 9l-5 5-4-4-3 3" />
            </svg>
            Chart Viewer
          </button>
          
          {isOpen && symbols.length > 0 && (
            <div className="flex gap-1 ml-2">
              {symbols.slice(0, 5).map((s) => (
                <button
                  key={s.ticker}
                  onClick={() => onSelectTicker(s.ticker)}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                    ticker === s.ticker
                      ? 'bg-white text-black'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                  }`}
                >
                  {s.ticker}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {isOpen && (
          <div className="flex items-center gap-2">
            <button
              onClick={onExpand}
              className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors"
              title="Expand to full screen"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
            <a
              href={`https://www.tradingview.com/symbols/${ticker}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors"
              title="Open in TradingView"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        )}
      </div>
      
      {/* Chart Area */}
      {isOpen && (
        <div className="flex-1 min-h-0">
          <TradingViewChart symbol={ticker} theme={theme} autosize />
        </div>
      )}
    </div>
  );
}

function ChartModal({ ticker, symbols, regionName, onSelectTicker, onClose, theme }: {
  ticker: string;
  symbols: Array<{ ticker: string; name: string; type: string }>;
  regionName: string;
  onSelectTicker: (ticker: string) => void;
  onClose: () => void;
  theme: 'dark' | 'light';
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-5xl h-[80vh] card-elevated overflow-hidden animate-slide-up flex flex-col" style={{ background: 'var(--bg-card)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold">Market Charts</h2>
              <p className="text-xs text-neutral-500 mt-0.5">{regionName} - Related Markets</p>
            </div>
            
            {/* Symbol Tabs */}
            <div className="flex gap-1 ml-4">
              {symbols.map((s) => (
                <button
                  key={s.ticker}
                  onClick={() => onSelectTicker(s.ticker)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    ticker === s.ticker
                      ? 'bg-white text-black'
                      : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  {s.ticker}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Chart */}
        <div className="flex-1 min-h-0">
          <TradingViewChart symbol={ticker} theme={theme} autosize />
        </div>
        
        {/* Footer with symbol info */}
        <div className="p-3 border-t border-neutral-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {symbols.map((s) => (
                <div 
                  key={s.ticker}
                  className={`text-xs ${ticker === s.ticker ? 'text-white' : 'text-neutral-600'}`}
                >
                  <span className="font-semibold">{s.ticker}</span>
                  <span className="ml-1.5">{s.name}</span>
                </div>
              ))}
            </div>
            <a
              href={`https://www.tradingview.com/symbols/${ticker}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
            >
              Open in TradingView
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function WaitlistModal({ onAccess }: { onAccess: () => void }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'loading') return;

    setStatus('loading');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setMessage('Connection failed. Try again.');
    }
  };

  return (
    <div className="dark min-h-screen w-full flex items-center justify-center p-4" style={{ background: '#050505' }}>
      {/* Subtle background grid */}
      <div 
        className="fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 
            className="text-3xl font-bold tracking-wider text-white"
            style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.1em' }}
          >
            PRIMORDIA
          </h1>
          <p className="text-neutral-600 text-xs uppercase tracking-[0.3em] mt-2">
            Ground Truth Intelligence
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
          {status === 'success' ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">You're on the list</h2>
              <p className="text-neutral-400 text-sm mb-6">Check your inbox for confirmation.</p>
              <p className="text-neutral-600 text-xs">Early access coming soon.</p>
            </div>
          ) : (
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <p className="text-neutral-500 text-xs uppercase tracking-widest mb-4">Beta Access</p>
                <h2 className="text-2xl font-semibold text-white mb-3">
                  See what headlines miss.
                </h2>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Satellite data reveals economic reality before markets react. 
                  Join the waitlist for early access.
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { icon: '🛰️', label: 'Satellite Intel' },
                  { icon: '📰', label: 'News Sentiment' },
                  { icon: '📊', label: 'Market Signals' },
                ].map((f) => (
                  <div key={f.label} className="text-center p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/50">
                    <span className="text-lg">{f.icon}</span>
                    <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wide">{f.label}</p>
                  </div>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-600 transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading' || !email}
                    className="w-full py-3 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {status === 'loading' ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Request Beta Access'
                    )}
                  </button>
                </div>
                
                {status === 'error' && (
                  <p className="text-red-400 text-xs text-center mt-3">{message}</p>
                )}
              </form>

              {/* Footer */}
              <p className="text-neutral-600 text-[10px] text-center mt-6">
                No spam. Early users get lifetime discounts.
              </p>
            </div>
          )}
        </div>

        {/* Bypass for development */}
        <button
          onClick={onAccess}
          className="mt-8 mx-auto block text-neutral-700 text-xs hover:text-neutral-500 transition-colors"
        >
          Skip for now →
        </button>
      </div>
    </div>
  );
}

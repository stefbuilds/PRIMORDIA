'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Region, SignalsResponse, Headline, MarketSymbol, GeospatialData, PhysicalFusion, SpatialStats } from '@/types';
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
  const [showWelcome, setShowWelcome] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string>('FXI');
  const [marketSymbols, setMarketSymbols] = useState<MarketSymbol[]>([]);
  const [showChartPanel, setShowChartPanel] = useState(true); // Built-in chart viewer
  const [showMapPanel, setShowMapPanel] = useState(true); // Map visibility
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'globe'>('satellite');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showAnomalyOverlay, setShowAnomalyOverlay] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

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

  // Show welcome modal on first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('global-pulse-visited');
    if (!hasVisited) {
      setShowWelcome(true);
    }
  }, []);

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
                <Map 
                  selectedRegion={selectedRegion} 
                  onRegionSelect={setSelectedRegion} 
                  regions={regions} 
                  mapStyle={mapStyle}
                  overlay={signals?.geospatial?.overlay}
                  showOverlay={showAnomalyOverlay}
                />
                
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

                {/* Anomaly Overlay Toggle */}
                {signals?.geospatial && (
                  <div className="absolute top-14 right-4 z-10">
                    <button
                      onClick={() => setShowAnomalyOverlay(!showAnomalyOverlay)}
                      className={`glass rounded-xl px-3 py-2 text-xs font-medium transition-all flex items-center gap-2 ${
                        showAnomalyOverlay 
                          ? 'bg-white/20 text-white ring-1 ring-white/30' 
                          : 'text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                      Anomaly Layer
                      {signals.geospatial.is_simulated && (
                        <span className="text-[9px] px-1 py-0.5 bg-amber-500/20 text-amber-400 rounded">SIM</span>
                      )}
                    </button>
                  </div>
                )}

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

      {/* Welcome Modal */}
      {showWelcome && (
        <WelcomeModal 
          onClose={() => {
            setShowWelcome(false);
            localStorage.setItem('global-pulse-visited', 'true');
          }}
        />
      )}
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

// Timestamp component for official feel
function DataTimestamp({ timestamp, label = "LAST UPDATED" }: { timestamp: string; label?: string }) {
  const date = new Date(timestamp);
  const now = new Date();
  const ageMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  const isStale = ageMinutes > 30;
  
  return (
    <div className="flex items-center gap-2 font-mono text-[9px] text-neutral-600">
      <span className="uppercase tracking-wider">{label}:</span>
      <span className="text-neutral-400">{date.toISOString().replace('T', ' ').slice(0, 19)}Z</span>
      <span className={`px-1 py-0.5 rounded text-[8px] ${isStale ? 'bg-amber-900/30 text-amber-500' : 'bg-neutral-800 text-neutral-500'}`}>
        {ageMinutes < 1 ? 'LIVE' : `${ageMinutes}M AGO`}
      </span>
    </div>
  );
}

// Card header with timestamp
function CardHeader({ title, timestamp, icon, badge }: { 
  title: string; 
  timestamp?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.1em] font-mono">{title}</span>
        </div>
        {badge}
      </div>
      {timestamp && (
        <div className="mt-1.5">
          <DataTimestamp timestamp={timestamp} />
        </div>
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
          <h2 className="text-lg font-semibold font-mono tracking-tight">{region.name.toUpperCase()}</h2>
          <p className="text-xs text-neutral-500 mt-0.5">{region.description}</p>
          <DataTimestamp timestamp={signals.timestamp} label="DATA TIMESTAMP" />
        </div>
        <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-900 px-2 py-1 rounded font-mono uppercase tracking-wider">
          {region.category}
        </span>
      </div>

      {/* Divergence Score */}
      <div id="section-divergence">
        <DivergenceCard score={signals.divergence_score} timestamp={signals.timestamp} />
      </div>

      {/* Physical Fusion Card - NEW */}
      {signals.geospatial && (
        <div id="section-fusion">
          <PhysicalFusionCard fusion={signals.geospatial.physical_fusion} isSimulated={signals.geospatial.is_simulated} timestamp={signals.timestamp} />
        </div>
      )}

      {/* Spatial Stats Card - NEW */}
      {signals.geospatial && (
        <div id="section-spatial">
          <SpatialStatsCard stats={signals.geospatial.spatial_stats} legend={signals.geospatial.overlay.legend} isSimulated={signals.geospatial.is_simulated} timestamp={signals.timestamp} />
        </div>
      )}

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
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.1em] font-mono">HEADLINES FEED</h3>
            <button 
              onClick={onShowNews}
              className="text-[10px] text-neutral-400 hover:text-white transition-colors font-mono uppercase"
            >
              VIEW ALL →
            </button>
          </div>
          <div className="mb-3">
            <DataTimestamp timestamp={signals.timestamp} label="FEED UPDATED" />
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
        <MarketCard data={signals.market_data} timestamp={signals.timestamp} />
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
        <AIInsightCard insight={signals.ai_insight} timestamp={signals.timestamp} />
      )}

      {/* Risk Signals */}
      <div id="section-risk" className="card p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.1em] font-mono">RISK MONITOR</h3>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${
              signals.alerts.some(a => a.level === 'critical') ? 'bg-red-500 animate-pulse' :
              signals.alerts.some(a => a.level === 'warning') ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            <span className="text-[10px] text-neutral-500 font-mono uppercase">
              {signals.alerts.filter(a => a.level === 'critical').length > 0 
                ? `${signals.alerts.filter(a => a.level === 'critical').length} CRIT` 
                : signals.alerts.filter(a => a.level === 'warning').length > 0
                ? `${signals.alerts.filter(a => a.level === 'warning').length} WARN`
                : 'CLEAR'}
            </span>
          </div>
        </div>
        <div className="mb-3">
          <DataTimestamp timestamp={signals.timestamp} />
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-neutral-900 rounded p-2 text-center">
            <CountUp
              value={signals.alerts.length}
              decimals={0}
              shouldAnimate={isAnimating}
              durationMs={600}
              className="text-lg font-bold text-white font-mono tabular-nums"
            />
            <div className="text-[9px] text-neutral-500 uppercase font-mono tracking-wider">SIGNALS</div>
          </div>
          <div className="bg-neutral-900 rounded p-2 text-center">
            <CountUp
              value={signals.satellite_raw.anomaly_strength * 100}
              decimals={0}
              suffix="%"
              shouldAnimate={isAnimating}
              durationMs={650}
              className={`text-lg font-bold font-mono tabular-nums ${
                signals.satellite_raw.anomaly_strength > 0.5 ? 'text-amber-400' : 'text-neutral-400'
              }`}
            />
            <div className="text-[9px] text-neutral-500 uppercase font-mono tracking-wider">ANOMALY</div>
          </div>
          <div className="bg-neutral-900 rounded p-2 text-center">
            <CountUp
              value={signals.news_raw.hype_intensity * 100}
              decimals={0}
              suffix="%"
              shouldAnimate={isAnimating}
              durationMs={700}
              className={`text-lg font-bold font-mono tabular-nums ${
                signals.news_raw.hype_intensity > 0.6 ? 'text-red-400' : 'text-neutral-400'
              }`}
            />
            <div className="text-[9px] text-neutral-500 uppercase font-mono tracking-wider">HYPE</div>
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
        <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.1em] font-mono mb-1">INTEL SYNTHESIS</h3>
        <div className="mb-3">
          <DataTimestamp timestamp={signals.timestamp} label="GENERATED" />
        </div>
        <p className="text-sm text-neutral-300 leading-relaxed">{signals.explanation.synthesis}</p>
      </div>
    </div>
  );
}

function DivergenceCard({ score, timestamp }: { score: number; timestamp?: string }) {
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
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.1em] font-mono">DIVERGENCE INDEX</span>
          <div className="group relative">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-600 cursor-help">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-neutral-900 border border-neutral-700 rounded text-xs text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Measures the gap between satellite-observed physical activity and media-driven market narrative. Higher = bigger disconnect.
            </div>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
          severity === 'critical' ? 'bg-white text-black' :
          severity === 'elevated' ? 'bg-neutral-700 text-white' :
          'bg-neutral-800 text-neutral-400'
        }`}>
          {labels[severity]}
        </span>
      </div>
      
      {timestamp && (
        <div className="mb-3">
          <DataTimestamp timestamp={timestamp} />
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <CountUp
              value={score}
              decimals={0}
              shouldAnimate={isAnimating}
              durationMs={800}
              className={`text-5xl font-bold font-mono tabular-nums ${
                severity === 'critical' ? 'text-white' : 'text-neutral-300'
              }`}
            />
            <span className="text-neutral-600 text-lg font-mono">/100</span>
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
          <span className="absolute bottom-0 right-0 text-[9px] text-neutral-600 font-mono">7D</span>
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
      <div className="flex justify-between mt-1.5 text-[9px] text-neutral-600 font-mono uppercase">
        <span>ALIGNED</span>
        <span>MODERATE</span>
        <span>CRITICAL</span>
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
          <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-[0.1em] font-mono">{label.toUpperCase()}</span>
        </div>
        {trend && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
            trend === 'expanding' ? 'bg-emerald-900/30 text-emerald-400' : 
            trend === 'contracting' ? 'bg-red-900/30 text-red-400' : 'bg-neutral-800 text-neutral-500'
          }`}>
            {trend === 'expanding' ? '↑ GROW' : trend === 'contracting' ? '↓ DECL' : '→ STBL'}
          </span>
        )}
      </div>
      
      {description && (
        <p className="text-[10px] text-neutral-600 mb-2 leading-relaxed">{description}</p>
      )}
      
      <div className={`text-2xl font-bold font-mono tabular-nums ${
        isPositive ? 'text-white' : isNegative ? 'text-neutral-400' : 'text-neutral-500'
      }`}>
        <CountUp
          value={Math.abs(value)}
          decimals={2}
          prefix={value > 0 ? '+' : value < 0 ? '-' : ''}
          shouldAnimate={isAnimating}
          durationMs={700}
        />
        <span className="text-[9px] font-normal text-neutral-600 ml-1 uppercase font-mono">
          {isPositive ? 'BULLISH' : isNegative ? 'BEARISH' : 'NEUTRAL'}
        </span>
      </div>
      <div className="text-[10px] text-neutral-600 mt-1 font-mono uppercase">{sublabel}</div>
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

function MarketCard({ data, timestamp }: { data: SignalsResponse['market_data']; timestamp?: string }) {
  const { isAnimating } = useEntryMotion();
  if (!data) return null;
  const isUp = data.change_1w_pct > 0;
  
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-500 font-semibold font-mono uppercase tracking-[0.1em]">MARKET DATA</span>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded font-mono ${
            data.trend === 'bullish' ? 'bg-neutral-800 text-white' :
            data.trend === 'bearish' ? 'bg-neutral-900 text-neutral-400' :
            'bg-neutral-900 text-neutral-500'
          }`}>
            {data.trend.toUpperCase()}
          </span>
        </div>
      </div>
      {timestamp && (
        <div className="mb-3">
          <DataTimestamp timestamp={timestamp} label="PRICE AS OF" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <CountUp
              value={data.price}
              decimals={2}
              prefix="$"
              shouldAnimate={isAnimating}
              durationMs={750}
              className="text-xl font-bold font-mono tabular-nums"
            />
            <span className="text-[10px] text-neutral-600 font-mono">{data.ticker}</span>
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
            className={`text-lg font-bold font-mono tabular-nums ${isUp ? 'text-white' : 'text-neutral-400'}`}
          />
          <div className="text-[10px] text-neutral-600 font-mono uppercase">7D CHG</div>
        </div>
      </div>
    </div>
  );
}

function AIInsightCard({ insight, timestamp }: { insight: SignalsResponse['ai_insight']; timestamp?: string }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!insight) return null;
  
  return (
    <div className="card p-4 border-neutral-700">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
            <path d="M9 14v2M15 14v2" />
          </svg>
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.1em] font-mono">AI ANALYSIS</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-violet-900/30 text-violet-400 rounded font-mono">
            {insight.model.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-neutral-500 font-mono uppercase">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          LIVE
        </div>
      </div>
      {timestamp && (
        <div className="mb-3">
          <DataTimestamp timestamp={timestamp} label="INFERENCE" />
        </div>
      )}
      
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
              <span className="text-[10px] text-neutral-600 uppercase tracking-wider font-mono">CONFIDENCE</span>
              <span className="text-xs text-neutral-400 font-mono tabular-nums">{(insight.confidence * 100).toFixed(0)}%</span>
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
            <span className="text-[10px] text-neutral-600 uppercase tracking-wider font-mono">SENTIMENT SCORE</span>
            <div className="mt-2 flex items-center gap-3">
              <div className={`text-lg font-bold font-mono tabular-nums ${
                insight.sentiment_score > 0.1 ? 'text-emerald-400' : 
                insight.sentiment_score < -0.1 ? 'text-red-400' : 'text-neutral-400'
              }`}>
                {insight.sentiment_score > 0 ? '+' : ''}{insight.sentiment_score.toFixed(2)}
              </div>
              <span className="text-[10px] text-neutral-500 font-mono uppercase">
                {insight.sentiment_score > 0.3 ? 'STRONG POS' :
                 insight.sentiment_score > 0.1 ? 'MOD POS' :
                 insight.sentiment_score < -0.3 ? 'STRONG NEG' :
                 insight.sentiment_score < -0.1 ? 'MOD NEG' : 'NEUTRAL'}
              </span>
            </div>
          </div>
          
          {/* Risk Factors */}
          {insight.risk_factors.length > 0 && (
            <div>
              <span className="text-[10px] text-neutral-600 uppercase tracking-wider font-mono">RISK FACTORS</span>
              <div className="mt-2 space-y-2">
                {insight.risk_factors.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-red-900/10 border border-red-900/20 rounded">
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
          <div className="text-[9px] text-neutral-600 flex items-center gap-2 font-mono uppercase">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            MODEL: {insight.model.toUpperCase()} • REAL-TIME
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
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">VIIRS NIGHT LIGHT</div>
            <CountUp
              value={Math.abs(satellite.activity_delta_pct)}
              decimals={1}
              prefix={satellite.activity_delta_pct > 0 ? '+' : satellite.activity_delta_pct < 0 ? '-' : ''}
              suffix="%"
              shouldAnimate={isAnimating}
              durationMs={800}
              className={`font-bold font-mono text-white transition-all duration-300 ${expanded ? 'text-2xl' : 'text-lg'}`}
            />
          </div>
          <div className="text-right font-mono">
            <div className="text-[10px] text-neutral-500 uppercase">VS {satellite.baseline_window_days}D BASELINE</div>
            <div className="text-[10px] text-neutral-300">OBS: {satellite.last_observation}</div>
          </div>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="p-3 grid grid-cols-4 gap-2 border-t border-neutral-800">
        <div className="text-center">
          <div className="text-[9px] text-neutral-500 uppercase font-mono tracking-wider">CONF</div>
          <div className="text-sm font-semibold text-white font-mono">{(satellite.confidence * 100).toFixed(0)}%</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-neutral-500 uppercase font-mono tracking-wider">ANOM</div>
          <div className={`text-sm font-semibold font-mono ${satellite.anomaly_strength > 0.5 ? 'text-amber-400' : 'text-white'}`}>
            {(satellite.anomaly_strength * 100).toFixed(0)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-neutral-500 uppercase font-mono tracking-wider">TREND</div>
          <div className={`text-sm font-semibold font-mono uppercase ${
            satellite.trend === 'expanding' ? 'text-emerald-400' : 
            satellite.trend === 'contracting' ? 'text-red-400' : 'text-neutral-400'
          }`}>
            {satellite.trend === 'expanding' ? 'EXP' : satellite.trend === 'contracting' ? 'CON' : 'STB'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-neutral-500 uppercase font-mono tracking-wider">SIG</div>
          <div className={`text-sm font-semibold font-mono ${score > 0.1 ? 'text-emerald-400' : score < -0.1 ? 'text-red-400' : 'text-neutral-400'}`}>
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

function PhysicalFusionCard({ fusion, isSimulated, timestamp }: { fusion: PhysicalFusion; isSimulated: boolean; timestamp?: string }) {
  const { isAnimating } = useEntryMotion();
  
  // Agreement color
  const agreementColor = fusion.agreement > 0.7 
    ? 'text-emerald-400' 
    : fusion.agreement > 0.4 
    ? 'text-amber-400' 
    : 'text-red-400';
  
  const agreementLabel = fusion.agreement > 0.7 
    ? 'STRONG' 
    : fusion.agreement > 0.4 
    ? 'MODERATE' 
    : 'LOW';
  
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.1em] font-mono">PROXY SENSOR FUSION</span>
          {isSimulated && (
            <span className="text-[9px] px-1.5 py-0.5 bg-amber-900/30 text-amber-400 rounded font-mono">SIM</span>
          )}
        </div>
      </div>
      {timestamp && (
        <div className="mb-3">
          <DataTimestamp timestamp={timestamp} />
        </div>
      )}
      
      {/* Fused Signal Gauge */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] text-neutral-500 uppercase mb-1 font-mono tracking-wider">FUSED ACTIVITY INDEX</div>
          <div className="flex items-baseline gap-1">
            <CountUp
              value={Math.abs(fusion.fused_signal)}
              decimals={2}
              prefix={fusion.fused_signal >= 0 ? '+' : '-'}
              shouldAnimate={isAnimating}
              durationMs={700}
              className={`text-2xl font-bold font-mono tabular-nums ${
                fusion.fused_signal > 0.1 ? 'text-emerald-400' : 
                fusion.fused_signal < -0.1 ? 'text-red-400' : 'text-neutral-400'
              }`}
            />
            <span className="text-[9px] text-neutral-600 font-mono uppercase">
              {fusion.fused_signal > 0.1 ? 'EXPANDING' : fusion.fused_signal < -0.1 ? 'CONTRACT' : 'STABLE'}
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-[10px] text-neutral-500 uppercase mb-1 font-mono tracking-wider">AGREEMENT</div>
          <div className="flex items-baseline gap-1 justify-end">
            <CountUp
              value={fusion.agreement * 100}
              decimals={0}
              suffix="%"
              shouldAnimate={isAnimating}
              durationMs={650}
              className={`text-lg font-bold font-mono tabular-nums ${agreementColor}`}
            />
          </div>
          <div className={`text-[9px] font-mono ${agreementColor}`}>{agreementLabel}</div>
        </div>
      </div>
      
      {/* Fused Signal Bar */}
      <div className="mb-4">
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden relative">
          <div className="absolute inset-y-0 left-1/2 w-px bg-neutral-600" />
          <div
            className={`absolute h-full transition-all duration-500 ${
              fusion.fused_signal > 0 ? 'bg-emerald-500 left-1/2' : 'bg-red-500 right-1/2'
            }`}
            style={{ 
              width: `${Math.abs(fusion.fused_signal) * 50}%`,
              ...(fusion.fused_signal < 0 ? { left: `${50 - Math.abs(fusion.fused_signal) * 50}%` } : {})
            }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-neutral-600 font-mono">
          <span>-1.0</span>
          <span>0</span>
          <span>+1.0</span>
        </div>
      </div>
      
      {/* Individual Proxies */}
      <div className="space-y-2">
        <div className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider">PROXY SIGNALS</div>
        {fusion.proxies.map((proxy) => (
          <div key={proxy.name} className="flex items-center justify-between p-2 bg-neutral-900/50 rounded">
            <div className="flex items-center gap-2">
              {proxy.name === 'night_lights' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : proxy.name === 'ndvi' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                  <path d="M7 20h10" />
                  <path d="M12 20v-8" />
                  <path d="M12 12c-2-2-4-2.5-6-2 2-4 6-6 6-6s4 2 6 6c-2-.5-4 0-6 2z" />
                </svg>
              ) : proxy.name === 'sar_backscatter' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
                  <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
                  <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
                  <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
              <span className="text-[10px] text-neutral-300 uppercase font-mono tracking-wider">
                {proxy.name === 'sar_backscatter' ? 'SAR' : proxy.name === 'night_lights' ? 'VIIRS' : 'NDVI'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold font-mono tabular-nums ${
                proxy.value > 0.1 ? 'text-emerald-400' : 
                proxy.value < -0.1 ? 'text-red-400' : 'text-neutral-400'
              }`}>
                {proxy.value > 0 ? '+' : ''}{proxy.value.toFixed(2)}
              </span>
              <div className="flex items-center gap-1">
                <div className="w-12 h-1 bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${proxy.confidence * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-neutral-500 font-mono">{(proxy.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpatialStatsCard({ stats, legend, isSimulated, timestamp }: { stats: SpatialStats; legend: { min_val: number; max_val: number; unit: string; description: string }; isSimulated: boolean; timestamp?: string }) {
  const { isAnimating } = useEntryMotion();
  
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-[0.1em] font-mono">SPATIAL ANOMALY STATS</span>
          {isSimulated && (
            <span className="text-[9px] px-1.5 py-0.5 bg-amber-900/30 text-amber-400 rounded font-mono">SIM</span>
          )}
        </div>
      </div>
      {timestamp && (
        <div className="mb-3">
          <DataTimestamp timestamp={timestamp} />
        </div>
      )}
      
      {/* Legend */}
      <div className="mb-3 p-2 bg-neutral-900/50 rounded">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">Z-SCORE SCALE</span>
          <span className="text-[9px] text-neutral-600 font-mono">{legend.description}</span>
        </div>
        <div className="h-2 rounded overflow-hidden" style={{ 
          background: 'linear-gradient(to right, rgb(50, 50, 200), rgb(220, 220, 255), rgb(255, 100, 100))' 
        }} />
        <div className="flex justify-between mt-1 text-[9px] text-neutral-500 font-mono">
          <span>{legend.min_val} BELOW</span>
          <span>0</span>
          <span>{legend.max_val} ABOVE</span>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-neutral-900 rounded p-2.5">
          <div className="text-[10px] text-neutral-500 uppercase mb-1 font-mono tracking-wider">MEAN ANOMALY</div>
          <CountUp
            value={Math.abs(stats.mean_anomaly)}
            decimals={2}
            prefix={stats.mean_anomaly >= 0 ? '+' : '-'}
            suffix="σ"
            shouldAnimate={isAnimating}
            durationMs={600}
            className={`text-lg font-bold font-mono tabular-nums ${
              stats.mean_anomaly > 0.5 ? 'text-red-400' : 
              stats.mean_anomaly < -0.5 ? 'text-blue-400' : 'text-neutral-300'
            }`}
          />
        </div>
        <div className="bg-neutral-900 rounded p-2.5">
          <div className="text-[10px] text-neutral-500 uppercase mb-1 font-mono tracking-wider">MAX ANOMALY</div>
          <CountUp
            value={Math.abs(stats.max_anomaly)}
            decimals={2}
            prefix={stats.max_anomaly >= 0 ? '+' : '-'}
            suffix="σ"
            shouldAnimate={isAnimating}
            durationMs={650}
            className={`text-lg font-bold font-mono tabular-nums ${
              stats.max_anomaly > 2 ? 'text-red-400' : 'text-neutral-300'
            }`}
          />
        </div>
        <div className="bg-neutral-900 rounded p-2.5">
          <div className="text-[10px] text-neutral-500 uppercase mb-1 font-mono tracking-wider">VARIANCE</div>
          <CountUp
            value={stats.spatial_variance}
            decimals={3}
            shouldAnimate={isAnimating}
            durationMs={700}
            className={`text-lg font-bold font-mono tabular-nums ${
              stats.spatial_variance > 1 ? 'text-amber-400' : 'text-neutral-300'
            }`}
          />
        </div>
        <div className="bg-neutral-900 rounded p-2.5">
          <div className="text-[10px] text-neutral-500 uppercase mb-1 font-mono tracking-wider">HOTSPOT %</div>
          <CountUp
            value={stats.hotspot_fraction * 100}
            decimals={1}
            suffix="%"
            shouldAnimate={isAnimating}
            durationMs={750}
            className={`text-lg font-bold font-mono tabular-nums ${
              stats.hotspot_fraction > 0.1 ? 'text-red-400' : 
              stats.hotspot_fraction > 0.05 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          />
          <div className="text-[9px] text-neutral-600 mt-0.5 font-mono">|Z| &gt; 2</div>
        </div>
      </div>
    </div>
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

function WelcomeModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'welcome' | 'tutorial'>('welcome');

  // Tutorial view
  if (step === 'tutorial') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />
        <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Quick Start</span>
              <button
                onClick={() => setStep('welcome')}
                className="text-neutral-500 hover:text-white transition-colors text-xs"
              >
                Back
              </button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <span className="text-neutral-600 font-mono text-xs mt-0.5">01</span>
                <p className="text-neutral-300"><span className="text-white">Select a region</span> from the dropdown or click on the map</p>
              </div>
              <div className="flex gap-3">
                <span className="text-neutral-600 font-mono text-xs mt-0.5">02</span>
                <p className="text-neutral-300"><span className="text-white">Divergence Index</span> shows gaps between satellite data and news narrative</p>
              </div>
              <div className="flex gap-3">
                <span className="text-neutral-600 font-mono text-xs mt-0.5">03</span>
                <p className="text-neutral-300"><span className="text-white">Right panel</span> contains signals, headlines, and AI analysis</p>
              </div>
              <div className="flex gap-3">
                <span className="text-neutral-600 font-mono text-xs mt-0.5">04</span>
                <p className="text-neutral-300"><span className="text-white">Chat assistant</span> available via button in bottom-right</p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="mt-6 w-full py-2.5 text-sm bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors font-medium"
            >
              Start Exploring
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial welcome view
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-white" />
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Primordia</span>
          </div>
          
          <p className="text-sm text-neutral-400 leading-relaxed mb-6">
            Intelligence terminal analyzing satellite imagery, news sentiment, and market data to detect divergence signals.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => setStep('tutorial')}
              className="flex-1 py-2.5 text-sm bg-neutral-900 text-neutral-300 rounded-lg hover:bg-neutral-800 hover:text-white transition-colors border border-neutral-800"
            >
              How it works
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors font-medium"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
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

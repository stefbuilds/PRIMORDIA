export interface Region {
  id: string;
  name: string;
  description: string;
  bbox: [number, number, number, number];
  centroid: [number, number];
  category: string;
}

export interface Headline {
  title: string;
  source: string;
  published_at: string;
  url: string;
  sentiment: number;
  description: string;
}

export interface NewsRaw {
  sentiment_score: number;
  confidence: number;
  hype_intensity: number;
  headline_volume: number;
  source_diversity: number;
  duplicate_ratio: number;
  pump_lexicon_rate: number;
  headlines: Headline[];
  trending_topics: string[];
}

export interface SatelliteRaw {
  activity_delta_pct: number;
  night_light_delta_pct: number;
  confidence: number;
  anomaly_strength: number;
  baseline_window_days: number;
  data_source: string;
  last_observation: string;
  trend: string;
}

export interface MarketData {
  ticker: string;
  name: string;
  price: number;
  change_pct: number;
  change_1w_pct: number;
  volume: number;
  signal_strength: number;
  trend: string;
}

export interface AIInsight {
  sentiment_score: number;
  confidence: number;
  summary: string;
  key_themes: string[];
  risk_factors: string[];
  model: string;
}

export interface Alert {
  level: 'ok' | 'info' | 'warning' | 'critical';
  title?: string;
  message: string;
  category: string;
}

export interface Explanation {
  sat_agent: string;
  news_agent: string;
  market_agent: string;
  synthesis: string;
}

export interface SignalsResponse {
  region_id: string;
  timestamp: string;
  satellite_score: number;
  news_score: number;
  market_score: number | null;
  divergence_score: number;
  data_mode: string;
  satellite_raw: SatelliteRaw;
  news_raw: NewsRaw;
  market_data: MarketData | null;
  ai_insight: AIInsight | null;
  geospatial: GeospatialData | null;
  alerts: Alert[];
  explanation: Explanation;
}

export interface RegionsResponse {
  regions: Region[];
}

export interface MarketSymbol {
  ticker: string;
  name: string;
  type: 'primary' | 'secondary';
  description: string;
}

export interface MarketSymbolsResponse {
  region_id: string;
  symbols: MarketSymbol[];
}

// === Geospatial Types ===

export interface ProxySignal {
  name: string;
  value: number;
  confidence: number;
}

export interface PhysicalFusion {
  fused_signal: number;
  agreement: number;
  proxies: ProxySignal[];
}

export interface SpatialStats {
  mean_anomaly: number;
  max_anomaly: number;
  min_anomaly: number;
  spatial_variance: number;
  hotspot_fraction: number;
}

export interface OverlayLegend {
  min_val: number;
  max_val: number;
  unit: string;
  description: string;
}

export interface Overlay {
  type: string;
  url: string;
  bbox: [number, number, number, number];
  legend: OverlayLegend;
}

export interface GeospatialData {
  overlay: Overlay;
  spatial_stats: SpatialStats;
  physical_fusion: PhysicalFusion;
  is_simulated: boolean;
}

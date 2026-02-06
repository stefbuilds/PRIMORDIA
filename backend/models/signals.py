"""
Signal Models for Global Pulse
==============================

These models define how raw data transforms into normalized scores.
Currently mocked, but designed for direct replacement with real sources:

- SatelliteSignal → Google Earth Engine + Vertex AI CV models
- NewsSignal → NewsAPI + sentiment models (VADER, FinBERT, etc.)

The normalization ensures all downstream logic works identically
regardless of data source.
"""

import math
from dataclasses import dataclass
from typing import Literal


@dataclass
class SatelliteRaw:
    """
    Raw satellite-derived metrics.
    
    Future sources:
    - activity_delta_pct: Vertex AI car/ship counting vs historical baseline
    - night_light_delta_pct: GEE Night Lights (VIIRS) vs baseline
    - ndvi_delta_pct: GEE NDVI for agricultural/industrial zones
    - confidence: Model confidence score from Vertex AI
    """
    activity_delta_pct: float      # -100 to +∞ (% change vs baseline)
    night_light_delta_pct: float   # -100 to +∞
    ndvi_delta_pct: float          # -100 to +∞ (negative = less vegetation/more industrial)
    confidence: float              # 0-1 (measurement reliability)
    
    def to_dict(self) -> dict:
        return {
            "activity_delta_pct": self.activity_delta_pct,
            "night_light_delta_pct": self.night_light_delta_pct,
            "ndvi_delta_pct": self.ndvi_delta_pct,
            "confidence": self.confidence,
        }


@dataclass
class NewsRaw:
    """
    Raw news/sentiment metrics.
    
    Future sources:
    - sentiment_score: FinBERT or VADER on NewsAPI headlines
    - headline_count: Volume from NewsAPI
    - hype_intensity: Custom model detecting bot-like patterns, 
                      coordinated posting, unusual volume spikes
    - source_diversity: Unique domains / total articles (0-1)
    """
    sentiment_score: float     # -1 to +1 (bearish to bullish)
    headline_count: int        # Raw volume
    hype_intensity: float      # 0-100 (virality / potential manipulation)
    source_diversity: float    # 0-1 (low = echo chamber)
    
    def to_dict(self) -> dict:
        return {
            "sentiment_score": self.sentiment_score,
            "headline_count": self.headline_count,
            "hype_intensity": self.hype_intensity,
            "source_diversity": self.source_diversity,
        }


class SatelliteSignal:
    """
    Transforms raw satellite data into a normalized score.
    
    Output: satellite_score in [-1, +1]
        -1 = strong physical contraction (fewer cars, dimmer lights, less activity)
        +1 = strong physical expansion (more activity than baseline)
         0 = neutral / at baseline
    
    Normalization uses tanh for smooth bounded mapping:
    - tanh(x/50) maps ±50% change to roughly ±0.76
    - tanh(x/50) maps ±100% change to roughly ±0.96
    - Extreme values asymptote to ±1
    
    The SCALE_FACTOR (50) represents "one standard deviation" of meaningful change.
    Adjust based on empirical data once real sources are connected.
    """
    
    SCALE_FACTOR = 50.0  # % change that maps to ~0.76 score
    
    # Weights for combining multiple satellite signals
    # These should be tuned based on predictive power for each region type
    WEIGHTS = {
        "activity": 0.5,      # Vehicle/vessel counts (most direct)
        "night_light": 0.35,  # Night lights (economic proxy)
        "ndvi": 0.15,         # Vegetation (inverse industrial proxy)
    }
    
    def __init__(self, raw: SatelliteRaw):
        self.raw = raw
        self._score = self._compute_score()
    
    def _normalize(self, delta_pct: float) -> float:
        """Map unbounded % change to [-1, +1] using tanh."""
        return math.tanh(delta_pct / self.SCALE_FACTOR)
    
    def _compute_score(self) -> float:
        """
        Weighted combination of normalized satellite signals.
        
        Note: NDVI is inverted because *decreasing* vegetation in industrial
        zones often indicates *increasing* activity (construction, expansion).
        This assumption should be validated per region type.
        """
        activity_norm = self._normalize(self.raw.activity_delta_pct)
        night_light_norm = self._normalize(self.raw.night_light_delta_pct)
        ndvi_norm = -self._normalize(self.raw.ndvi_delta_pct)  # Inverted
        
        weighted = (
            self.WEIGHTS["activity"] * activity_norm +
            self.WEIGHTS["night_light"] * night_light_norm +
            self.WEIGHTS["ndvi"] * ndvi_norm
        )
        
        # Clamp to [-1, 1] (should already be bounded, but defensive)
        return max(-1.0, min(1.0, weighted))
    
    @property
    def score(self) -> float:
        return self._score
    
    @property
    def confidence(self) -> float:
        return self.raw.confidence


class NewsSignal:
    """
    Transforms raw news/sentiment data into a normalized score.
    
    Output: news_score in [-1, +1]
        -1 = extremely bearish narrative (panic, doom)
        +1 = extremely bullish narrative (hype, euphoria)
         0 = neutral / balanced coverage
    
    The score is sentiment modified by credibility factors:
    - Low source diversity reduces magnitude (echo chamber = less reliable)
    - Extreme hype with low diversity is especially suspect
    
    Formula:
        diversity_factor = 0.5 + 0.5 * source_diversity  # [0.5, 1.0]
        news_score = sentiment_score * diversity_factor
    
    Hype intensity is NOT used in the score itself (that's the point—
    it's a meta-signal about the reliability of the narrative).
    """
    
    def __init__(self, raw: NewsRaw):
        self.raw = raw
        self._score = self._compute_score()
    
    def _compute_score(self) -> float:
        """
        Sentiment adjusted by source credibility.
        
        Low diversity = potential manipulation = reduced magnitude.
        This is conservative: we trust consensus less when it's an echo chamber.
        """
        diversity_factor = 0.5 + 0.5 * self.raw.source_diversity
        score = self.raw.sentiment_score * diversity_factor
        return max(-1.0, min(1.0, score))
    
    @property
    def score(self) -> float:
        return self._score
    
    @property
    def hype_intensity(self) -> float:
        return self.raw.hype_intensity


AlertLevel = Literal["info", "warning", "critical"]


@dataclass
class Alert:
    level: AlertLevel
    title: str
    message: str
    
    def to_dict(self) -> dict:
        return {
            "level": self.level,
            "title": self.title,
            "message": self.message,
        }


class DivergenceAnalyzer:
    """
    Core IP: Divergence Score computation and alert generation.
    
    The Divergence Score quantifies how much physical reality (satellite)
    disagrees with narrative reality (news). High divergence suggests
    either mispricing or manipulation.
    
    FORMULA:
    ────────
    raw_gap = |satellite_score - news_score| / 2      # [0, 1]
    confidence_weight = satellite_confidence          # [0, 1]  
    hype_amplifier = 1 + (hype_intensity / 100) * α   # [1, 1+α]
    
    divergence = raw_gap × confidence_weight × hype_amplifier × 100
    
    WHERE:
    - α (HYPE_AMPLIFICATION) = 0.5, meaning max hype adds 50% to score
    
    INTUITION:
    ────────────
    1. raw_gap: Base disagreement. If sat=-1 and news=+1, gap=1 (maximum).
    
    2. confidence_weight: Low-confidence satellite data = uncertain divergence.
       We don't want to alert on noisy measurements.
    
    3. hype_amplifier: High hype + high divergence is the danger zone.
       Coordinated narrative pushing against physical reality = red flag.
    
    The score ranges [0, 100] where:
    - 0-30: Signals aligned (normal)
    - 30-60: Moderate divergence (worth monitoring)
    - 60-80: High divergence (potential opportunity/risk)
    - 80-100: Extreme divergence (likely manipulation or major mispricing)
    """
    
    HYPE_AMPLIFICATION = 0.5  # Max hype adds 50% to divergence score
    
    # Thresholds (tunable based on backtesting)
    THRESHOLD_LOW = 30
    THRESHOLD_MEDIUM = 55
    THRESHOLD_HIGH = 75
    
    def __init__(self, sat: SatelliteSignal, news: NewsSignal):
        self.sat = sat
        self.news = news
        self._divergence = self._compute_divergence()
        self._alerts = self._generate_alerts()
    
    def _compute_divergence(self) -> float:
        """
        Compute divergence score with confidence weighting and hype amplification.
        """
        # Base disagreement: absolute difference normalized to [0, 1]
        raw_gap = abs(self.sat.score - self.news.score) / 2.0
        
        # Weight by satellite confidence (news confidence could be added too)
        confidence_weight = self.sat.confidence
        
        # Amplify when hype is high (narrative is being pushed hard)
        hype_amplifier = 1.0 + (self.news.hype_intensity / 100.0) * self.HYPE_AMPLIFICATION
        
        # Final score in [0, 100]
        divergence = raw_gap * confidence_weight * hype_amplifier * 100.0
        
        return min(100.0, divergence)  # Cap at 100
    
    def _generate_alerts(self) -> list[Alert]:
        """
        Generate alerts based on divergence regime and signal directions.
        
        Key patterns:
        1. HYPE DIVERGENCE: Bullish news + Bearish physical = potential bubble/manipulation
        2. PANIC DIVERGENCE: Bearish news + Bullish physical = potential buying opportunity
        3. MAGNITUDE MISMATCH: Same direction but very different magnitudes
        """
        alerts = []
        div = self._divergence
        sat_score = self.sat.score
        news_score = self.news.score
        hype = self.news.hype_intensity
        
        # Check signal directions
        sat_bullish = sat_score > 0.1
        sat_bearish = sat_score < -0.1
        news_bullish = news_score > 0.1
        news_bearish = news_score < -0.1
        
        if div >= self.THRESHOLD_HIGH:
            if news_bullish and sat_bearish:
                alerts.append(Alert(
                    level="critical",
                    title="Hype Divergence Detected",
                    message=f"Bullish narrative (news: {news_score:+.2f}) contradicts physical slowdown (sat: {sat_score:+.2f}). "
                            f"Hype intensity at {hype:.0f}%. High risk of narrative-driven mispricing."
                ))
            elif news_bearish and sat_bullish:
                alerts.append(Alert(
                    level="critical", 
                    title="Panic Divergence Detected",
                    message=f"Bearish narrative (news: {news_score:+.2f}) contradicts physical expansion (sat: {sat_score:+.2f}). "
                            f"Potential overreaction—physical activity remains strong."
                ))
            else:
                alerts.append(Alert(
                    level="warning",
                    title="Extreme Magnitude Mismatch",
                    message=f"Signals point same direction but diverge significantly. "
                            f"Satellite: {sat_score:+.2f}, News: {news_score:+.2f}. Investigate data quality."
                ))
        
        elif div >= self.THRESHOLD_MEDIUM:
            alerts.append(Alert(
                level="warning",
                title="Elevated Divergence",
                message=f"Moderate disagreement between physical ({sat_score:+.2f}) and narrative ({news_score:+.2f}) signals. "
                        f"Monitor for trend confirmation."
            ))
        
        elif div >= self.THRESHOLD_LOW:
            alerts.append(Alert(
                level="info",
                title="Minor Divergence",
                message=f"Small gap between satellite ({sat_score:+.2f}) and news ({news_score:+.2f}) signals. Within normal range."
            ))
        
        else:
            alerts.append(Alert(
                level="info",
                title="Signals Aligned",
                message=f"Physical activity ({sat_score:+.2f}) and narrative ({news_score:+.2f}) are in agreement. "
                        f"No divergence detected."
            ))
        
        # Additional hype warning
        if hype >= 70 and div >= self.THRESHOLD_LOW:
            alerts.append(Alert(
                level="warning",
                title="High Hype Intensity",
                message=f"News hype at {hype:.0f}% suggests potential coordinated narrative or viral spread. "
                        f"Treat sentiment signals with caution."
            ))
        
        return alerts
    
    @property
    def divergence_score(self) -> float:
        return self._divergence
    
    @property
    def alerts(self) -> list[Alert]:
        return self._alerts

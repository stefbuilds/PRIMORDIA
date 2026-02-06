"""
Time-Series Simulation Engine
=============================

Generates deterministic, reproducible time series for each region with:
- Region-specific baselines and volatility
- Weekly seasonality (weekends differ)
- Event regimes that alter signal behavior
- Realistic noise and trend persistence
- Confidence modeling

The engine is seeded by region_id + base_date for full reproducibility.

Future: This module will be replaced by real data pipelines:
- Satellite signals → GEE + Vertex AI inference
- News signals → NewsAPI + NLP sentiment pipeline
- Regimes → ML-detected from signal patterns
"""

import math
import random
from dataclasses import dataclass, field
from datetime import date, timedelta
from enum import Enum
from typing import Optional

from .config import get_config, RegionConfig


class RegimeType(str, Enum):
    """
    Event regimes that affect satellite and news signals differently.
    
    Each regime represents a market condition that creates divergence:
    - HYPE_PUMP: Narrative ahead of reality (bubble risk)
    - SUPPLY_SHOCK: Physical disruption (news catches up)
    - PANIC_SELL: Narrative behind reality (opportunity)
    - REAL_GROWTH: Aligned expansion (trend continuation)
    - MEAN_REVERSION: Disagreement resolving (normalization)
    """
    HYPE_PUMP = "HYPE_PUMP"
    SUPPLY_SHOCK = "SUPPLY_SHOCK"
    PANIC_SELL = "PANIC_SELL"
    REAL_GROWTH = "REAL_GROWTH"
    MEAN_REVERSION = "MEAN_REVERSION"


@dataclass
class Regime:
    """An event regime affecting a time window."""
    type: RegimeType
    start_day: int      # Day offset from start of simulation
    duration: int       # Number of days
    intensity: float    # 0-1 strength of the regime effect
    
    def is_active(self, day: int) -> bool:
        return self.start_day <= day < self.start_day + self.duration
    
    def progress(self, day: int) -> float:
        """How far through the regime (0-1)."""
        if not self.is_active(day):
            return 0.0
        return (day - self.start_day) / self.duration


@dataclass
class SatelliteRaw:
    """Raw satellite signal data."""
    proxy_type: str
    activity_delta_pct: float
    baseline_window_days: int
    anomaly_strength: float
    confidence: float
    night_light_delta_pct: float
    ndvi_delta_pct: float
    
    def to_dict(self) -> dict:
        return {
            "proxy_type": self.proxy_type,
            "activity_delta_pct": round(self.activity_delta_pct, 1),
            "baseline_window_days": self.baseline_window_days,
            "anomaly_strength": round(self.anomaly_strength, 2),
            "confidence": round(self.confidence, 2),
            "night_light_delta_pct": round(self.night_light_delta_pct, 1),
            "ndvi_delta_pct": round(self.ndvi_delta_pct, 1),
        }


@dataclass
class Headline:
    """A generated news headline."""
    title: str
    source: str
    date: str
    sentiment: float
    
    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "source": self.source,
            "date": self.date,
            "sentiment": round(self.sentiment, 2),
        }


@dataclass
class NewsRaw:
    """Raw news signal data."""
    sentiment_score: float
    hype_intensity: float
    headline_volume: int
    duplicate_ratio: float
    pump_lexicon_rate: float
    source_diversity: float
    confidence: float
    top_headlines: list[Headline] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "sentiment_score": round(self.sentiment_score, 3),
            "hype_intensity": round(self.hype_intensity, 1),
            "headline_volume": self.headline_volume,
            "duplicate_ratio": round(self.duplicate_ratio, 2),
            "pump_lexicon_rate": round(self.pump_lexicon_rate, 2),
            "source_diversity": round(self.source_diversity, 2),
            "confidence": round(self.confidence, 2),
            "top_headlines": [h.to_dict() for h in self.top_headlines],
        }


@dataclass
class SimulationDay:
    """Complete simulation output for a single day."""
    date: date
    day_offset: int
    
    # Normalized scores
    satellite_score: float      # [-1, 1]
    news_score: float           # [-1, 1]
    divergence_score: float     # [0, 100]
    
    # Raw data
    satellite_raw: SatelliteRaw
    news_raw: NewsRaw
    
    # Regime info
    active_regime: Optional[Regime]
    
    def to_dict(self) -> dict:
        return {
            "date": self.date.isoformat(),
            "satellite_score": round(self.satellite_score, 3),
            "news_score": round(self.news_score, 3),
            "divergence_score": round(self.divergence_score, 1),
            "satellite_raw": self.satellite_raw.to_dict(),
            "news_raw": self.news_raw.to_dict(),
            "regime": {
                "type": self.active_regime.type.value,
                "progress": round(self.active_regime.progress(self.day_offset), 2),
                "intensity": round(self.active_regime.intensity, 2),
            } if self.active_regime else None,
        }


class RegionSimulator:
    """
    Deterministic time-series simulator for a region.
    
    Generates 30 days of realistic signal data with:
    - Region-specific characteristics
    - Weekly seasonality
    - 1-2 event regimes per window
    - Correlated noise with trend persistence
    """
    
    def __init__(self, region_id: str, base_date: Optional[date] = None):
        self.region_id = region_id
        self.config = get_config(region_id)
        self.base_date = base_date or date.today()
        
        # Deterministic seed from region + date
        seed_str = f"{region_id}:{self.base_date.isoformat()}"
        self.seed = hash(seed_str) & 0xFFFFFFFF
        self.rng = random.Random(self.seed)
        
        # Pre-generate regimes for the window
        self.regimes = self._generate_regimes()
        
        # Track state for correlated generation
        self._sat_state = self.config.sat_baseline
        self._news_state = self.config.news_sentiment_bias
    
    def _generate_regimes(self) -> list[Regime]:
        """Generate 1-2 event regimes for the 30-day window."""
        regimes = []
        
        # Determine number of regimes (1-2)
        n_regimes = 1 if self.rng.random() < 0.6 else 2
        
        # Select regime types based on region weights
        weights = self.config.regime_weights
        types = list(weights.keys())
        probs = [weights[t] for t in types]
        
        used_days = set()
        
        for i in range(n_regimes):
            # Pick regime type
            regime_type = RegimeType(self.rng.choices(types, probs)[0])
            
            # Pick duration (5-12 days depending on type)
            if regime_type == RegimeType.SUPPLY_SHOCK:
                duration = self.rng.randint(7, 12)
            elif regime_type == RegimeType.MEAN_REVERSION:
                duration = self.rng.randint(6, 10)
            else:
                duration = self.rng.randint(5, 9)
            
            # Pick start day - first regime can be early, second regime should be later
            # to increase chance of having an active regime on "today" (day 29)
            attempts = 0
            while attempts < 20:
                if i == 0:
                    # First regime: can be anywhere but prefer middle
                    start = self.rng.randint(5, 20)
                else:
                    # Second regime: prefer later in window (can extend to day 29)
                    start = self.rng.randint(18, 30 - duration)
                
                days_needed = set(range(start, start + duration))
                if not days_needed & used_days:
                    used_days |= days_needed
                    break
                attempts += 1
            else:
                continue  # Skip if can't find non-overlapping slot
            
            # Intensity
            intensity = 0.5 + self.rng.random() * 0.5  # 0.5 - 1.0
            
            regimes.append(Regime(
                type=regime_type,
                start_day=start,
                duration=duration,
                intensity=intensity,
            ))
        
        return sorted(regimes, key=lambda r: r.start_day)
    
    def _get_active_regime(self, day: int) -> Optional[Regime]:
        """Get the regime active on a given day, if any."""
        for regime in self.regimes:
            if regime.is_active(day):
                return regime
        return None
    
    def _regime_satellite_effect(self, regime: Optional[Regime], progress: float) -> float:
        """Calculate satellite signal modifier from regime."""
        if not regime:
            return 0.0
        
        intensity = regime.intensity
        
        if regime.type == RegimeType.HYPE_PUMP:
            # Satellite flat or slightly down during hype
            return -0.15 * intensity
        
        elif regime.type == RegimeType.SUPPLY_SHOCK:
            # Sharp initial drop, then gradual recovery
            if progress < 0.3:
                return -0.6 * intensity * (1 - progress / 0.3)
            else:
                recovery = (progress - 0.3) / 0.7
                return -0.6 * intensity * (1 - recovery * 0.7)
        
        elif regime.type == RegimeType.PANIC_SELL:
            # Satellite flat or slightly up (reality not as bad)
            return 0.1 * intensity
        
        elif regime.type == RegimeType.REAL_GROWTH:
            # Genuine expansion
            return 0.35 * intensity
        
        elif regime.type == RegimeType.MEAN_REVERSION:
            # Gradual normalization toward baseline
            return -self._sat_state * 0.3 * progress * intensity
        
        return 0.0
    
    def _regime_news_effect(self, regime: Optional[Regime], progress: float) -> tuple[float, float]:
        """Calculate news signal modifier and hype boost from regime."""
        if not regime:
            return 0.0, 0.0
        
        intensity = regime.intensity
        
        if regime.type == RegimeType.HYPE_PUMP:
            # Very bullish news, high hype
            sentiment_mod = 0.5 * intensity
            hype_boost = 40 * intensity
            return sentiment_mod, hype_boost
        
        elif regime.type == RegimeType.SUPPLY_SHOCK:
            # News lags reality - initially muted, then catches up
            if progress < 0.25:
                return -0.1 * intensity, 10 * intensity
            else:
                catch_up = min(1.0, (progress - 0.25) / 0.5)
                return -0.45 * intensity * catch_up, 30 * intensity * catch_up
        
        elif regime.type == RegimeType.PANIC_SELL:
            # Very bearish news, moderate hype
            return -0.55 * intensity, 25 * intensity
        
        elif regime.type == RegimeType.REAL_GROWTH:
            # Moderately positive, aligned with satellite
            return 0.25 * intensity, 5 * intensity
        
        elif regime.type == RegimeType.MEAN_REVERSION:
            # News converges toward neutral
            return -self._news_state * 0.4 * progress * intensity, -10 * intensity
        
        return 0.0, 0.0
    
    def _generate_satellite(self, day: int, day_date: date) -> tuple[float, SatelliteRaw]:
        """Generate satellite signal for a day."""
        config = self.config
        
        # Weekend effect
        is_weekend = day_date.weekday() >= 5
        weekend_mult = config.sat_weekend_effect if is_weekend else 1.0
        
        # Base signal with trend persistence (AR(1) process)
        noise = self.rng.gauss(0, config.sat_volatility)
        self._sat_state = (
            config.sat_trend_persistence * self._sat_state +
            (1 - config.sat_trend_persistence) * config.sat_baseline +
            noise
        )
        
        # Apply regime effect
        regime = self._get_active_regime(day)
        regime_effect = self._regime_satellite_effect(
            regime, regime.progress(day) if regime else 0
        )
        
        # Combine
        raw_score = (self._sat_state + regime_effect) * weekend_mult
        
        # Clamp to [-1, 1]
        score = max(-1.0, min(1.0, raw_score))
        
        # Generate raw data
        activity_delta = score * 60  # Map [-1,1] to roughly [-60%, +60%]
        night_light_delta = score * 40 + self.rng.gauss(0, 5)
        ndvi_delta = -score * 20 + self.rng.gauss(0, 3)  # Inverse relationship
        
        # Confidence: lower when volatile or trend ambiguous
        trend_clarity = abs(score) / 1.0  # Higher score = clearer trend
        volatility_penalty = min(0.3, abs(noise) / config.sat_volatility * 0.15)
        confidence = 0.6 + 0.35 * trend_clarity - volatility_penalty
        confidence = max(0.3, min(0.95, confidence + self.rng.gauss(0, 0.05)))
        
        # Anomaly strength (how unusual is this reading)
        anomaly = abs(score - config.sat_baseline) / 0.5
        anomaly = min(1.0, anomaly)
        
        raw = SatelliteRaw(
            proxy_type=config.proxy_type,
            activity_delta_pct=activity_delta,
            baseline_window_days=30,
            anomaly_strength=anomaly,
            confidence=confidence,
            night_light_delta_pct=night_light_delta,
            ndvi_delta_pct=ndvi_delta,
        )
        
        return score, raw
    
    def _generate_news(self, day: int, day_date: date, sat_score: float) -> tuple[float, NewsRaw]:
        """Generate news signal for a day."""
        config = self.config
        
        # Base sentiment with persistence
        noise = self.rng.gauss(0, 0.12)
        self._news_state = (
            0.7 * self._news_state +
            0.3 * config.news_sentiment_bias +
            noise
        )
        
        # Apply regime effect
        regime = self._get_active_regime(day)
        sentiment_mod, hype_boost = self._regime_news_effect(
            regime, regime.progress(day) if regime else 0
        )
        
        raw_sentiment = self._news_state + sentiment_mod
        sentiment = max(-1.0, min(1.0, raw_sentiment))
        
        # Volume: baseline + regime boost + random spike
        volume_mult = 1.0 + (hype_boost / 100)
        spike = 1.5 if self.rng.random() < 0.1 else 1.0  # 10% chance of spike
        volume = int(config.news_volume_baseline * volume_mult * spike)
        volume = max(10, min(300, volume + self.rng.randint(-20, 20)))
        
        # Hype intensity components
        base_hype = config.news_hype_tendency * 40
        duplicate_ratio = 0.1 + config.news_hype_tendency * 0.3 + self.rng.random() * 0.2
        pump_lexicon = 0.05 + (max(0, sentiment) * 0.3) + self.rng.random() * 0.1
        
        if regime and regime.type == RegimeType.HYPE_PUMP:
            duplicate_ratio += 0.2 * regime.intensity
            pump_lexicon += 0.25 * regime.intensity
        
        duplicate_ratio = min(0.8, duplicate_ratio)
        pump_lexicon = min(0.6, pump_lexicon)
        
        # Compute hype intensity [0, 100]
        hype_intensity = (
            base_hype +
            hype_boost +
            duplicate_ratio * 30 +
            pump_lexicon * 20 +
            (volume / config.news_volume_baseline - 1) * 15
        )
        hype_intensity = max(0, min(100, hype_intensity))
        
        # Source diversity
        diversity = config.news_diversity_baseline
        if regime and regime.type == RegimeType.HYPE_PUMP:
            diversity -= 0.2 * regime.intensity  # Hype = echo chamber
        diversity = max(0.2, min(0.95, diversity + self.rng.gauss(0, 0.05)))
        
        # Adjusted score based on diversity
        diversity_factor = 0.5 + 0.5 * diversity
        adjusted_score = sentiment * diversity_factor
        
        # Confidence: based on volume and diversity
        volume_factor = min(1.0, volume / 100)
        confidence = 0.4 + 0.3 * volume_factor + 0.25 * diversity
        confidence = max(0.3, min(0.95, confidence + self.rng.gauss(0, 0.05)))
        
        # Generate headlines (imported separately to keep this file focused)
        from .headlines import HeadlineGenerator
        headline_gen = HeadlineGenerator(self.rng, config.name)
        headlines = headline_gen.generate(
            day_date=day_date,
            sentiment=sentiment,
            regime=regime,
            count=5,
        )
        
        raw = NewsRaw(
            sentiment_score=adjusted_score,
            hype_intensity=hype_intensity,
            headline_volume=volume,
            duplicate_ratio=duplicate_ratio,
            pump_lexicon_rate=pump_lexicon,
            source_diversity=diversity,
            confidence=confidence,
            top_headlines=headlines,
        )
        
        return adjusted_score, raw
    
    def _compute_divergence(
        self,
        sat_score: float,
        news_score: float,
        sat_confidence: float,
        news_confidence: float,
        hype_intensity: float,
    ) -> float:
        """
        Compute divergence score [0, 100].
        
        Formula:
            raw_gap = |sat - news| / 2                    # [0, 1]
            confidence = (sat_conf + news_conf) / 2       # [0, 1]
            hype_amp = 1 + (hype / 100) * 0.5            # [1, 1.5]
            
            divergence = raw_gap * confidence * hype_amp * 100
        
        Properties:
        - Monotonic in disagreement (larger gap = higher score)
        - Weighted by confidence (uncertain signals = lower divergence)
        - Amplified by hype (high hype + disagreement = danger)
        - Range [0, 100]
        """
        raw_gap = abs(sat_score - news_score) / 2.0
        avg_confidence = (sat_confidence + news_confidence) / 2.0
        hype_amplifier = 1.0 + (hype_intensity / 100.0) * 0.5
        
        divergence = raw_gap * avg_confidence * hype_amplifier * 100.0
        return min(100.0, divergence)
    
    def generate_day(self, day_offset: int) -> SimulationDay:
        """Generate simulation for a single day."""
        day_date = self.base_date - timedelta(days=29 - day_offset)
        
        sat_score, sat_raw = self._generate_satellite(day_offset, day_date)
        news_score, news_raw = self._generate_news(day_offset, day_date, sat_score)
        
        divergence = self._compute_divergence(
            sat_score,
            news_score,
            sat_raw.confidence,
            news_raw.confidence,
            news_raw.hype_intensity,
        )
        
        return SimulationDay(
            date=day_date,
            day_offset=day_offset,
            satellite_score=sat_score,
            news_score=news_score,
            divergence_score=divergence,
            satellite_raw=sat_raw,
            news_raw=news_raw,
            active_regime=self._get_active_regime(day_offset),
        )
    
    def generate_series(self, n_days: int = 30) -> list[SimulationDay]:
        """Generate full time series."""
        # Reset state for reproducibility
        self.rng = random.Random(self.seed)
        self._sat_state = self.config.sat_baseline
        self._news_state = self.config.news_sentiment_bias
        
        return [self.generate_day(d) for d in range(n_days)]
    
    def get_regimes_info(self) -> list[dict]:
        """Get regime metadata for the simulation window."""
        return [
            {
                "type": r.type.value,
                "start_day": r.start_day,
                "start_date": (self.base_date - timedelta(days=29 - r.start_day)).isoformat(),
                "end_date": (self.base_date - timedelta(days=29 - r.start_day - r.duration + 1)).isoformat(),
                "duration": r.duration,
                "intensity": round(r.intensity, 2),
            }
            for r in self.regimes
        ]

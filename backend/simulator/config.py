"""
Region Configuration for Simulation
====================================

Each region has baseline characteristics that affect:
- Satellite signal behavior (proxy type, baseline activity, volatility)
- News signal behavior (volume, sentiment bias, hype tendency)
- Typical regimes (some regions more prone to certain events)

These configs map to future real data sources:
- proxy_type → which GEE/Vertex models to prioritize
- news_volume_baseline → expected NewsAPI hit rate
- regime_weights → historical event frequency
"""

from dataclasses import dataclass
from typing import Literal

ProxyType = Literal["ports", "night_lights", "parking_lots", "oil_storage", "manufacturing"]


@dataclass
class RegionConfig:
    """Configuration defining a region's simulation characteristics."""
    
    region_id: str
    name: str
    
    # Satellite characteristics
    proxy_type: ProxyType
    sat_baseline: float          # Mean activity level [-1, 1]
    sat_volatility: float        # Daily noise std dev
    sat_weekend_effect: float    # Multiplier for weekend activity (0.5 = 50% of weekday)
    sat_trend_persistence: float # AR(1) coefficient for trend momentum
    
    # News characteristics
    news_volume_baseline: int    # Expected headlines/day
    news_sentiment_bias: float   # Regional sentiment tendency [-0.3, 0.3]
    news_hype_tendency: float    # How prone to viral/coordinated coverage [0, 1]
    news_diversity_baseline: float  # Source diversity baseline [0.3, 0.9]
    
    # Regime tendencies (weights for random regime selection)
    regime_weights: dict[str, float]


REGION_CONFIGS: dict[str, RegionConfig] = {
    
    "shanghai": RegionConfig(
        region_id="shanghai",
        name="Shanghai, China",
        proxy_type="ports",
        sat_baseline=0.1,           # Slightly above neutral
        sat_volatility=0.08,
        sat_weekend_effect=0.7,     # Some weekend slowdown
        sat_trend_persistence=0.6,
        news_volume_baseline=120,
        news_sentiment_bias=0.05,   # Slight positive bias
        news_hype_tendency=0.7,     # High hype tendency
        news_diversity_baseline=0.4, # Lower diversity (state media)
        regime_weights={
            "HYPE_PUMP": 0.35,
            "SUPPLY_SHOCK": 0.20,
            "PANIC_SELL": 0.15,
            "REAL_GROWTH": 0.20,
            "MEAN_REVERSION": 0.10,
        },
    ),
    
    "shenzhen": RegionConfig(
        region_id="shenzhen",
        name="Shenzhen, China",
        proxy_type="manufacturing",
        sat_baseline=0.15,
        sat_volatility=0.10,
        sat_weekend_effect=0.6,
        sat_trend_persistence=0.7,
        news_volume_baseline=90,
        news_sentiment_bias=-0.05,
        news_hype_tendency=0.5,
        news_diversity_baseline=0.45,
        regime_weights={
            "HYPE_PUMP": 0.20,
            "SUPPLY_SHOCK": 0.25,
            "PANIC_SELL": 0.25,
            "REAL_GROWTH": 0.20,
            "MEAN_REVERSION": 0.10,
        },
    ),
    
    "suez": RegionConfig(
        region_id="suez",
        name="Suez Canal Zone",
        proxy_type="ports",
        sat_baseline=-0.1,          # Below baseline due to disruptions
        sat_volatility=0.15,        # High volatility
        sat_weekend_effect=0.9,     # Shipping doesn't stop
        sat_trend_persistence=0.8,
        news_volume_baseline=150,   # High news interest
        news_sentiment_bias=-0.15,  # Negative bias (conflict zone)
        news_hype_tendency=0.6,
        news_diversity_baseline=0.7,
        regime_weights={
            "HYPE_PUMP": 0.05,
            "SUPPLY_SHOCK": 0.45,
            "PANIC_SELL": 0.25,
            "REAL_GROWTH": 0.10,
            "MEAN_REVERSION": 0.15,
        },
    ),
    
    "la_port": RegionConfig(
        region_id="la_port",
        name="Port of Los Angeles",
        proxy_type="ports",
        sat_baseline=0.05,
        sat_volatility=0.06,
        sat_weekend_effect=0.75,
        sat_trend_persistence=0.5,
        news_volume_baseline=80,
        news_sentiment_bias=0.10,
        news_hype_tendency=0.3,
        news_diversity_baseline=0.8,
        regime_weights={
            "HYPE_PUMP": 0.15,
            "SUPPLY_SHOCK": 0.20,
            "PANIC_SELL": 0.15,
            "REAL_GROWTH": 0.35,
            "MEAN_REVERSION": 0.15,
        },
    ),
    
    "rotterdam": RegionConfig(
        region_id="rotterdam",
        name="Rotterdam, Netherlands",
        proxy_type="oil_storage",
        sat_baseline=0.0,
        sat_volatility=0.07,
        sat_weekend_effect=0.8,
        sat_trend_persistence=0.55,
        news_volume_baseline=70,
        news_sentiment_bias=0.08,
        news_hype_tendency=0.25,
        news_diversity_baseline=0.85,
        regime_weights={
            "HYPE_PUMP": 0.20,
            "SUPPLY_SHOCK": 0.15,
            "PANIC_SELL": 0.10,
            "REAL_GROWTH": 0.40,
            "MEAN_REVERSION": 0.15,
        },
    ),
}


def get_config(region_id: str) -> RegionConfig:
    """Get region config, with fallback to shanghai if not found."""
    return REGION_CONFIGS.get(region_id, REGION_CONFIGS["shanghai"])

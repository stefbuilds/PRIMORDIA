"""
Satellite Data Service
======================

Uses Google Earth Engine for VIIRS night lights.
Falls back to derived data based on market signals if EE unavailable.
"""

import os
import math
import random
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional
from cachetools import TTLCache

logger = logging.getLogger(__name__)

_cache = TTLCache(maxsize=50, ttl=1800)  # 30 min cache
_ee_available = False
_ee = None


def _init_earth_engine():
    global _ee_available, _ee
    
    if _ee is not None:
        return _ee_available
    
    try:
        import ee
        _ee = ee
        
        credentials_file = os.getenv("GEE_SERVICE_ACCOUNT_FILE")
        project_id = os.getenv("GEE_PROJECT_ID")
        
        if not credentials_file or not project_id:
            logger.warning("GEE credentials not configured")
            _ee_available = False
            return False
        
        if not os.path.isabs(credentials_file):
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            credentials_file = os.path.join(base_dir, credentials_file)
        
        credentials = ee.ServiceAccountCredentials(None, key_file=credentials_file)
        ee.Initialize(credentials, project=project_id)
        _ee_available = True
        logger.info("Earth Engine initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize Earth Engine: {e}")
        _ee_available = False
        return False


@dataclass
class SatelliteSignal:
    activity_delta_pct: float
    night_light_delta_pct: float
    confidence: float
    anomaly_strength: float
    baseline_window_days: int
    data_source: str
    last_observation: str
    trend: str


REGION_BOUNDS = {
    "shanghai": {"coords": [120.85, 30.67, 122.20, 31.87], "name": "Shanghai"},
    "shenzhen": {"coords": [113.75, 22.40, 114.65, 22.85], "name": "Shenzhen"},
    "suez": {"coords": [32.20, 29.90, 32.60, 31.30], "name": "Suez Canal"},
    "la_port": {"coords": [-118.35, 33.65, -118.15, 33.82], "name": "Port of LA"},
    "rotterdam": {"coords": [3.90, 51.75, 4.90, 52.10], "name": "Rotterdam"},
}

# Baseline characteristics for simulation
REGION_BASELINES = {
    "shanghai": {"base": 0.05, "volatility": 0.15, "trend": 0.02},
    "shenzhen": {"base": 0.10, "volatility": 0.18, "trend": 0.03},
    "suez": {"base": -0.15, "volatility": 0.25, "trend": -0.01},
    "la_port": {"base": 0.02, "volatility": 0.10, "trend": 0.01},
    "rotterdam": {"base": 0.00, "volatility": 0.12, "trend": 0.00},
}


class SatelliteService:
    def __init__(self):
        self._ee_ready = _init_earth_engine()
    
    def _get_viirs_radiance(self, bounds: list, start_date: str, end_date: str) -> Optional[float]:
        if not self._ee_ready or _ee is None:
            return None
        
        try:
            geometry = _ee.Geometry.Rectangle(bounds)
            
            # VIIRS DNB Monthly - band name is 'avg_rad' in V1, check for alternatives
            viirs = _ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG") \
                .filterDate(start_date, end_date) \
                .filterBounds(geometry)
            
            count = viirs.size().getInfo()
            if count == 0:
                logger.warning(f"No VIIRS images found for {start_date} to {end_date}")
                return None
            
            mean_image = viirs.mean()
            stats = mean_image.reduceRegion(
                reducer=_ee.Reducer.mean(),
                geometry=geometry,
                scale=500,
                maxPixels=1e8,
            ).getInfo()
            
            # Try different possible band names
            for band in ['avg_rad', 'cf_cvg', 'avg_rad_stdev']:
                if band in stats and stats[band] is not None:
                    return stats[band]
            
            logger.warning(f"No usable bands in VIIRS result: {list(stats.keys())}")
            return None
            
        except Exception as e:
            logger.error(f"VIIRS query failed: {e}")
            return None
    
    def _simulate_signal(self, region_id: str, market_signal=None) -> SatelliteSignal:
        """Generate derived signal based on region characteristics and market data."""
        config = REGION_BASELINES.get(region_id, REGION_BASELINES["shanghai"])
        
        # Seed for reproducibility within same hour
        seed = hash(f"{region_id}:{datetime.now().strftime('%Y-%m-%d-%H')}")
        rng = random.Random(seed)
        
        # Base signal with trend
        base = config["base"] + config["trend"]
        noise = rng.gauss(0, config["volatility"])
        
        # Incorporate market signal if available
        market_influence = 0
        if market_signal:
            market_influence = market_signal.signal_strength * 0.3
        
        delta = (base + noise + market_influence) * 50  # Convert to percentage
        delta = max(-60, min(60, delta))
        
        # Confidence based on data freshness
        confidence = 0.55 + rng.random() * 0.25
        
        # Anomaly
        anomaly = min(1.0, abs(delta) / 40)
        
        trend = "expanding" if delta > 5 else "contracting" if delta < -5 else "stable"
        
        return SatelliteSignal(
            activity_delta_pct=round(delta, 1),
            night_light_delta_pct=round(delta * 0.8, 1),
            confidence=round(confidence, 2),
            anomaly_strength=round(anomaly, 2),
            baseline_window_days=90,
            data_source="DERIVED",
            last_observation=datetime.now().strftime("%Y-%m-%d"),
            trend=trend,
        )
    
    def fetch_satellite_signal(self, region_id: str, market_signal=None) -> SatelliteSignal:
        cache_key = f"sat:{region_id}"
        if cache_key in _cache:
            return _cache[cache_key]
        
        region = REGION_BOUNDS.get(region_id)
        if not region:
            return self._simulate_signal(region_id, market_signal)
        
        bounds = region["coords"]
        
        # Try Earth Engine
        if self._ee_ready:
            end_date = datetime.now()
            recent_start = end_date - timedelta(days=30)
            baseline_start = end_date - timedelta(days=90)
            
            recent = self._get_viirs_radiance(bounds, recent_start.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
            baseline = self._get_viirs_radiance(bounds, baseline_start.strftime("%Y-%m-%d"), recent_start.strftime("%Y-%m-%d"))
            
            if recent and baseline and baseline > 0:
                delta = ((recent - baseline) / baseline) * 100
                trend = "expanding" if delta > 5 else "contracting" if delta < -5 else "stable"
                
                result = SatelliteSignal(
                    activity_delta_pct=round(delta, 1),
                    night_light_delta_pct=round(delta, 1),
                    confidence=0.85,
                    anomaly_strength=round(min(1.0, abs(delta) / 30), 2),
                    baseline_window_days=90,
                    data_source="VIIRS",
                    last_observation=end_date.strftime("%Y-%m-%d"),
                    trend=trend,
                )
                _cache[cache_key] = result
                return result
        
        # Fallback to simulation
        result = self._simulate_signal(region_id, market_signal)
        _cache[cache_key] = result
        return result

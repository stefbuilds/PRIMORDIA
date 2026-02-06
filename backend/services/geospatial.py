"""
Geospatial Service
==================

Provides:
1. Spatial Heterogeneity / Gradient Maps - pixel-level anomaly overlay
2. Proxy Sensor Fusion - fused physical activity index from multiple proxies

Uses Google Earth Engine when available, with deterministic mock fallback.

Proxies:
- Night Lights (VIIRS DNB)
- NDVI (Sentinel-2)
- SAR Backscatter (Sentinel-1)
"""

import os
import io
import math
import hashlib
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Optional, List, Tuple
from cachetools import TTLCache

import numpy as np
from PIL import Image
import httpx

logger = logging.getLogger(__name__)

_cache = TTLCache(maxsize=20, ttl=1800)  # 30 min cache
_ee_available = False
_ee = None


def _init_earth_engine():
    """Initialize Google Earth Engine if credentials available."""
    global _ee_available, _ee
    
    if _ee is not None:
        return _ee_available
    
    try:
        import ee
        _ee = ee
        
        credentials_file = os.getenv("GEE_SERVICE_ACCOUNT_FILE")
        project_id = os.getenv("GEE_PROJECT_ID")
        
        if not credentials_file or not project_id:
            logger.warning("GEE credentials not configured for geospatial service")
            _ee_available = False
            return False
        
        if not os.path.isabs(credentials_file):
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            credentials_file = os.path.join(base_dir, credentials_file)
        
        credentials = ee.ServiceAccountCredentials(None, key_file=credentials_file)
        ee.Initialize(credentials, project=project_id)
        _ee_available = True
        logger.info("Earth Engine initialized for geospatial service")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize Earth Engine for geospatial: {e}")
        _ee_available = False
        return False


# Region configurations
REGION_BOUNDS = {
    "shanghai": {"coords": [120.85, 30.67, 122.20, 31.87], "name": "Shanghai"},
    "shenzhen": {"coords": [113.75, 22.40, 114.65, 22.85], "name": "Shenzhen"},
    "suez": {"coords": [32.20, 29.90, 32.60, 31.30], "name": "Suez Canal"},
    "la_port": {"coords": [-118.35, 33.65, -118.15, 33.82], "name": "Port of LA"},
    "rotterdam": {"coords": [3.90, 51.75, 4.90, 52.10], "name": "Rotterdam"},
}

# Mock proxy characteristics per region (deterministic based on region_id)
# Used when GEE is unavailable
REGION_PROXY_PROFILES = {
    "shanghai": {
        "night_lights_bias": 0.15,
        "ndvi_bias": -0.05,
        "sar_bias": 0.10,
        "disagreement_factor": 0.3,
    },
    "shenzhen": {
        "night_lights_bias": 0.25,
        "ndvi_bias": -0.15,
        "sar_bias": 0.20,
        "disagreement_factor": 0.2,
    },
    "suez": {
        "night_lights_bias": -0.10,
        "ndvi_bias": -0.30,
        "sar_bias": 0.05,
        "disagreement_factor": 0.5,
    },
    "la_port": {
        "night_lights_bias": 0.10,
        "ndvi_bias": 0.05,
        "sar_bias": 0.08,
        "disagreement_factor": 0.15,
    },
    "rotterdam": {
        "night_lights_bias": 0.05,
        "ndvi_bias": 0.10,
        "sar_bias": 0.03,
        "disagreement_factor": 0.1,
    },
}


@dataclass
class ProxySignal:
    """Individual proxy signal data."""
    name: str
    value: float          # Normalized to [-1, +1]
    confidence: float     # [0, 1]
    raw_z_score: float    # Original z-score before normalization


@dataclass
class PhysicalFusion:
    """Fused physical activity index from multiple proxies."""
    fused_signal: float   # [-1, +1]
    agreement: float      # [0, 1] - how well proxies agree
    proxies: List[ProxySignal] = field(default_factory=list)


@dataclass
class SpatialStats:
    """Region-level spatial statistics."""
    mean_anomaly: float
    max_anomaly: float
    min_anomaly: float
    spatial_variance: float
    hotspot_fraction: float  # Fraction of pixels with |z| > 2


@dataclass
class OverlayLegend:
    """Legend metadata for the overlay."""
    min_val: float
    max_val: float
    unit: str
    description: str


@dataclass
class OverlayPayload:
    """Complete overlay payload for frontend."""
    type: str             # "image"
    url: str              # URL to serve the overlay PNG
    bbox: List[float]     # [west, south, east, north]
    legend: OverlayLegend


@dataclass
class GeospatialData:
    """Complete geospatial analysis result."""
    overlay: OverlayPayload
    spatial_stats: SpatialStats
    physical_fusion: PhysicalFusion
    is_simulated: bool


def _deterministic_seed(region_id: str, date_str: str = None) -> int:
    """Generate deterministic seed from region and date for reproducible mock data."""
    if date_str is None:
        date_str = datetime.now().strftime("%Y-%m-%d")
    seed_str = f"{region_id}:{date_str}"
    return int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)


def _normalize_to_range(value: float, min_val: float = -1.0, max_val: float = 1.0) -> float:
    """Normalize value to [-1, +1] using tanh-like clamping."""
    normalized = math.tanh(value / 2.0)
    return max(min_val, min(max_val, normalized))


def _generate_mock_anomaly_grid(region_id: str, size: int = 128) -> np.ndarray:
    """
    Generate a deterministic synthetic anomaly grid.
    
    Creates realistic-looking spatial patterns with:
    - Smooth gradients
    - Hotspots
    - Some noise
    
    Returns: 2D numpy array of z-scores
    """
    seed = _deterministic_seed(region_id)
    rng = np.random.RandomState(seed)
    
    x = np.linspace(0, 1, size)
    y = np.linspace(0, 1, size)
    xx, yy = np.meshgrid(x, y)
    
    profile = REGION_PROXY_PROFILES.get(region_id, REGION_PROXY_PROFILES["shanghai"])
    base_bias = profile["night_lights_bias"]
    
    base = (np.sin(xx * 3 + rng.random() * 2) * 0.3 + 
            np.cos(yy * 2 + rng.random() * 2) * 0.3 + 
            base_bias)
    
    n_hotspots = rng.randint(2, 5)
    for _ in range(n_hotspots):
        cx, cy = rng.random(2)
        intensity = rng.uniform(0.5, 1.5) * (1 if rng.random() > 0.3 else -1)
        sigma = rng.uniform(0.1, 0.25)
        hotspot = intensity * np.exp(-((xx - cx)**2 + (yy - cy)**2) / (2 * sigma**2))
        base += hotspot
    
    noise = rng.randn(size, size) * 0.3
    anomaly = base + noise
    anomaly = np.clip(anomaly * 2, -3, 3)
    
    return anomaly


def _anomaly_grid_to_png(anomaly: np.ndarray) -> bytes:
    """
    Convert anomaly z-score grid to colored PNG image.
    
    Color scheme:
    - Blue: negative anomaly (below baseline)
    - White/Gray: near baseline
    - Red/Orange: positive anomaly (above baseline)
    """
    normalized = (anomaly + 3) / 6.0
    normalized = np.clip(normalized, 0, 1)
    
    height, width = anomaly.shape
    rgb = np.zeros((height, width, 4), dtype=np.uint8)
    
    for i in range(height):
        for j in range(width):
            val = normalized[i, j]
            if val < 0.5:
                t = val * 2
                r = int(50 + t * 205)
                g = int(50 + t * 205)
                b = int(200 + t * 55)
            else:
                t = (val - 0.5) * 2
                r = 255
                g = int(255 - t * 180)
                b = int(255 - t * 200)
            
            intensity = abs(anomaly[i, j])
            alpha = int(min(255, 80 + intensity * 50))
            
            rgb[i, j] = [r, g, b, alpha]
    
    img = Image.fromarray(rgb, mode='RGBA')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG', optimize=True)
    return buffer.getvalue()


def _compute_spatial_stats(anomaly: np.ndarray) -> SpatialStats:
    """Compute region-level statistics from anomaly grid."""
    return SpatialStats(
        mean_anomaly=float(np.mean(anomaly)),
        max_anomaly=float(np.max(anomaly)),
        min_anomaly=float(np.min(anomaly)),
        spatial_variance=float(np.var(anomaly)),
        hotspot_fraction=float(np.mean(np.abs(anomaly) > 2.0)),
    )


def _compute_mock_proxy_signals(region_id: str) -> List[ProxySignal]:
    """
    Generate deterministic mock proxy signals for a region.
    
    Creates night_lights, ndvi, and sar proxies that sometimes disagree
    based on the region profile.
    """
    seed = _deterministic_seed(region_id)
    rng = np.random.RandomState(seed)
    
    profile = REGION_PROXY_PROFILES.get(region_id, REGION_PROXY_PROFILES["shanghai"])
    
    # Base signal (shared component)
    base_signal = rng.uniform(-0.5, 0.5)
    
    # Night lights signal
    nl_noise = rng.randn() * profile["disagreement_factor"]
    nl_z = base_signal + profile["night_lights_bias"] + nl_noise
    nl_value = _normalize_to_range(nl_z)
    nl_confidence = 0.85 - abs(nl_noise) * 0.2
    
    # NDVI signal  
    ndvi_noise = rng.randn() * profile["disagreement_factor"]
    ndvi_z = base_signal + profile["ndvi_bias"] + ndvi_noise
    ndvi_value = _normalize_to_range(ndvi_z)
    ndvi_confidence = 0.80 - abs(ndvi_noise) * 0.2
    if region_id == "suez":
        ndvi_confidence *= 0.7  # Desert has lower vegetation confidence
    
    # SAR backscatter signal
    sar_noise = rng.randn() * profile["disagreement_factor"] * 0.8  # SAR slightly more stable
    sar_z = base_signal + profile.get("sar_bias", 0.0) + sar_noise
    sar_value = _normalize_to_range(sar_z)
    sar_confidence = 0.82 - abs(sar_noise) * 0.15  # SAR is weather-independent
    
    return [
        ProxySignal(
            name="night_lights",
            value=round(nl_value, 3),
            confidence=round(max(0.3, min(1.0, nl_confidence)), 2),
            raw_z_score=round(nl_z, 3),
        ),
        ProxySignal(
            name="ndvi",
            value=round(ndvi_value, 3),
            confidence=round(max(0.3, min(1.0, ndvi_confidence)), 2),
            raw_z_score=round(ndvi_z, 3),
        ),
        ProxySignal(
            name="sar_backscatter",
            value=round(sar_value, 3),
            confidence=round(max(0.3, min(1.0, sar_confidence)), 2),
            raw_z_score=round(sar_z, 3),
        ),
    ]


def _compute_fusion(proxies: List[ProxySignal]) -> PhysicalFusion:
    """
    Compute fused signal and agreement from proxy signals.
    
    fused_signal = weighted average by confidence
    agreement = 1 - (variance / variance_max)
    
    variance_max = 0.5 chosen because:
    - Maximum disagreement would be proxies at -1 and +1
    - Variance of [-1, +1] = 1.0
    - In practice, signals rarely diverge that much
    - 0.5 is a reasonable "high disagreement" threshold
    """
    if not proxies:
        return PhysicalFusion(fused_signal=0.0, agreement=1.0, proxies=[])
    
    total_weight = sum(p.confidence for p in proxies)
    if total_weight == 0:
        total_weight = 1.0
    
    fused = sum(p.value * p.confidence for p in proxies) / total_weight
    
    VARIANCE_MAX = 0.5
    
    values = [p.value for p in proxies]
    if len(values) > 1:
        variance = np.var(values)
        agreement = 1.0 - min(1.0, variance / VARIANCE_MAX)
    else:
        agreement = 1.0
    
    return PhysicalFusion(
        fused_signal=round(fused, 3),
        agreement=round(agreement, 3),
        proxies=proxies,
    )


class GeospatialService:
    """Service for geospatial analysis: anomaly maps and proxy fusion."""
    
    def __init__(self):
        self._ee_ready = _init_earth_engine()
        self._overlay_cache: dict[str, bytes] = {}
        self._http_client = httpx.Client(timeout=30.0)
    
    def get_overlay_png(self, region_id: str) -> Optional[bytes]:
        """Get cached overlay PNG for a region."""
        cache_key = f"overlay:{region_id}:{datetime.now().strftime('%Y-%m-%d')}"
        return self._overlay_cache.get(cache_key)
    
    def _get_viirs_anomaly_stats(self, geometry, recent_days: int = 14, baseline_days: int = 90) -> Optional[dict]:
        """
        Query VIIRS night lights and compute anomaly statistics.
        
        Returns dict with mean, std, z-score, sample_count or None if failed.
        """
        if not self._ee_ready or _ee is None:
            return None
        
        try:
            end_date = datetime.now()
            recent_start = end_date - timedelta(days=recent_days)
            baseline_start = end_date - timedelta(days=baseline_days + recent_days)
            baseline_end = recent_start
            
            # VIIRS DNB Monthly composites
            viirs = _ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG").select("avg_rad")
            
            # Recent period
            recent_collection = viirs.filterDate(
                recent_start.strftime("%Y-%m-%d"),
                end_date.strftime("%Y-%m-%d")
            ).filterBounds(geometry)
            
            recent_count = recent_collection.size().getInfo()
            if recent_count == 0:
                logger.warning("No recent VIIRS data available")
                return None
            
            recent_mean = recent_collection.mean().reduceRegion(
                reducer=_ee.Reducer.mean(),
                geometry=geometry,
                scale=500,
                maxPixels=1e8
            ).getInfo().get("avg_rad")
            
            # Baseline period
            baseline_collection = viirs.filterDate(
                baseline_start.strftime("%Y-%m-%d"),
                baseline_end.strftime("%Y-%m-%d")
            ).filterBounds(geometry)
            
            baseline_count = baseline_collection.size().getInfo()
            if baseline_count < 2:
                logger.warning("Insufficient baseline VIIRS data")
                return None
            
            baseline_stats = baseline_collection.reduce(
                _ee.Reducer.mean().combine(_ee.Reducer.stdDev(), sharedInputs=True)
            ).reduceRegion(
                reducer=_ee.Reducer.mean(),
                geometry=geometry,
                scale=500,
                maxPixels=1e8
            ).getInfo()
            
            baseline_mean = baseline_stats.get("avg_rad_mean")
            baseline_std = baseline_stats.get("avg_rad_stdDev")
            
            if baseline_mean is None or baseline_std is None or baseline_std == 0:
                return None
            
            z_score = (recent_mean - baseline_mean) / (baseline_std + 0.001)
            
            # Confidence based on sample counts and std stability
            conf = min(1.0, 0.5 + (recent_count / 3) * 0.2 + (baseline_count / 6) * 0.3)
            if baseline_std < 0.1:  # Very low variance reduces confidence
                conf *= 0.8
            
            return {
                "recent_mean": recent_mean,
                "baseline_mean": baseline_mean,
                "baseline_std": baseline_std,
                "z_score": z_score,
                "confidence": conf,
                "recent_count": recent_count,
                "baseline_count": baseline_count,
            }
            
        except Exception as e:
            logger.error(f"VIIRS query failed: {e}")
            return None
    
    def _get_ndvi_anomaly_stats(self, geometry, recent_days: int = 30, baseline_days: int = 90) -> Optional[dict]:
        """
        Query Sentinel-2 NDVI and compute anomaly statistics.
        
        Returns dict with mean, std, z-score, cloud_cover, sample_count or None if failed.
        """
        if not self._ee_ready or _ee is None:
            return None
        
        try:
            end_date = datetime.now()
            recent_start = end_date - timedelta(days=recent_days)
            baseline_start = end_date - timedelta(days=baseline_days + recent_days)
            baseline_end = recent_start
            
            # Sentinel-2 Surface Reflectance
            s2 = _ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            
            def add_ndvi(image):
                ndvi = image.normalizedDifference(["B8", "B4"]).rename("ndvi")
                return image.addBands(ndvi)
            
            def mask_clouds(image):
                qa = image.select("QA60")
                cloud_mask = qa.bitwiseAnd(1 << 10).eq(0).And(qa.bitwiseAnd(1 << 11).eq(0))
                return image.updateMask(cloud_mask)
            
            # Recent NDVI
            recent_collection = s2.filterDate(
                recent_start.strftime("%Y-%m-%d"),
                end_date.strftime("%Y-%m-%d")
            ).filterBounds(geometry).filter(
                _ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30)
            ).map(mask_clouds).map(add_ndvi).select("ndvi")
            
            recent_count = recent_collection.size().getInfo()
            if recent_count == 0:
                logger.warning("No recent cloud-free Sentinel-2 data")
                return None
            
            recent_mean = recent_collection.mean().reduceRegion(
                reducer=_ee.Reducer.mean(),
                geometry=geometry,
                scale=100,
                maxPixels=1e8
            ).getInfo().get("ndvi")
            
            # Baseline NDVI
            baseline_collection = s2.filterDate(
                baseline_start.strftime("%Y-%m-%d"),
                baseline_end.strftime("%Y-%m-%d")
            ).filterBounds(geometry).filter(
                _ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30)
            ).map(mask_clouds).map(add_ndvi).select("ndvi")
            
            baseline_count = baseline_collection.size().getInfo()
            if baseline_count < 3:
                logger.warning("Insufficient baseline Sentinel-2 data")
                return None
            
            baseline_stats = baseline_collection.reduce(
                _ee.Reducer.mean().combine(_ee.Reducer.stdDev(), sharedInputs=True)
            ).reduceRegion(
                reducer=_ee.Reducer.mean(),
                geometry=geometry,
                scale=100,
                maxPixels=1e8
            ).getInfo()
            
            baseline_mean = baseline_stats.get("ndvi_mean")
            baseline_std = baseline_stats.get("ndvi_stdDev")
            
            if baseline_mean is None or baseline_std is None or baseline_std == 0:
                return None
            
            z_score = (recent_mean - baseline_mean) / (baseline_std + 0.001)
            
            # NDVI confidence affected by cloud cover and sample count
            conf = min(1.0, 0.4 + (recent_count / 5) * 0.3 + (baseline_count / 10) * 0.3)
            
            return {
                "recent_mean": recent_mean,
                "baseline_mean": baseline_mean,
                "baseline_std": baseline_std,
                "z_score": z_score,
                "confidence": conf,
                "recent_count": recent_count,
                "baseline_count": baseline_count,
            }
            
        except Exception as e:
            logger.error(f"NDVI query failed: {e}")
            return None
    
    def _get_sar_anomaly_stats(self, geometry, recent_days: int = 14, baseline_days: int = 90) -> Optional[dict]:
        """
        Query Sentinel-1 SAR backscatter and compute anomaly statistics.
        
        SAR is weather-independent, good for detecting infrastructure/shipping activity.
        Returns dict with mean, std, z-score, sample_count or None if failed.
        """
        if not self._ee_ready or _ee is None:
            return None
        
        try:
            end_date = datetime.now()
            recent_start = end_date - timedelta(days=recent_days)
            baseline_start = end_date - timedelta(days=baseline_days + recent_days)
            baseline_end = recent_start
            
            # Sentinel-1 GRD (VV polarization is best for infrastructure)
            s1 = _ee.ImageCollection("COPERNICUS/S1_GRD").filter(
                _ee.Filter.eq("instrumentMode", "IW")
            ).filter(
                _ee.Filter.listContains("transmitterReceiverPolarisation", "VV")
            ).select("VV")
            
            # Recent SAR
            recent_collection = s1.filterDate(
                recent_start.strftime("%Y-%m-%d"),
                end_date.strftime("%Y-%m-%d")
            ).filterBounds(geometry)
            
            recent_count = recent_collection.size().getInfo()
            if recent_count == 0:
                logger.warning("No recent Sentinel-1 data")
                return None
            
            recent_mean = recent_collection.mean().reduceRegion(
                reducer=_ee.Reducer.mean(),
                geometry=geometry,
                scale=100,
                maxPixels=1e8
            ).getInfo().get("VV")
            
            # Baseline SAR
            baseline_collection = s1.filterDate(
                baseline_start.strftime("%Y-%m-%d"),
                baseline_end.strftime("%Y-%m-%d")
            ).filterBounds(geometry)
            
            baseline_count = baseline_collection.size().getInfo()
            if baseline_count < 3:
                logger.warning("Insufficient baseline Sentinel-1 data")
                return None
            
            baseline_stats = baseline_collection.reduce(
                _ee.Reducer.mean().combine(_ee.Reducer.stdDev(), sharedInputs=True)
            ).reduceRegion(
                reducer=_ee.Reducer.mean(),
                geometry=geometry,
                scale=100,
                maxPixels=1e8
            ).getInfo()
            
            baseline_mean = baseline_stats.get("VV_mean")
            baseline_std = baseline_stats.get("VV_stdDev")
            
            if baseline_mean is None or baseline_std is None or baseline_std == 0:
                return None
            
            z_score = (recent_mean - baseline_mean) / (baseline_std + 0.001)
            
            # SAR has high confidence since it's weather-independent
            conf = min(1.0, 0.6 + (recent_count / 4) * 0.2 + (baseline_count / 8) * 0.2)
            
            return {
                "recent_mean": recent_mean,
                "baseline_mean": baseline_mean,
                "baseline_std": baseline_std,
                "z_score": z_score,
                "confidence": conf,
                "recent_count": recent_count,
                "baseline_count": baseline_count,
            }
            
        except Exception as e:
            logger.error(f"SAR query failed: {e}")
            return None
    
    def _generate_real_anomaly(self, region_id: str, size: int = 128) -> Optional[np.ndarray]:
        """
        Generate anomaly grid from real GEE VIIRS data.
        
        Uses VIIRS night lights:
        - current = mean of last 14 days
        - baseline_mean = mean of prior 90 days
        - baseline_std = std of prior 90 days
        - anomaly_z = (current - baseline_mean) / (baseline_std + eps)
        
        Downloads thumbnail and converts to numpy array.
        """
        if not self._ee_ready or _ee is None:
            return None
        
        region = REGION_BOUNDS.get(region_id)
        if not region:
            return None
        
        try:
            bounds = region["coords"]
            geometry = _ee.Geometry.Rectangle(bounds)
            
            end_date = datetime.now()
            recent_start = end_date - timedelta(days=14)
            baseline_start = end_date - timedelta(days=104)
            baseline_end = recent_start
            
            # VIIRS DNB Monthly
            viirs = _ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG").select("avg_rad")
            
            # Get recent and baseline composites
            recent = viirs.filterDate(
                recent_start.strftime("%Y-%m-%d"),
                end_date.strftime("%Y-%m-%d")
            ).filterBounds(geometry).mean()
            
            baseline_collection = viirs.filterDate(
                baseline_start.strftime("%Y-%m-%d"),
                baseline_end.strftime("%Y-%m-%d")
            ).filterBounds(geometry)
            
            baseline_mean = baseline_collection.mean()
            baseline_std = baseline_collection.reduce(_ee.Reducer.stdDev())
            
            # Compute z-score image
            eps = 0.001
            # Handle band name from stdDev reducer
            anomaly_image = recent.subtract(baseline_mean).divide(
                baseline_std.rename("avg_rad").add(eps)
            ).clamp(-3, 3)
            
            # Generate visualization
            vis_params = {
                "min": -3,
                "max": 3,
                "palette": ["3232c8", "6464dc", "9696f0", "ffffff", "f09696", "dc6464", "c83232"],
                "dimensions": f"{size}x{size}",
                "region": geometry,
            }
            
            thumb_url = anomaly_image.getThumbURL(vis_params)
            logger.info(f"Generated GEE anomaly thumbnail for {region_id}")
            
            # Download the image
            response = self._http_client.get(thumb_url)
            if response.status_code != 200:
                logger.error(f"Failed to download GEE thumbnail: {response.status_code}")
                return None
            
            # Convert to numpy
            img = Image.open(io.BytesIO(response.content)).convert("RGB")
            img = img.resize((size, size))
            rgb = np.array(img)
            
            # Convert visualization back to approximate z-scores
            # Using red channel dominance for positive, blue for negative
            r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
            
            # Approximate z-score from color
            # Red dominant = positive, blue dominant = negative
            anomaly = ((r.astype(float) - b.astype(float)) / 255.0) * 3.0
            
            return anomaly
            
        except Exception as e:
            logger.error(f"GEE anomaly computation failed: {e}")
            return None
    
    def _compute_proxy_signals_real(self, region_id: str) -> List[ProxySignal]:
        """
        Compute proxy signals from real GEE data.
        
        Queries:
        - VIIRS Night Lights
        - Sentinel-2 NDVI
        - Sentinel-1 SAR Backscatter
        
        Falls back to mock for any proxy that fails.
        """
        region = REGION_BOUNDS.get(region_id)
        if not region or not self._ee_ready:
            return _compute_mock_proxy_signals(region_id)
        
        bounds = region["coords"]
        geometry = _ee.Geometry.Rectangle(bounds)
        
        proxies = []
        mock_proxies = _compute_mock_proxy_signals(region_id)
        mock_dict = {p.name: p for p in mock_proxies}
        
        # Night Lights (VIIRS)
        viirs_stats = self._get_viirs_anomaly_stats(geometry)
        if viirs_stats:
            z = viirs_stats["z_score"]
            proxies.append(ProxySignal(
                name="night_lights",
                value=round(_normalize_to_range(z), 3),
                confidence=round(viirs_stats["confidence"], 2),
                raw_z_score=round(z, 3),
            ))
            logger.info(f"VIIRS proxy for {region_id}: z={z:.2f}, conf={viirs_stats['confidence']:.2f}")
        else:
            proxies.append(mock_dict["night_lights"])
            logger.info(f"Using mock VIIRS for {region_id}")
        
        # NDVI (Sentinel-2)
        ndvi_stats = self._get_ndvi_anomaly_stats(geometry)
        if ndvi_stats:
            z = ndvi_stats["z_score"]
            proxies.append(ProxySignal(
                name="ndvi",
                value=round(_normalize_to_range(z), 3),
                confidence=round(ndvi_stats["confidence"], 2),
                raw_z_score=round(z, 3),
            ))
            logger.info(f"NDVI proxy for {region_id}: z={z:.2f}, conf={ndvi_stats['confidence']:.2f}")
        else:
            proxies.append(mock_dict["ndvi"])
            logger.info(f"Using mock NDVI for {region_id}")
        
        # SAR Backscatter (Sentinel-1)
        sar_stats = self._get_sar_anomaly_stats(geometry)
        if sar_stats:
            z = sar_stats["z_score"]
            proxies.append(ProxySignal(
                name="sar_backscatter",
                value=round(_normalize_to_range(z), 3),
                confidence=round(sar_stats["confidence"], 2),
                raw_z_score=round(z, 3),
            ))
            logger.info(f"SAR proxy for {region_id}: z={z:.2f}, conf={sar_stats['confidence']:.2f}")
        else:
            proxies.append(mock_dict["sar_backscatter"])
            logger.info(f"Using mock SAR for {region_id}")
        
        return proxies
    
    def analyze_region(self, region_id: str, api_base_url: str = "http://localhost:8000") -> GeospatialData:
        """
        Perform full geospatial analysis for a region.
        
        Returns anomaly overlay + spatial stats + proxy fusion.
        """
        cache_key = f"geo:{region_id}:{datetime.now().strftime('%Y-%m-%d-%H')}"
        if cache_key in _cache:
            return _cache[cache_key]
        
        region = REGION_BOUNDS.get(region_id, REGION_BOUNDS["shanghai"])
        is_simulated = True
        
        # Try real GEE data first
        anomaly_grid = None
        if self._ee_ready:
            anomaly_grid = self._generate_real_anomaly(region_id)
            if anomaly_grid is not None:
                is_simulated = False
                logger.info(f"Using real GEE anomaly data for {region_id}")
        
        if anomaly_grid is None:
            anomaly_grid = _generate_mock_anomaly_grid(region_id)
            logger.info(f"Using mock anomaly data for {region_id}")
        
        # Generate PNG and cache it
        png_bytes = _anomaly_grid_to_png(anomaly_grid)
        overlay_cache_key = f"overlay:{region_id}:{datetime.now().strftime('%Y-%m-%d')}"
        self._overlay_cache[overlay_cache_key] = png_bytes
        
        # Compute spatial stats
        spatial_stats = _compute_spatial_stats(anomaly_grid)
        
        # Compute proxy fusion
        if self._ee_ready:
            proxy_signals = self._compute_proxy_signals_real(region_id)
            # Check if any real data was used
            is_simulated = is_simulated  # Keep previous state, proxies may partially succeed
        else:
            proxy_signals = _compute_mock_proxy_signals(region_id)
        
        physical_fusion = _compute_fusion(proxy_signals)
        
        # Build overlay payload
        overlay = OverlayPayload(
            type="image",
            url=f"{api_base_url}/overlays/{region_id}.png",
            bbox=region["coords"],
            legend=OverlayLegend(
                min_val=-3.0,
                max_val=3.0,
                unit="z",
                description="Pixel anomaly vs 90-day baseline",
            ),
        )
        
        result = GeospatialData(
            overlay=overlay,
            spatial_stats=spatial_stats,
            physical_fusion=physical_fusion,
            is_simulated=is_simulated,
        )
        
        _cache[cache_key] = result
        return result


# Singleton instance
_service_instance: Optional[GeospatialService] = None


def get_geospatial_service() -> GeospatialService:
    """Get or create singleton geospatial service."""
    global _service_instance
    if _service_instance is None:
        _service_instance = GeospatialService()
    return _service_instance

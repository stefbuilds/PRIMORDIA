"""
Deterministic Mock Data for MVP Development
============================================

All values are deterministic based on region_id for reproducible testing.
Each region represents a distinct scenario for testing divergence logic.

Future: Replace with real API calls to:
- Google Earth Engine (Night Lights, NDVI)
- Vertex AI (vehicle/vessel detection)
- NewsAPI + sentiment analysis
- Polygon.io / financial data
"""

from models.signals import SatelliteRaw, NewsRaw

REGIONS = [
    {
        "id": "shanghai",
        "name": "Shanghai, China",
        "centroid": [121.4737, 31.2304],
        "bbox": [120.85, 30.67, 122.20, 31.87],
        "description": "Major port and manufacturing hub",
    },
    {
        "id": "la_port",
        "name": "Port of Los Angeles",
        "centroid": [-118.2518, 33.7361],
        "bbox": [-118.35, 33.65, -118.15, 33.82],
        "description": "Largest US container port",
    },
    {
        "id": "rotterdam",
        "name": "Rotterdam, Netherlands",
        "centroid": [4.4777, 51.9244],
        "bbox": [3.90, 51.75, 4.90, 52.10],
        "description": "Europe's largest port, energy hub",
    },
    {
        "id": "suez",
        "name": "Suez Canal Zone",
        "centroid": [32.3019, 30.5852],
        "bbox": [32.20, 29.90, 32.60, 31.30],
        "description": "Critical global shipping chokepoint",
    },
    {
        "id": "shenzhen",
        "name": "Shenzhen, China",
        "centroid": [114.0579, 22.5431],
        "bbox": [113.75, 22.40, 114.65, 22.85],
        "description": "Tech manufacturing center",
    },
]


# ============================================================================
# MOCK SCENARIOS
# Each region represents a distinct divergence scenario for testing
# ============================================================================

MOCK_SIGNALS: dict[str, tuple[SatelliteRaw, NewsRaw]] = {
    
    # SCENARIO 1: HYPE DIVERGENCE (Classic bubble signal)
    # Physical activity is DOWN but news is BULLISH with HIGH HYPE
    # Expected: High divergence (75+), critical alert
    "shanghai": (
        SatelliteRaw(
            activity_delta_pct=-55.0,     # Ship/truck counts down significantly
            night_light_delta_pct=-35.0,  # Dimmer industrial zones
            ndvi_delta_pct=8.0,           # Vegetation recovery (less industrial)
            confidence=0.92,              # High confidence - clear imagery
        ),
        NewsRaw(
            sentiment_score=0.85,         # Very bullish headlines
            headline_count=1247,          # High coverage
            hype_intensity=88.0,          # Very high—suspicious
            source_diversity=0.28,        # Low diversity—echo chamber
        ),
    ),
    
    # SCENARIO 2: PANIC DIVERGENCE (Contrarian opportunity)
    # Physical activity is UP but news is BEARISH
    # Expected: High divergence (75+), critical alert (opposite direction)
    "shenzhen": (
        SatelliteRaw(
            activity_delta_pct=62.0,      # Factory activity surging
            night_light_delta_pct=45.0,   # Bright industrial zones
            ndvi_delta_pct=-18.0,         # Less vegetation (expansion)
            confidence=0.88,              # Good confidence
        ),
        NewsRaw(
            sentiment_score=-0.82,        # Bearish doom headlines
            headline_count=823,
            hype_intensity=72.0,          # High hype on negative news
            source_diversity=0.42,        # Moderate diversity
        ),
    ),
    
    # SCENARIO 3: ALIGNED BEARISH (Confirmed slowdown)
    # Both signals negative, aligned
    # Expected: Low divergence, info alert
    "suez": (
        SatelliteRaw(
            activity_delta_pct=-45.0,     # Major traffic decline
            night_light_delta_pct=-8.0,
            ndvi_delta_pct=2.0,
            confidence=0.92,              # Very clear imagery
        ),
        NewsRaw(
            sentiment_score=-0.58,        # Negative but not panic
            headline_count=1205,          # Heavy coverage
            hype_intensity=42.0,          # Normal levels
            source_diversity=0.72,        # Good diversity
        ),
    ),
    
    # SCENARIO 4: ALIGNED BULLISH (Confirmed expansion)
    # Both signals positive, aligned
    # Expected: Low divergence, info alert
    "la_port": (
        SatelliteRaw(
            activity_delta_pct=18.0,      # Healthy throughput increase
            night_light_delta_pct=12.0,
            ndvi_delta_pct=-5.0,
            confidence=0.88,
        ),
        NewsRaw(
            sentiment_score=0.45,         # Moderately positive
            headline_count=312,           # Normal coverage
            hype_intensity=25.0,          # Low hype—organic
            source_diversity=0.81,        # High diversity
        ),
    ),
    
    # SCENARIO 5: MODERATE DIVERGENCE (Worth monitoring)
    # Satellite neutral, news somewhat bullish
    # Expected: Medium divergence, warning alert
    "rotterdam": (
        SatelliteRaw(
            activity_delta_pct=-5.0,      # Slightly below baseline
            night_light_delta_pct=3.0,    # Stable
            ndvi_delta_pct=0.0,
            confidence=0.65,              # Some cloud cover
        ),
        NewsRaw(
            sentiment_score=0.52,         # Bullish narrative
            headline_count=445,
            hype_intensity=48.0,          # Elevated
            source_diversity=0.55,
        ),
    ),
}


def get_regions() -> list[dict]:
    """Return all monitored regions."""
    return REGIONS


def get_region(region_id: str) -> dict | None:
    """Return a specific region by ID."""
    return next((r for r in REGIONS if r["id"] == region_id), None)


def get_mock_signals(region_id: str) -> tuple[SatelliteRaw, NewsRaw] | None:
    """
    Get mock raw signal data for a region.
    
    Future: This function will be replaced with real API calls:
    
    async def get_signals(region_id: str) -> tuple[SatelliteRaw, NewsRaw]:
        satellite_raw = await fetch_satellite_data(region_id)  # GEE + Vertex
        news_raw = await fetch_news_data(region_id)            # NewsAPI + NLP
        return satellite_raw, news_raw
    """
    return MOCK_SIGNALS.get(region_id)

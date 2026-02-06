"""
Market Data Service (Polygon.io)
================================

Fetches real financial market data as an additional signal layer:
- Shipping/logistics ETFs
- Energy prices
- Regional market indices

This provides a "market reality check" against both satellite and news.
"""

import os
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional
from cachetools import TTLCache

logger = logging.getLogger(__name__)

_cache = TTLCache(maxsize=50, ttl=300)  # 5 min cache

# Tickers relevant to each region
REGION_TICKERS = {
    "shanghai": {
        "primary": "FXI",      # China Large-Cap ETF
        "secondary": "KWEB",   # China Internet ETF
        "name": "China Markets",
        "symbols": [
            {"ticker": "FXI", "name": "China Large-Cap ETF", "type": "primary", "description": "iShares China Large-Cap ETF - tracks top 50 Chinese companies"},
            {"ticker": "KWEB", "name": "China Internet ETF", "type": "secondary", "description": "KraneShares CSI China Internet ETF - tracks Chinese internet sector"},
            {"ticker": "YINN", "name": "China Bull 3X", "type": "secondary", "description": "Direxion Daily FTSE China Bull 3X - leveraged China exposure"},
        ],
    },
    "shenzhen": {
        "primary": "MCHI",     # China ETF
        "secondary": "CQQQ",   # China Tech ETF
        "name": "China Tech",
        "symbols": [
            {"ticker": "MCHI", "name": "iShares China ETF", "type": "primary", "description": "iShares MSCI China ETF - broad China market exposure"},
            {"ticker": "CQQQ", "name": "China Tech ETF", "type": "secondary", "description": "Invesco China Technology ETF - Chinese technology companies"},
            {"ticker": "ASHR", "name": "A-Shares ETF", "type": "secondary", "description": "Xtrackers Harvest CSI 300 China A-Shares ETF"},
        ],
    },
    "suez": {
        "primary": "BDRY",     # Dry Bulk Shipping ETF
        "secondary": "USO",    # Oil ETF
        "name": "Shipping & Energy",
        "symbols": [
            {"ticker": "BDRY", "name": "Dry Bulk Shipping", "type": "primary", "description": "Breakwave Dry Bulk Shipping ETF - tracks dry bulk shipping rates"},
            {"ticker": "USO", "name": "US Oil Fund", "type": "secondary", "description": "United States Oil Fund - tracks WTI crude oil"},
            {"ticker": "BOAT", "name": "Shipping ETF", "type": "secondary", "description": "SonicShares Global Shipping ETF"},
            {"ticker": "GOGL", "name": "Golden Ocean", "type": "secondary", "description": "Golden Ocean Group - dry bulk shipping company"},
        ],
    },
    "la_port": {
        "primary": "IYT",      # Transportation ETF
        "secondary": "XLI",    # Industrials ETF
        "name": "US Logistics",
        "symbols": [
            {"ticker": "IYT", "name": "Transportation ETF", "type": "primary", "description": "iShares U.S. Transportation ETF - US transport sector"},
            {"ticker": "XLI", "name": "Industrials ETF", "type": "secondary", "description": "Industrial Select Sector SPDR - US industrials"},
            {"ticker": "SBLK", "name": "Star Bulk Carriers", "type": "secondary", "description": "Star Bulk Carriers Corp - dry bulk shipping"},
            {"ticker": "ZIM", "name": "ZIM Shipping", "type": "secondary", "description": "ZIM Integrated Shipping Services"},
        ],
    },
    "rotterdam": {
        "primary": "EWN",      # Netherlands ETF
        "secondary": "UNG",    # Natural Gas ETF
        "name": "Europe Energy",
        "symbols": [
            {"ticker": "EWN", "name": "Netherlands ETF", "type": "primary", "description": "iShares MSCI Netherlands ETF"},
            {"ticker": "UNG", "name": "Natural Gas Fund", "type": "secondary", "description": "United States Natural Gas Fund"},
            {"ticker": "TTF1!", "name": "EU Natural Gas", "type": "secondary", "description": "Dutch TTF Natural Gas Futures"},
            {"ticker": "EWG", "name": "Germany ETF", "type": "secondary", "description": "iShares MSCI Germany ETF"},
        ],
    },
}


def get_region_symbols(region_id: str) -> list[dict]:
    """Get all market symbols for a region."""
    config = REGION_TICKERS.get(region_id)
    if not config:
        return []
    return config.get("symbols", [])


@dataclass
class MarketSignal:
    ticker: str
    name: str
    price: float
    change_pct: float
    change_1w_pct: float
    volume: int
    signal_strength: float  # -1 to 1
    trend: str  # "bullish", "bearish", "neutral"


class MarketService:
    def __init__(self):
        self.api_key = os.getenv("POLYGON_API_KEY")
        if not self.api_key:
            logger.warning("POLYGON_API_KEY not set - market data disabled")
            self._enabled = False
        else:
            self._enabled = True
    
    def fetch_market_signal(self, region_id: str) -> Optional[MarketSignal]:
        if not self._enabled:
            return None
        
        cache_key = f"market:{region_id}"
        if cache_key in _cache:
            return _cache[cache_key]
        
        config = REGION_TICKERS.get(region_id)
        if not config:
            return None
        
        ticker = config["primary"]
        
        try:
            from polygon import RESTClient
            client = RESTClient(self.api_key)
            
            # Get previous day's data
            aggs = list(client.get_aggs(
                ticker=ticker,
                multiplier=1,
                timespan="day",
                from_=(datetime.now() - timedelta(days=10)).strftime("%Y-%m-%d"),
                to=datetime.now().strftime("%Y-%m-%d"),
                limit=10,
            ))
            
            if len(aggs) < 2:
                return None
            
            latest = aggs[-1]
            prev = aggs[-2]
            week_ago = aggs[0] if len(aggs) >= 5 else aggs[0]
            
            change_pct = ((latest.close - prev.close) / prev.close) * 100
            change_1w = ((latest.close - week_ago.close) / week_ago.close) * 100
            
            # Signal strength based on price movement
            signal = max(-1, min(1, change_1w / 10))  # ±10% = ±1.0
            
            trend = "bullish" if signal > 0.1 else "bearish" if signal < -0.1 else "neutral"
            
            result = MarketSignal(
                ticker=ticker,
                name=config["name"],
                price=round(latest.close, 2),
                change_pct=round(change_pct, 2),
                change_1w_pct=round(change_1w, 2),
                volume=int(latest.volume),
                signal_strength=round(signal, 3),
                trend=trend,
            )
            
            _cache[cache_key] = result
            return result
            
        except Exception as e:
            logger.error(f"Polygon API error for {ticker}: {e}")
            return None

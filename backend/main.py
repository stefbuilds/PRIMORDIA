"""
Primordia API
=============

Backend API combining satellite, news, and market signals.
v1.2 - Added Gemini AI sentiment analysis
"""

import os
import math
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Services
news_service = None
satellite_service = None
market_service = None
sentiment_service = None
chat_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global news_service, satellite_service, market_service, sentiment_service, chat_service
    
    # Initialize services
    try:
        from services.news import NewsService
        news_service = NewsService()
        logger.info("News service ready")
    except Exception as e:
        logger.error(f"News service failed: {e}")
    
    try:
        from services.satellite import SatelliteService
        satellite_service = SatelliteService()
        logger.info("Satellite service ready")
    except Exception as e:
        logger.error(f"Satellite service failed: {e}")
    
    try:
        from services.market import MarketService
        market_service = MarketService()
        logger.info("Market service ready")
    except Exception as e:
        logger.error(f"Market service failed: {e}")
    
    try:
        from services.sentiment import SentimentService
        sentiment_service = SentimentService()
        logger.info("Sentiment AI service ready")
    except Exception as e:
        logger.error(f"Sentiment service failed: {e}")
    
    try:
        from services.chat import ChatService
        chat_service = ChatService()
        logger.info("Chat service ready")
    except Exception as e:
        logger.error(f"Chat service failed: {e}")
    
    yield


app = FastAPI(title="Primordia API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Data Models ===

REGIONS = {
    "shanghai": {
        "id": "shanghai",
        "name": "Shanghai Port",
        "description": "World's busiest container port",
        "bbox": [120.85, 30.67, 122.20, 31.87],
        "centroid": [121.47, 31.23],
        "category": "ports",
    },
    "shenzhen": {
        "id": "shenzhen",
        "name": "Shenzhen Tech Hub",
        "description": "China's electronics manufacturing center",
        "bbox": [113.75, 22.40, 114.65, 22.85],
        "centroid": [114.06, 22.54],
        "category": "manufacturing",
    },
    "suez": {
        "id": "suez",
        "name": "Suez Canal",
        "description": "Critical global shipping chokepoint",
        "bbox": [32.20, 29.90, 32.60, 31.30],
        "centroid": [32.34, 30.58],
        "category": "shipping",
    },
    "la_port": {
        "id": "la_port",
        "name": "Port of Los Angeles",
        "description": "Largest US container port",
        "bbox": [-118.35, 33.65, -118.15, 33.82],
        "centroid": [-118.27, 33.74],
        "category": "ports",
    },
    "rotterdam": {
        "id": "rotterdam",
        "name": "Rotterdam Port",
        "description": "Europe's largest port and energy hub",
        "bbox": [3.90, 51.75, 4.90, 52.10],
        "centroid": [4.48, 51.92],
        "category": "energy",
    },
}


class HeadlineResponse(BaseModel):
    title: str
    source: str
    published_at: str
    url: str
    sentiment: float
    description: str


class NewsRawResponse(BaseModel):
    sentiment_score: float
    confidence: float
    hype_intensity: float
    headline_volume: int
    source_diversity: float
    duplicate_ratio: float
    pump_lexicon_rate: float
    headlines: list[HeadlineResponse]
    trending_topics: list[str]


class SatelliteRawResponse(BaseModel):
    activity_delta_pct: float
    night_light_delta_pct: float
    confidence: float
    anomaly_strength: float
    baseline_window_days: int
    data_source: str
    last_observation: str
    trend: str


class MarketDataResponse(BaseModel):
    ticker: str
    name: str
    price: float
    change_pct: float
    change_1w_pct: float
    volume: int
    signal_strength: float
    trend: str


class AlertResponse(BaseModel):
    level: str
    message: str
    category: str


class ExplanationResponse(BaseModel):
    sat_agent: str
    news_agent: str
    market_agent: str
    synthesis: str


class AIInsightResponse(BaseModel):
    sentiment_score: float
    confidence: float
    summary: str
    key_themes: list[str]
    risk_factors: list[str]
    model: str


class SignalsResponse(BaseModel):
    region_id: str
    timestamp: str
    
    # Scores
    satellite_score: float
    news_score: float
    market_score: Optional[float]
    divergence_score: float
    
    # Data status
    data_mode: str
    
    # Raw data
    satellite_raw: SatelliteRawResponse
    news_raw: NewsRawResponse
    market_data: Optional[MarketDataResponse]
    
    # AI Analysis
    ai_insight: Optional[AIInsightResponse]
    
    # Analysis
    alerts: list[AlertResponse]
    explanation: ExplanationResponse


# === Core Logic ===

def normalize_satellite_score(delta: float) -> float:
    """Convert delta % to [-1, +1] using tanh."""
    return math.tanh(delta / 30)


def normalize_news_score(sentiment: float, diversity: float) -> float:
    """Adjust sentiment by source diversity."""
    factor = 0.5 + 0.5 * diversity
    return max(-1, min(1, sentiment * factor * 2))


def compute_divergence(sat_score: float, news_score: float, market_score: float,
                       sat_conf: float, news_conf: float, hype: float) -> float:
    """
    Divergence Score [0, 100]
    
    High when:
    - Satellite and news strongly disagree
    - Market confirms the disagreement
    - Confidence is high
    - Hype is high
    """
    # Raw disagreement
    sat_news_gap = abs(sat_score - news_score)
    
    # If market exists, check if it confirms disagreement
    market_factor = 1.0
    if market_score is not None:
        sat_market_gap = abs(sat_score - market_score)
        news_market_gap = abs(news_score - market_score)
        # If market aligns with satellite but disagrees with news (or vice versa)
        if sat_market_gap < news_market_gap:
            market_factor = 1.2  # Amplify - news is the outlier
        elif news_market_gap < sat_market_gap:
            market_factor = 1.1  # Mild amplify - satellite might be wrong
    
    # Confidence weight
    combined_conf = (sat_conf + news_conf) / 2
    conf_weight = 0.3 + 0.7 * combined_conf
    
    # Hype amplifier
    hype_amp = 1 + (hype / 100) * 0.5
    
    divergence = sat_news_gap * conf_weight * hype_amp * market_factor * 50
    return max(0, min(100, divergence))


def generate_alerts(sat_score: float, news_score: float, market_score: float,
                    divergence: float, sat_raw, news_raw) -> list[AlertResponse]:
    alerts = []
    
    # Data quality
    if news_raw.headline_volume < 5:
        alerts.append(AlertResponse(
            level="info",
            message="Limited news coverage for this region",
            category="data",
        ))
    
    # Divergence alerts
    if divergence > 75:
        if news_score > 0.2 and sat_score < -0.1:
            alerts.append(AlertResponse(
                level="critical",
                message="HYPE DIVERGENCE: Bullish narrative not supported by physical activity",
                category="divergence",
            ))
        elif news_score < -0.2 and sat_score > 0.1:
            alerts.append(AlertResponse(
                level="critical", 
                message="PANIC DIVERGENCE: Bearish panic contradicted by physical activity",
                category="divergence",
            ))
        else:
            alerts.append(AlertResponse(
                level="warning",
                message="Significant signal divergence detected",
                category="divergence",
            ))
    elif divergence > 50:
        alerts.append(AlertResponse(
            level="warning",
            message="Moderate divergence between physical and narrative signals",
            category="divergence",
        ))
    
    # Hype alerts
    if news_raw.hype_intensity > 70:
        alerts.append(AlertResponse(
            level="warning",
            message=f"High narrative hype detected ({news_raw.hype_intensity:.0f}/100)",
            category="hype",
        ))
    
    # Market alignment
    if market_score is not None:
        sat_market_aligned = abs(sat_score - market_score) < 0.3
        news_market_aligned = abs(news_score - market_score) < 0.3
        
        if sat_market_aligned and not news_market_aligned and news_raw.hype_intensity > 50:
            alerts.append(AlertResponse(
                level="warning",
                message="Market aligns with physical reality, diverges from narrative",
                category="market",
            ))
    
    # If no alerts, add monitoring status
    if not alerts:
        alerts.append(AlertResponse(
            level="ok",
            message="Signals aligned - monitoring active",
            category="status",
        ))
    
    return alerts


def generate_explanation(region: dict, sat_score: float, news_score: float, 
                         market_score: float, sat_raw, news_raw, market_data) -> ExplanationResponse:
    
    name = region["name"]
    
    # Satellite agent
    if sat_raw.trend == "expanding":
        sat_text = f"Physical activity at {name} shows expansion (+{sat_raw.activity_delta_pct}% vs 90-day baseline). "
    elif sat_raw.trend == "contracting":
        sat_text = f"Physical activity at {name} shows contraction ({sat_raw.activity_delta_pct}% vs 90-day baseline). "
    else:
        sat_text = f"Physical activity at {name} remains stable (within normal variance). "
    
    sat_text += f"Observation confidence: {sat_raw.confidence:.0%} based on satellite imagery analysis."
    
    # News agent
    if news_raw.headline_volume > 0:
        sentiment_word = "bullish" if news_raw.sentiment_score > 0.1 else "bearish" if news_raw.sentiment_score < -0.1 else "neutral"
        news_text = f"Analyzed {news_raw.headline_volume} headlines from {int(news_raw.source_diversity * news_raw.headline_volume)} sources. "
        news_text += f"Aggregate sentiment: {sentiment_word} ({news_raw.sentiment_score:+.2f}). "
        
        if news_raw.hype_intensity > 50:
            news_text += f"Elevated hype indicators detected ({news_raw.hype_intensity:.0f}/100). "
        
        if news_raw.trending_topics:
            news_text += f"Key topics: {', '.join(news_raw.trending_topics[:3])}."
    else:
        news_text = "Limited news coverage available for this region. Unable to establish sentiment baseline."
    
    # Market agent
    if market_data:
        direction = "up" if market_data.change_1w_pct > 0 else "down"
        market_text = f"{market_data.name} ({market_data.ticker}) is {direction} {abs(market_data.change_1w_pct):.1f}% this week. "
        market_text += f"Current price: ${market_data.price:.2f}. Market signal: {market_data.trend}."
    else:
        market_text = "Market data unavailable for this region."
    
    # Synthesis
    signals = [("Physical", sat_score), ("Narrative", news_score)]
    if market_score is not None:
        signals.append(("Market", market_score))
    
    agreeing = all(abs(s[1] - signals[0][1]) < 0.3 for s in signals[1:])
    
    if agreeing:
        synthesis = f"ALIGNED: All available signals point in the same direction for {name}. "
        synthesis += "No significant divergence detected - normal monitoring mode."
    else:
        # Find the outlier
        divergent_pairs = []
        for i, (n1, s1) in enumerate(signals):
            for n2, s2 in signals[i+1:]:
                if abs(s1 - s2) > 0.4:
                    divergent_pairs.append((n1, n2, abs(s1 - s2)))
        
        if divergent_pairs:
            pair = max(divergent_pairs, key=lambda x: x[2])
            synthesis = f"DIVERGENCE: {pair[0]} and {pair[1]} signals show significant disagreement. "
            if "Physical" in pair and "Narrative" in pair:
                if sat_score > news_score:
                    synthesis += "Physical reality appears stronger than narrative suggests - potential opportunity or delayed recognition."
                else:
                    synthesis += "Narrative appears more bullish than physical indicators support - exercise caution."
        else:
            synthesis = f"Moderate signal variance at {name}. Continue monitoring for confirmation."
    
    return ExplanationResponse(
        sat_agent=sat_text,
        news_agent=news_text,
        market_agent=market_text,
        synthesis=synthesis,
    )


# === Endpoints ===

@app.get("/health")
def health():
    return {
        "status": "ok",
        "news_service": news_service is not None,
        "satellite_service": satellite_service is not None,
        "market_service": market_service is not None,
        "sentiment_service": sentiment_service is not None,
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/regions")
def get_regions():
    return {"regions": list(REGIONS.values())}


class MarketSymbolResponse(BaseModel):
    ticker: str
    name: str
    type: str
    description: str


@app.get("/market-symbols/{region_id}")
def get_market_symbols(region_id: str):
    """Get all market symbols relevant to a region for display."""
    from services.market import get_region_symbols
    symbols = get_region_symbols(region_id)
    return {"region_id": region_id, "symbols": symbols}


@app.get("/signals", response_model=SignalsResponse)
def get_signals(region_id: str = Query(...)):
    if region_id not in REGIONS:
        region_id = "shanghai"
    
    region = REGIONS[region_id]
    
    # Fetch market data first (used by satellite simulation)
    market_data = None
    market_score = None
    if market_service:
        market_signal = market_service.fetch_market_signal(region_id)
        if market_signal:
            market_data = MarketDataResponse(
                ticker=market_signal.ticker,
                name=market_signal.name,
                price=market_signal.price,
                change_pct=market_signal.change_pct,
                change_1w_pct=market_signal.change_1w_pct,
                volume=market_signal.volume,
                signal_strength=market_signal.signal_strength,
                trend=market_signal.trend,
            )
            market_score = market_signal.signal_strength
    
    # Fetch satellite data
    if satellite_service:
        sat_signal = satellite_service.fetch_satellite_signal(region_id, 
            market_service.fetch_market_signal(region_id) if market_service else None)
    else:
        from services.satellite import SatelliteService
        sat_signal = SatelliteService()._simulate_signal(region_id)
    
    sat_raw = SatelliteRawResponse(
        activity_delta_pct=sat_signal.activity_delta_pct,
        night_light_delta_pct=sat_signal.night_light_delta_pct,
        confidence=sat_signal.confidence,
        anomaly_strength=sat_signal.anomaly_strength,
        baseline_window_days=sat_signal.baseline_window_days,
        data_source=sat_signal.data_source,
        last_observation=sat_signal.last_observation,
        trend=sat_signal.trend,
    )
    
    # Fetch news data
    if news_service:
        news_signal = news_service.fetch_news(region_id)
    else:
        from services.news import NewsService
        news_signal = NewsService()._empty_signal()
    
    news_raw = NewsRawResponse(
        sentiment_score=news_signal.sentiment_score,
        confidence=news_signal.confidence,
        hype_intensity=news_signal.hype_intensity,
        headline_volume=news_signal.headline_volume,
        source_diversity=news_signal.source_diversity,
        duplicate_ratio=news_signal.duplicate_ratio,
        pump_lexicon_rate=news_signal.pump_lexicon_rate,
        headlines=[HeadlineResponse(
            title=h.title,
            source=h.source,
            published_at=h.published_at,
            url=h.url,
            sentiment=h.sentiment,
            description=h.description,
        ) for h in news_signal.headlines],
        trending_topics=news_signal.trending_topics,
    )
    
    # Compute scores
    sat_score = normalize_satellite_score(sat_signal.activity_delta_pct)
    news_score = normalize_news_score(news_signal.sentiment_score, news_signal.source_diversity)
    divergence = compute_divergence(
        sat_score, news_score, market_score,
        sat_signal.confidence, news_signal.confidence,
        news_signal.hype_intensity,
    )
    
    # Data mode
    modes = []
    if sat_signal.data_source in ("VIIRS", "DERIVED"):
        modes.append("SAT")
    if news_signal.headline_volume > 0:
        modes.append("NEWS")
    if market_data:
        modes.append("MKT")
    
    data_mode = "+".join(modes) if modes else "LIVE"
    
    # Alerts
    alerts = generate_alerts(sat_score, news_score, market_score, divergence, sat_raw, news_raw)
    
    # Explanation
    explanation = generate_explanation(region, sat_score, news_score, market_score, sat_raw, news_raw, market_data)
    
    # AI Insight
    ai_insight = None
    if sentiment_service and news_signal.headlines:
        headlines_text = [h.title for h in news_signal.headlines]
        ai_result = sentiment_service.analyze_headlines(headlines_text, region["name"])
        ai_insight = AIInsightResponse(
            sentiment_score=ai_result.score,
            confidence=ai_result.confidence,
            summary=ai_result.summary,
            key_themes=ai_result.key_themes,
            risk_factors=ai_result.risk_factors,
            model=ai_result.model,
        )
        # Update data mode
        if ai_result.model == "gemini":
            data_mode = data_mode + "+AI" if data_mode else "AI"
    
    return SignalsResponse(
        region_id=region_id,
        timestamp=datetime.now().isoformat(),
        satellite_score=round(sat_score, 3),
        news_score=round(news_score, 3),
        market_score=round(market_score, 3) if market_score else None,
        divergence_score=round(divergence, 1),
        data_mode=data_mode,
        satellite_raw=sat_raw,
        news_raw=news_raw,
        market_data=market_data,
        ai_insight=ai_insight,
        alerts=alerts,
        explanation=explanation,
    )


# === Chat Endpoint ===

class ChatMessageModel(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    region_id: str
    history: list[ChatMessageModel] = []


class ChatResponse(BaseModel):
    response: str
    model: str


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    if not chat_service:
        return ChatResponse(response="Chat service is not available.", model="none")
    
    # Get current signals for context
    region_id = request.region_id if request.region_id in REGIONS else "shanghai"
    region = REGIONS[region_id]
    
    # Fetch current data
    market_data = None
    market_score = None
    if market_service:
        market_signal = market_service.fetch_market_signal(region_id)
        if market_signal:
            market_data = market_signal
            market_score = market_signal.signal_strength
    
    if satellite_service:
        sat_signal = satellite_service.fetch_satellite_signal(region_id, market_data)
    else:
        from services.satellite import SatelliteService
        sat_signal = SatelliteService()._simulate_signal(region_id)
    
    if news_service:
        news_signal = news_service.fetch_news(region_id)
    else:
        from services.news import NewsService
        news_signal = NewsService()._empty_signal()
    
    sat_score = normalize_satellite_score(sat_signal.activity_delta_pct)
    news_score = normalize_news_score(news_signal.sentiment_score, news_signal.source_diversity)
    divergence = compute_divergence(
        sat_score, news_score, market_score,
        sat_signal.confidence, news_signal.confidence,
        news_signal.hype_intensity,
    )
    
    # Get AI summary if available
    ai_summary = None
    if sentiment_service and news_signal.headlines:
        headlines_text = [h.title for h in news_signal.headlines]
        ai_result = sentiment_service.analyze_headlines(headlines_text, region["name"])
        ai_summary = ai_result.summary
    
    # Build chat context
    from services.chat import ChatContext, ChatMessage
    context = ChatContext(
        region_name=region["name"],
        satellite_score=sat_score,
        news_score=news_score,
        market_score=market_score,
        divergence_score=divergence,
        satellite_trend=sat_signal.trend,
        headlines=[h.title for h in news_signal.headlines[:5]],
        ai_summary=ai_summary,
        market_ticker=market_data.ticker if market_data else None,
        market_price=market_data.price if market_data else None,
        market_change=market_data.change_1w_pct if market_data else None,
    )
    
    # Convert history
    history = [ChatMessage(role=m.role, content=m.content) for m in request.history]
    
    # Get response
    response = chat_service.chat(request.message, context, history)
    
    return ChatResponse(response=response, model="deepseek")

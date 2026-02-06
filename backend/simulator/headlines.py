"""
Headline Generator
==================

Generates realistic mock headlines based on:
- Current sentiment
- Active regime
- Region characteristics

Headlines are deterministic (seeded) for reproducibility.

Future: Replace with real headlines from NewsAPI with sentiment scoring.
"""

import random
from datetime import date
from typing import Optional

from .engine import Regime, RegimeType, Headline


# Template pools by category
TEMPLATES = {
    "bullish": [
        "{region} exports surge as demand rebounds",
        "Analysts upgrade {region} outlook amid strong indicators",
        "{region} activity hits multi-month high",
        "Investment flows into {region} accelerate",
        "Record throughput reported at {region}",
        "{region} expansion plans signal confidence",
        "Supply chain improvements boost {region} operations",
        "Strong Q4 expected for {region} logistics",
    ],
    "bearish": [
        "Concerns mount over {region} slowdown",
        "{region} activity falls short of expectations",
        "Analysts warn of {region} headwinds",
        "Trade disruptions impact {region} operations",
        "{region} faces mounting pressure",
        "Uncertainty clouds {region} outlook",
        "Shipping delays reported at {region}",
        "{region} throughput declines amid weak demand",
    ],
    "neutral": [
        "{region} activity holds steady",
        "Mixed signals from {region} data",
        "{region} operations remain stable",
        "Analysts maintain cautious view on {region}",
        "{region} throughput in line with expectations",
        "No major changes reported at {region}",
    ],
    "hype_pump": [
        "BREAKING: {region} poised for explosive growth",
        "Why {region} is the next big opportunity",
        "Insiders bullish on {region} prospects",
        "{region} rally just getting started, analysts say",
        "Smart money flowing into {region}",
        "Don't miss the {region} boom",
    ],
    "supply_shock": [
        "ALERT: Major disruption reported at {region}",
        "{region} operations halted amid crisis",
        "Emergency measures activated at {region}",
        "Supply chain chaos as {region} disruption spreads",
        "{region} closure sends shockwaves through markets",
        "Critical delays expected following {region} incident",
    ],
    "panic_sell": [
        "{region} collapse fears grip markets",
        "Investors flee {region} exposure",
        "Is {region} the next crisis hotspot?",
        "Warning signs flash red for {region}",
        "Analysts slash {region} forecasts",
        "{region} sentiment hits new lows",
    ],
    "recovery": [
        "{region} shows signs of stabilization",
        "Recovery takes hold at {region}",
        "Worst may be over for {region}, analysts suggest",
        "{region} operations gradually resume",
        "Confidence returns to {region}",
    ],
}

SOURCES = [
    "Reuters",
    "Bloomberg",
    "Financial Times",
    "WSJ",
    "CNBC",
    "MarketWatch",
    "Shipping Gazette",
    "Trade Weekly",
    "Port News Daily",
    "Supply Chain Digest",
    "Logistics Today",
    "Global Trade Review",
]


class HeadlineGenerator:
    """Generate realistic mock headlines."""
    
    def __init__(self, rng: random.Random, region_name: str):
        self.rng = rng
        self.region_name = region_name
    
    def _pick_template(self, sentiment: float, regime: Optional[Regime]) -> str:
        """Select appropriate headline template."""
        # Regime-specific templates take priority
        if regime:
            if regime.type == RegimeType.HYPE_PUMP and self.rng.random() < 0.6:
                return self.rng.choice(TEMPLATES["hype_pump"])
            elif regime.type == RegimeType.SUPPLY_SHOCK and self.rng.random() < 0.7:
                return self.rng.choice(TEMPLATES["supply_shock"])
            elif regime.type == RegimeType.PANIC_SELL and self.rng.random() < 0.6:
                return self.rng.choice(TEMPLATES["panic_sell"])
            elif regime.type == RegimeType.MEAN_REVERSION and self.rng.random() < 0.4:
                return self.rng.choice(TEMPLATES["recovery"])
        
        # Sentiment-based selection
        if sentiment > 0.25:
            pool = TEMPLATES["bullish"]
        elif sentiment < -0.25:
            pool = TEMPLATES["bearish"]
        else:
            pool = TEMPLATES["neutral"]
        
        return self.rng.choice(pool)
    
    def _headline_sentiment(self, template: str, base_sentiment: float) -> float:
        """Estimate headline sentiment from template category."""
        for category, templates in TEMPLATES.items():
            if template in templates:
                if category in ("bullish", "hype_pump"):
                    return 0.5 + self.rng.random() * 0.4
                elif category in ("bearish", "panic_sell", "supply_shock"):
                    return -0.5 - self.rng.random() * 0.4
                elif category == "recovery":
                    return 0.2 + self.rng.random() * 0.3
                else:
                    return self.rng.uniform(-0.2, 0.2)
        return base_sentiment
    
    def generate(
        self,
        day_date: date,
        sentiment: float,
        regime: Optional[Regime],
        count: int = 5,
    ) -> list[Headline]:
        """Generate headlines for a specific day."""
        headlines = []
        used_templates = set()
        
        for _ in range(count):
            # Pick unique template
            attempts = 0
            while attempts < 10:
                template = self._pick_template(sentiment, regime)
                if template not in used_templates:
                    used_templates.add(template)
                    break
                attempts += 1
            
            # Format headline
            title = template.format(region=self.region_name)
            
            # Pick source
            source = self.rng.choice(SOURCES)
            
            # Estimate sentiment
            headline_sentiment = self._headline_sentiment(template, sentiment)
            
            headlines.append(Headline(
                title=title,
                source=source,
                date=day_date.isoformat(),
                sentiment=headline_sentiment,
            ))
        
        # Sort by absolute sentiment (most impactful first)
        headlines.sort(key=lambda h: abs(h.sentiment), reverse=True)
        
        return headlines

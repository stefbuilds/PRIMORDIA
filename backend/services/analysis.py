"""
Signal Analysis Service
=======================

Combines satellite and news signals to compute:
- Normalized scores
- Divergence index
- Risk alerts
- Agent explanations
"""

import math
from dataclasses import dataclass
from typing import Optional

from .news import NewsSignal, Headline
from .satellite import SatelliteSignal


@dataclass
class Alert:
    level: str  # "info", "warning", "critical"
    title: str
    message: str


@dataclass
class AnalysisResult:
    # Normalized scores
    satellite_score: float      # -1 to 1
    news_score: float           # -1 to 1
    divergence_score: float     # 0 to 100
    
    # Raw data
    satellite_raw: dict
    news_raw: dict
    
    # Analysis
    alerts: list[Alert]
    explanation: dict
    
    # Metadata
    data_mode: str  # "LIVE" or "PARTIAL"


class SignalAnalyzer:
    """Analyzes and combines satellite and news signals."""
    
    # Divergence thresholds
    THRESHOLD_ELEVATED = 35
    THRESHOLD_CRITICAL = 60
    
    def _normalize_satellite_score(self, signal: SatelliteSignal) -> float:
        """
        Convert satellite delta to normalized score [-1, 1].
        
        Uses tanh for smooth bounded mapping:
        - ±30% change maps to roughly ±0.5
        - ±60% change maps to roughly ±0.9
        """
        scale = 50.0  # % change that maps to ~0.76
        return math.tanh(signal.activity_delta_pct / scale)
    
    def _normalize_news_score(self, signal: NewsSignal) -> float:
        """
        News sentiment adjusted by source reliability.
        
        Low diversity = echo chamber = less reliable.
        """
        diversity_factor = 0.5 + 0.5 * signal.source_diversity
        return signal.sentiment_score * diversity_factor
    
    def _compute_divergence(
        self,
        sat_score: float,
        news_score: float,
        sat_confidence: float,
        news_confidence: float,
        hype_intensity: float,
    ) -> float:
        """
        Compute divergence index [0, 100].
        
        Higher when:
        - Signals disagree strongly
        - Confidence is high (we trust the readings)
        - Hype is elevated (narrative being pushed)
        """
        # Raw disagreement
        raw_gap = abs(sat_score - news_score) / 2.0  # [0, 1]
        
        # Average confidence
        avg_confidence = (sat_confidence + news_confidence) / 2.0
        
        # Hype amplifier
        hype_amp = 1.0 + (hype_intensity / 100.0) * 0.5  # [1, 1.5]
        
        divergence = raw_gap * avg_confidence * hype_amp * 100.0
        return min(100.0, divergence)
    
    def _generate_alerts(
        self,
        sat_score: float,
        news_score: float,
        divergence: float,
        hype: float,
        sat_source: str,
    ) -> list[Alert]:
        """Generate risk alerts based on signal state."""
        alerts = []
        
        # Data quality alert
        if sat_source == "UNAVAILABLE":
            alerts.append(Alert(
                level="warning",
                title="Satellite Data Unavailable",
                message="Earth Engine data could not be retrieved. Analysis based on news signals only.",
            ))
        
        # Divergence alerts
        if divergence >= self.THRESHOLD_CRITICAL:
            if news_score > 0.15 and sat_score < -0.15:
                alerts.append(Alert(
                    level="critical",
                    title="Hype Divergence",
                    message=f"Bullish narrative ({news_score:+.2f}) contradicts physical contraction ({sat_score:+.2f}). Potential mispricing.",
                ))
            elif news_score < -0.15 and sat_score > 0.15:
                alerts.append(Alert(
                    level="critical",
                    title="Panic Divergence",
                    message=f"Bearish narrative ({news_score:+.2f}) contradicts physical expansion ({sat_score:+.2f}). Potential overreaction.",
                ))
            else:
                alerts.append(Alert(
                    level="critical",
                    title="High Divergence",
                    message=f"Significant disagreement between physical and narrative signals. Divergence: {divergence:.0f}/100.",
                ))
        elif divergence >= self.THRESHOLD_ELEVATED:
            alerts.append(Alert(
                level="warning",
                title="Elevated Divergence",
                message="Moderate disagreement between signals. Worth monitoring for trend confirmation.",
            ))
        else:
            alerts.append(Alert(
                level="info",
                title="Signals Aligned",
                message="Physical activity and market narrative are telling a consistent story.",
            ))
        
        # Hype alert
        if hype >= 60:
            alerts.append(Alert(
                level="warning",
                title="High Hype Detected",
                message=f"News hype intensity at {hype:.0f}%. Potential coordinated narrative or viral spread.",
            ))
        
        return alerts
    
    def _generate_explanation(
        self,
        sat_signal: SatelliteSignal,
        news_signal: NewsSignal,
        sat_score: float,
        news_score: float,
        divergence: float,
        region_name: str,
    ) -> dict:
        """Generate agent explanations."""
        
        # Satellite explanation
        if sat_signal.data_source == "UNAVAILABLE":
            sat_explanation = (
                f"Satellite data for {region_name} is currently unavailable. "
                "Unable to assess physical activity levels."
            )
        else:
            direction = "expansion" if sat_score > 0.1 else "contraction" if sat_score < -0.1 else "stability"
            sat_explanation = (
                f"Satellite analysis shows {direction} (score: {sat_score:+.2f}). "
                f"Night light intensity {sat_signal.night_light_delta_pct:+.1f}% vs {sat_signal.baseline_window_days}-day baseline. "
                f"Data source: {sat_signal.data_source}. "
                f"Confidence: {sat_signal.confidence:.0%}."
            )
        
        # News explanation
        tone = "bullish" if news_score > 0.15 else "bearish" if news_score < -0.15 else "neutral"
        news_explanation = (
            f"Media narrative is {tone} (score: {news_score:+.2f}). "
            f"Analyzed {news_signal.headline_volume} headlines. "
            f"Source diversity: {news_signal.source_diversity:.0%}. "
            f"Hype intensity: {news_signal.hype_intensity:.0f}%. "
            f"Confidence: {news_signal.confidence:.0%}."
        )
        
        # Synthesis
        if divergence >= self.THRESHOLD_CRITICAL:
            intensity = "critical"
        elif divergence >= self.THRESHOLD_ELEVATED:
            intensity = "elevated"
        else:
            intensity = "minimal"
        
        if sat_score > 0.1 and news_score < -0.1:
            div_type = "panic divergence"
            implication = "Market narrative is more negative than physical reality suggests."
        elif sat_score < -0.1 and news_score > 0.1:
            div_type = "hype divergence"
            implication = "Market narrative is more positive than physical reality suggests."
        else:
            div_type = "alignment"
            implication = "Physical and narrative signals agree."
        
        synthesis = (
            f"{region_name}: {intensity} {div_type} (index: {divergence:.0f}/100). "
            f"{implication}"
        )
        
        return {
            "sat_agent": sat_explanation,
            "news_agent": news_explanation,
            "synthesis": synthesis,
        }
    
    def analyze(
        self,
        sat_signal: SatelliteSignal,
        news_signal: NewsSignal,
        region_name: str,
    ) -> AnalysisResult:
        """
        Perform full signal analysis.
        
        Combines satellite and news data to produce divergence score,
        alerts, and explanations.
        """
        # Normalize scores
        sat_score = self._normalize_satellite_score(sat_signal)
        news_score = self._normalize_news_score(news_signal)
        
        # Compute divergence
        divergence = self._compute_divergence(
            sat_score,
            news_score,
            sat_signal.confidence,
            news_signal.confidence,
            news_signal.hype_intensity,
        )
        
        # Generate alerts
        alerts = self._generate_alerts(
            sat_score,
            news_score,
            divergence,
            news_signal.hype_intensity,
            sat_signal.data_source,
        )
        
        # Generate explanations
        explanation = self._generate_explanation(
            sat_signal,
            news_signal,
            sat_score,
            news_score,
            divergence,
            region_name,
        )
        
        # Determine data mode
        if sat_signal.data_source == "UNAVAILABLE":
            data_mode = "PARTIAL"
        else:
            data_mode = "LIVE"
        
        # Build raw data dicts
        satellite_raw = {
            "activity_delta_pct": round(sat_signal.activity_delta_pct, 1),
            "night_light_delta_pct": round(sat_signal.night_light_delta_pct, 1),
            "confidence": round(sat_signal.confidence, 2),
            "anomaly_strength": round(sat_signal.anomaly_strength, 2),
            "baseline_window_days": sat_signal.baseline_window_days,
            "data_source": sat_signal.data_source,
        }
        
        news_raw = {
            "sentiment_score": round(news_signal.sentiment_score, 3),
            "confidence": round(news_signal.confidence, 2),
            "hype_intensity": round(news_signal.hype_intensity, 1),
            "headline_volume": news_signal.headline_volume,
            "source_diversity": round(news_signal.source_diversity, 2),
            "duplicate_ratio": round(news_signal.duplicate_ratio, 2),
            "pump_lexicon_rate": round(news_signal.pump_lexicon_rate, 2),
            "top_headlines": [
                {
                    "title": h.title,
                    "source": h.source,
                    "date": h.published_at,
                    "sentiment": round(h.sentiment, 2),
                }
                for h in news_signal.headlines[:5]
            ],
        }
        
        return AnalysisResult(
            satellite_score=round(sat_score, 3),
            news_score=round(news_score, 3),
            divergence_score=round(divergence, 1),
            satellite_raw=satellite_raw,
            news_raw=news_raw,
            alerts=alerts,
            explanation=explanation,
            data_mode=data_mode,
        )

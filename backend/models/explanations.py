"""
Agent Explanation Generators
============================

These functions generate analytical explanations from the perspective
of two "agents" that interpret different data streams:

1. Satellite Agent: Interprets physical/economic activity from space
2. News Agent: Interprets narrative/sentiment from media

The tone is:
- Analytical and confident
- Data-driven with specific numbers
- No marketing fluff
- Reads like two analysts who might disagree

Future: These could be LLM-generated using the raw data as context,
but templated explanations ensure consistency and low latency for MVP.
"""

from .signals import SatelliteSignal, NewsSignal, SatelliteRaw, NewsRaw


def generate_satellite_explanation(signal: SatelliteSignal, region_name: str) -> str:
    """
    Generate Satellite Agent's analysis.
    
    Future: Feed raw GEE/Vertex data to an LLM for more nuanced explanations.
    """
    raw = signal.raw
    score = signal.score
    
    # Interpret activity direction
    if raw.activity_delta_pct > 15:
        activity_desc = f"Vehicle/vessel activity is up {raw.activity_delta_pct:.0f}% versus baseline"
        activity_interp = "indicating elevated physical throughput"
    elif raw.activity_delta_pct < -15:
        activity_desc = f"Vehicle/vessel activity is down {abs(raw.activity_delta_pct):.0f}% versus baseline"
        activity_interp = "suggesting reduced physical throughput"
    else:
        activity_desc = f"Vehicle/vessel activity is near baseline ({raw.activity_delta_pct:+.0f}%)"
        activity_interp = "showing stable operations"
    
    # Interpret night lights
    if raw.night_light_delta_pct > 10:
        lights_desc = f"Night light intensity is elevated (+{raw.night_light_delta_pct:.0f}%)"
        lights_interp = "consistent with increased economic activity"
    elif raw.night_light_delta_pct < -10:
        lights_desc = f"Night light intensity has declined ({raw.night_light_delta_pct:.0f}%)"
        lights_interp = "which may indicate reduced industrial output"
    else:
        lights_desc = f"Night light patterns are stable ({raw.night_light_delta_pct:+.0f}%)"
        lights_interp = "showing no unusual shifts"
    
    # Confidence qualifier
    if raw.confidence >= 0.8:
        confidence_note = "High-confidence measurements from recent clear-sky imagery."
    elif raw.confidence >= 0.5:
        confidence_note = "Moderate confidence due to partial cloud cover in recent passes."
    else:
        confidence_note = "Low confidence—limited recent imagery available. Interpret with caution."
    
    # Overall assessment
    if score > 0.3:
        assessment = f"Physical indicators for {region_name} are bullish"
        outlook = "Ground truth suggests expansion."
    elif score < -0.3:
        assessment = f"Physical indicators for {region_name} are bearish"
        outlook = "Ground truth suggests contraction."
    else:
        assessment = f"Physical indicators for {region_name} are neutral"
        outlook = "No strong directional signal from space-based observation."
    
    return (
        f"{assessment} (score: {score:+.2f}). "
        f"{activity_desc}, {activity_interp}. "
        f"{lights_desc}, {lights_interp}. "
        f"{confidence_note} {outlook}"
    )


def generate_news_explanation(signal: NewsSignal, region_name: str) -> str:
    """
    Generate News Agent's analysis.
    
    Future: Feed NewsAPI headlines to an LLM for contextual summary.
    """
    raw = signal.raw
    score = signal.score
    
    # Interpret sentiment
    if raw.sentiment_score > 0.3:
        sentiment_desc = f"aggregate sentiment is bullish ({raw.sentiment_score:+.2f})"
        tone = "optimistic"
    elif raw.sentiment_score < -0.3:
        sentiment_desc = f"aggregate sentiment is bearish ({raw.sentiment_score:+.2f})"
        tone = "pessimistic"
    else:
        sentiment_desc = f"aggregate sentiment is neutral ({raw.sentiment_score:+.2f})"
        tone = "balanced"
    
    # Interpret volume and hype
    if raw.hype_intensity >= 70:
        hype_desc = f"Hype intensity is very high ({raw.hype_intensity:.0f}%)"
        hype_interp = "suggesting viral spread or coordinated coverage—treat with skepticism"
    elif raw.hype_intensity >= 40:
        hype_desc = f"Hype intensity is elevated ({raw.hype_intensity:.0f}%)"
        hype_interp = "indicating above-average media attention"
    else:
        hype_desc = f"Hype intensity is normal ({raw.hype_intensity:.0f}%)"
        hype_interp = "with organic coverage patterns"
    
    # Source diversity interpretation
    if raw.source_diversity >= 0.7:
        diversity_note = f"Coverage comes from diverse sources (diversity: {raw.source_diversity:.0%}), lending credibility."
    elif raw.source_diversity >= 0.4:
        diversity_note = f"Moderate source diversity ({raw.source_diversity:.0%})."
    else:
        diversity_note = f"Low source diversity ({raw.source_diversity:.0%})—narrative may be echo-chamber driven."
    
    # Volume context
    volume_note = f"Tracking {raw.headline_count} recent headlines."
    
    # Overall assessment
    if score > 0.3:
        assessment = f"Media narrative for {region_name} is bullish"
    elif score < -0.3:
        assessment = f"Media narrative for {region_name} is bearish"
    else:
        assessment = f"Media narrative for {region_name} is neutral"
    
    return (
        f"{assessment} (score: {score:+.2f}). "
        f"{volume_note} The {sentiment_desc}, with {tone} framing dominant. "
        f"{hype_desc}, {hype_interp}. "
        f"{diversity_note}"
    )


def generate_divergence_explanation(
    sat_signal: SatelliteSignal,
    news_signal: NewsSignal,
    divergence_score: float,
    region_name: str
) -> str:
    """
    Generate a synthesis explanation comparing both signals.
    """
    sat_score = sat_signal.score
    news_score = news_signal.score
    
    if divergence_score >= 75:
        intensity = "extreme"
    elif divergence_score >= 55:
        intensity = "significant"
    elif divergence_score >= 30:
        intensity = "moderate"
    else:
        intensity = "minimal"
    
    # Determine divergence type
    if sat_score > 0.1 and news_score < -0.1:
        divergence_type = "panic divergence"
        implication = "The market narrative is more negative than physical reality suggests. Potential overreaction."
    elif sat_score < -0.1 and news_score > 0.1:
        divergence_type = "hype divergence"
        implication = "The market narrative is more positive than physical reality suggests. Caution warranted."
    elif abs(sat_score - news_score) > 0.5:
        divergence_type = "magnitude divergence"
        implication = "Both signals point the same direction but with very different conviction levels."
    else:
        divergence_type = "alignment"
        implication = "Physical and narrative signals are telling a consistent story."
    
    return (
        f"{region_name} shows {intensity} {divergence_type} "
        f"(score: {divergence_score:.0f}/100). "
        f"Satellite: {sat_score:+.2f}, News: {news_score:+.2f}. "
        f"{implication}"
    )

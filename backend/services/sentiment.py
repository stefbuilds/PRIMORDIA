"""
AI Sentiment Analysis Service
=============================

Uses Google AI (Gemini) via REST API for advanced sentiment analysis.
Falls back to TextBlob if unavailable.

v1.2 - Uses REST API directly to avoid Python 3.14 compatibility issues
"""

import os
import json
import logging
from dataclasses import dataclass
from typing import Optional
from cachetools import TTLCache
import httpx

logger = logging.getLogger(__name__)

_cache = TTLCache(maxsize=200, ttl=1800)  # 30 min cache


@dataclass
class SentimentResult:
    score: float  # -1 to 1
    confidence: float  # 0 to 1
    summary: str
    key_themes: list[str]
    risk_factors: list[str]
    model: str  # "gemini" or "textblob"


class SentimentService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_AI_API_KEY")
        self._gemini_available = bool(self.api_key)
        
        if self._gemini_available:
            logger.info("Gemini AI available via REST API")
        else:
            logger.warning("GOOGLE_AI_API_KEY not set - using TextBlob fallback")
    
    def analyze_headlines(self, headlines: list[str], region: str) -> SentimentResult:
        """Analyze a batch of headlines for sentiment and themes."""
        if not headlines:
            return self._empty_result()
        
        cache_key = f"sentiment:{region}:{hash(tuple(headlines[:10]))}"
        if cache_key in _cache:
            return _cache[cache_key]
        
        if self._gemini_available:
            result = self._analyze_with_gemini_rest(headlines, region)
            if result:
                _cache[cache_key] = result
                return result
        
        # Fallback to TextBlob
        result = self._analyze_with_textblob(headlines)
        _cache[cache_key] = result
        return result
    
    def _analyze_with_gemini_rest(self, headlines: list[str], region: str) -> Optional[SentimentResult]:
        """Use Gemini via REST API directly."""
        try:
            headlines_text = "\n".join(f"- {h}" for h in headlines[:15])
            
            prompt = f"""Analyze these news headlines about {region} for financial/economic sentiment.

Headlines:
{headlines_text}

Respond in this exact JSON format only, no other text:
{{
    "sentiment_score": <float from -1.0 (very bearish) to 1.0 (very bullish)>,
    "confidence": <float from 0.0 to 1.0>,
    "summary": "<one sentence summary of overall sentiment>",
    "key_themes": ["<theme1>", "<theme2>", "<theme3>"],
    "risk_factors": ["<risk1>", "<risk2>"]
}}"""

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
            
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 500,
                }
            }
            
            with httpx.Client(timeout=30) as client:
                response = client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
            
            # Extract text from response
            text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # Parse JSON from response
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            
            result_data = json.loads(text)
            
            return SentimentResult(
                score=max(-1, min(1, float(result_data.get("sentiment_score", 0)))),
                confidence=max(0, min(1, float(result_data.get("confidence", 0.7)))),
                summary=str(result_data.get("summary", ""))[:200],
                key_themes=result_data.get("key_themes", [])[:5],
                risk_factors=result_data.get("risk_factors", [])[:3],
                model="gemini",
            )
            
        except Exception as e:
            logger.error(f"Gemini REST API analysis failed: {e}")
            return None
    
    def _analyze_with_textblob(self, headlines: list[str]) -> SentimentResult:
        from textblob import TextBlob
        
        sentiments = []
        for h in headlines[:20]:
            try:
                blob = TextBlob(h)
                sentiments.append(blob.sentiment.polarity)
            except:
                pass
        
        if not sentiments:
            return self._empty_result()
        
        avg_sentiment = sum(sentiments) / len(sentiments)
        
        # Simple theme extraction
        word_freq = {}
        for h in headlines:
            for word in h.lower().split():
                word = ''.join(c for c in word if c.isalnum())
                if len(word) > 4:
                    word_freq[word] = word_freq.get(word, 0) + 1
        
        themes = [w for w, _ in sorted(word_freq.items(), key=lambda x: -x[1])[:3]]
        
        return SentimentResult(
            score=avg_sentiment,
            confidence=min(0.7, 0.3 + len(sentiments) * 0.02),
            summary=f"Analyzed {len(sentiments)} headlines with {'positive' if avg_sentiment > 0 else 'negative' if avg_sentiment < 0 else 'neutral'} overall sentiment.",
            key_themes=themes,
            risk_factors=[],
            model="textblob",
        )
    
    def _empty_result(self) -> SentimentResult:
        return SentimentResult(
            score=0.0,
            confidence=0.1,
            summary="Insufficient data for analysis.",
            key_themes=[],
            risk_factors=[],
            model="none",
        )

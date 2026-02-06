"""
News & Sentiment Service - Enhanced
====================================

Fetches real news from NewsAPI with better search queries.
Computes sentiment, hype metrics, and extracts key insights.
"""

import os
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional
from cachetools import TTLCache

from newsapi import NewsApiClient
from newsapi.newsapi_exception import NewsAPIException
from textblob import TextBlob

logger = logging.getLogger(__name__)

# Cache results for 10 minutes
_cache = TTLCache(maxsize=100, ttl=600)


@dataclass
class Headline:
    title: str
    source: str
    published_at: str
    url: str
    sentiment: float
    description: str


@dataclass 
class NewsSignal:
    sentiment_score: float
    confidence: float
    hype_intensity: float
    headline_volume: int
    source_diversity: float
    duplicate_ratio: float
    pump_lexicon_rate: float
    headlines: list[Headline]
    trending_topics: list[str]


# Pump/Fear keywords
PUMP_KEYWORDS = ["surge", "soar", "skyrocket", "boom", "explode", "rally", "bullish", "record", "breakthrough", "massive"]
FEAR_KEYWORDS = ["crash", "collapse", "plunge", "crisis", "panic", "fear", "disaster", "bearish", "dump", "warning", "threat"]

# Better search queries with multiple terms
REGION_QUERIES = {
    "shanghai": '("Shanghai" AND (port OR shipping OR trade OR exports OR manufacturing OR economy))',
    "shenzhen": '("Shenzhen" AND (tech OR manufacturing OR exports OR factory OR electronics OR Foxconn))',
    "suez": '("Suez Canal" OR "Red Sea" OR "Suez" AND (shipping OR trade OR blockade OR traffic))',
    "la_port": '("Port of Los Angeles" OR "Long Beach port" OR "LA port" OR "US imports" OR "West Coast shipping")',
    "rotterdam": '("Rotterdam" AND (port OR energy OR shipping OR oil OR gas OR Europe trade))',
}

# Fallback broader queries
FALLBACK_QUERIES = {
    "shanghai": "Shanghai economy trade",
    "shenzhen": "Shenzhen technology manufacturing",
    "suez": "Suez Canal shipping",
    "la_port": "Los Angeles port shipping",
    "rotterdam": "Rotterdam port energy",
}


class NewsService:
    def __init__(self):
        api_key = os.getenv("NEWS_API_KEY")
        if not api_key:
            raise ValueError("NEWS_API_KEY not set")
        self.client = NewsApiClient(api_key=api_key)
    
    def _analyze_sentiment(self, text: str) -> float:
        try:
            return TextBlob(text).sentiment.polarity
        except:
            return 0.0
    
    def _detect_pump_language(self, text: str) -> float:
        text_lower = text.lower()
        count = sum(1 for kw in PUMP_KEYWORDS + FEAR_KEYWORDS if kw in text_lower)
        return min(1.0, count / 4)
    
    def _extract_topics(self, headlines: list[str]) -> list[str]:
        """Extract trending topics from headlines."""
        word_freq = {}
        stop_words = {'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'as', 'with', 'from', 'by', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now', 'new', 'says', 'said'}
        
        for headline in headlines:
            words = headline.lower().replace("'s", "").split()
            for word in words:
                word = ''.join(c for c in word if c.isalnum())
                if len(word) > 3 and word not in stop_words:
                    word_freq[word] = word_freq.get(word, 0) + 1
        
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [w[0].title() for w in sorted_words[:5]]
    
    def _estimate_duplicate_ratio(self, headlines: list[str]) -> float:
        if len(headlines) < 2:
            return 0.0
        
        duplicate_count = 0
        for i, h1 in enumerate(headlines):
            words1 = set(h1.lower().split())
            for h2 in headlines[i+1:]:
                words2 = set(h2.lower().split())
                overlap = len(words1 & words2) / max(len(words1 | words2), 1)
                if overlap > 0.5:
                    duplicate_count += 1
                    break
        
        return min(1.0, duplicate_count / len(headlines))
    
    def fetch_news(self, region_id: str, days_back: int = 7) -> NewsSignal:
        cache_key = f"{region_id}:{days_back}"
        if cache_key in _cache:
            return _cache[cache_key]
        
        from_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        articles = []
        
        # Try primary query first
        query = REGION_QUERIES.get(region_id, region_id)
        try:
            response = self.client.get_everything(
                q=query,
                from_param=from_date,
                language="en",
                sort_by="relevancy",
                page_size=100,
            )
            articles = response.get("articles", [])
        except NewsAPIException as e:
            logger.warning(f"Primary query failed for {region_id}: {e}")
        
        # Fallback if no results
        if len(articles) < 5:
            fallback = FALLBACK_QUERIES.get(region_id, region_id)
            try:
                response = self.client.get_everything(
                    q=fallback,
                    from_param=from_date,
                    language="en",
                    sort_by="publishedAt",
                    page_size=50,
                )
                articles.extend(response.get("articles", []))
            except:
                pass
        
        if not articles:
            return self._empty_signal()
        
        # Process articles
        headlines = []
        sentiments = []
        pump_rates = []
        sources = set()
        
        seen_titles = set()
        for article in articles[:50]:
            title = article.get("title", "")
            if not title or title == "[Removed]" or title in seen_titles:
                continue
            seen_titles.add(title)
            
            source = article.get("source", {}).get("name", "Unknown")
            published = article.get("publishedAt", "")[:10]
            url = article.get("url", "")
            description = article.get("description", "") or ""
            
            # Analyze full text
            full_text = f"{title} {description}"
            sentiment = self._analyze_sentiment(full_text)
            pump_rate = self._detect_pump_language(full_text)
            
            sentiments.append(sentiment)
            pump_rates.append(pump_rate)
            sources.add(source)
            
            headlines.append(Headline(
                title=title,
                source=source,
                published_at=published,
                url=url,
                sentiment=sentiment,
                description=description[:200] if description else "",
            ))
        
        if not headlines:
            return self._empty_signal()
        
        # Compute metrics
        avg_sentiment = sum(sentiments) / len(sentiments)
        avg_pump_rate = sum(pump_rates) / len(pump_rates)
        source_diversity = min(1.0, len(sources) / max(len(headlines), 1) * 2)
        duplicate_ratio = self._estimate_duplicate_ratio([h.title for h in headlines])
        
        # Hype intensity
        volume_factor = min(1.0, len(headlines) / 15)
        hype_intensity = (
            avg_pump_rate * 35 +
            (1 - source_diversity) * 25 +
            duplicate_ratio * 25 +
            volume_factor * 15
        )
        hype_intensity = min(100, max(0, hype_intensity))
        
        # Confidence
        confidence = min(0.95, 0.3 + volume_factor * 0.35 + source_diversity * 0.3)
        
        # Adjusted sentiment
        diversity_factor = 0.5 + 0.5 * source_diversity
        adjusted_sentiment = avg_sentiment * diversity_factor
        
        # Extract topics
        topics = self._extract_topics([h.title for h in headlines])
        
        # Sort by relevance (sentiment strength)
        headlines.sort(key=lambda h: abs(h.sentiment), reverse=True)
        
        result = NewsSignal(
            sentiment_score=adjusted_sentiment,
            confidence=confidence,
            hype_intensity=hype_intensity,
            headline_volume=len(headlines),
            source_diversity=source_diversity,
            duplicate_ratio=duplicate_ratio,
            pump_lexicon_rate=avg_pump_rate,
            headlines=headlines[:10],
            trending_topics=topics,
        )
        
        _cache[cache_key] = result
        return result
    
    def _empty_signal(self) -> NewsSignal:
        return NewsSignal(
            sentiment_score=0.0,
            confidence=0.2,
            hype_intensity=0.0,
            headline_volume=0,
            source_diversity=0.0,
            duplicate_ratio=0.0,
            pump_lexicon_rate=0.0,
            headlines=[],
            trending_topics=[],
        )

"""
AI Chat Service (DeepSeek)
==========================

Provides investment advice based on current signals and news.
"""

import os
import logging
from dataclasses import dataclass
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

SYSTEM_PROMPT = """You are an expert financial analyst and investment advisor working for Global Pulse, an intelligence platform that monitors physical activity signals (from satellite data) and compares them to market narratives (news sentiment).

Your role is to provide clear, actionable investment insights based on the data provided. You should:
1. Analyze the divergence between physical reality (satellite signals) and market narrative (news)
2. Identify potential opportunities when signals diverge significantly
3. Warn about risks when hype exceeds physical evidence
4. Provide specific, data-driven recommendations
5. Be direct and confident, but acknowledge uncertainty when appropriate

Important context about the signals:
- Satellite Score (-1 to +1): Measures physical economic activity (night lights, port activity, etc.)
- News Score (-1 to +1): Measures market sentiment from news headlines
- Divergence Score (0-100): How much physical reality differs from market narrative
- Market data shows relevant ETF/stock performance

When divergence is HIGH (>50):
- If satellite > news: Physical reality is stronger than narrative suggests - potential undervalued opportunity
- If news > satellite: Narrative is more bullish than reality - potential overvaluation risk

Be conversational but professional. Give specific insights, not generic advice."""


@dataclass
class ChatMessage:
    role: str  # "user" or "assistant"
    content: str


@dataclass
class ChatContext:
    region_name: str
    satellite_score: float
    news_score: float
    market_score: Optional[float]
    divergence_score: float
    satellite_trend: str
    headlines: list[str]
    ai_summary: Optional[str]
    market_ticker: Optional[str]
    market_price: Optional[float]
    market_change: Optional[float]


class ChatService:
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        if not self.api_key:
            logger.warning("DEEPSEEK_API_KEY not set - chat disabled")
            self._enabled = False
        else:
            self._enabled = True
            logger.info("DeepSeek chat service ready")
    
    def _build_context_message(self, context: ChatContext) -> str:
        """Build a context summary for the AI."""
        lines = [
            f"CURRENT ANALYSIS FOR: {context.region_name}",
            f"",
            f"SIGNAL SCORES:",
            f"- Physical Reality (Satellite): {context.satellite_score:+.2f} ({context.satellite_trend})",
            f"- Market Narrative (News): {context.news_score:+.2f}",
            f"- Divergence Index: {context.divergence_score:.0f}/100",
        ]
        
        if context.market_score is not None:
            lines.append(f"- Market Signal: {context.market_score:+.2f}")
        
        if context.market_ticker and context.market_price:
            lines.extend([
                f"",
                f"MARKET DATA:",
                f"- Tracking: {context.market_ticker}",
                f"- Price: ${context.market_price:.2f}",
                f"- 7-day change: {context.market_change:+.1f}%",
            ])
        
        if context.ai_summary:
            lines.extend([
                f"",
                f"AI SENTIMENT ANALYSIS:",
                f"{context.ai_summary}",
            ])
        
        if context.headlines:
            lines.extend([
                f"",
                f"TOP HEADLINES:",
            ])
            for h in context.headlines[:5]:
                lines.append(f"- {h}")
        
        return "\n".join(lines)
    
    def chat(self, user_message: str, context: ChatContext, history: list[ChatMessage] = None) -> Optional[str]:
        """Send a chat message and get a response."""
        if not self._enabled:
            return "Chat service is not configured. Please set DEEPSEEK_API_KEY."
        
        try:
            # Build messages array
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            
            # Add context as first user message if this is a new conversation
            if not history:
                context_msg = self._build_context_message(context)
                messages.append({
                    "role": "user",
                    "content": f"Here's my current market data:\n\n{context_msg}\n\nI'll ask you questions about this."
                })
                messages.append({
                    "role": "assistant",
                    "content": f"I've reviewed the current signals for {context.region_name}. The divergence score of {context.divergence_score:.0f}/100 is {'significant' if context.divergence_score > 50 else 'moderate' if context.divergence_score > 30 else 'low'}. What would you like to know about this region or how I interpret these signals?"
                })
            else:
                # Add history
                for msg in history[-10:]:  # Keep last 10 messages
                    messages.append({"role": msg.role, "content": msg.content})
            
            # Add current user message
            messages.append({"role": "user", "content": user_message})
            
            # Call DeepSeek API
            with httpx.Client(timeout=60) as client:
                response = client.post(
                    DEEPSEEK_API_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 1000,
                    }
                )
                response.raise_for_status()
                data = response.json()
            
            return data["choices"][0]["message"]["content"]
            
        except Exception as e:
            logger.error(f"DeepSeek API error: {e}")
            return f"Sorry, I encountered an error processing your request. Please try again."

'use client';

import { useState, useRef, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBoxProps {
  regionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatBox({ regionId, isOpen, onClose }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hi! I'm Sova, your investment advisor. I have access to all the current signals, news, and market data for this region. Ask me anything about:\n\n• Signal interpretation\n• Investment opportunities\n• Risk assessment\n• Market trends\n\nWhat would you like to know?"
      }]);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          region_id: regionId,
          history: messages.slice(-10),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I couldn't process your request. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out ${isClosing ? 'opacity-0 translate-y-4 scale-95' : 'animate-chat-open'}`}>
      <div className="w-[420px] h-[620px] bg-gradient-to-b from-neutral-900 to-neutral-950 rounded-3xl border border-neutral-700/50 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800/60 bg-neutral-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center border border-white/10 shadow-inner">
              {/* Dart Icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 22L12 12M22 2L12 12M12 12L18.5 18.5M12 12L5.5 5.5M22 2L22 9M22 2L15 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight">Sova</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <p className="text-[11px] text-neutral-400 font-medium">Investment Advisor</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 active:scale-95 transition-all duration-150"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-in`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 transition-all ${
                  msg.role === 'user'
                    ? 'bg-white text-neutral-900 rounded-br-sm shadow-lg'
                    : 'bg-neutral-800/80 text-neutral-100 rounded-bl-sm border border-neutral-700/50'
                }`}
              >
                <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start animate-message-in">
              <div className="bg-neutral-800/80 rounded-2xl rounded-bl-sm px-5 py-4 border border-neutral-700/50">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-5 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[
              "Should I invest now?",
              "What are the risks?",
              "Explain the divergence",
              "Market outlook?",
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => { setInput(q); inputRef.current?.focus(); }}
                className="flex-shrink-0 text-[11px] px-3.5 py-2 rounded-full bg-neutral-800/60 text-neutral-400 hover:bg-neutral-700 hover:text-white border border-neutral-700/40 hover:border-neutral-600 transition-all duration-150 active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-neutral-800/60 bg-neutral-950/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Sova anything..."
              className="flex-1 bg-neutral-800/60 rounded-xl px-4 py-3.5 text-sm placeholder-neutral-500 border border-neutral-700/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-600 transition-all"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 shadow-lg"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

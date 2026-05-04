import React, { useState, useCallback, useRef, useEffect } from 'react';
import useAIStore from '../../stores/useAIStore';
import useProjectStore from '../../stores/useProjectStore';
import { analyzeProject, chatStream, isAIAvailable } from '../../services/aiService';

export default function AIAdvisorPanel() {
  const messages = useAIStore(s => s.messages);
  const suggestions = useAIStore(s => s.suggestions);
  const isAnalyzing = useAIStore(s => s.isAnalyzing);
  const isStreaming = useAIStore(s => s.isStreaming);
  const status = useAIStore(s => s.status);
  const addMessage = useAIStore(s => s.addMessage);
  const updateLastMessage = useAIStore(s => s.updateLastMessage);
  const setSuggestions = useAIStore(s => s.setSuggestions);
  const setIsAnalyzing = useAIStore(s => s.setIsAnalyzing);
  const setIsStreaming = useAIStore(s => s.setIsStreaming);
  const lastAnalyzedAt = useAIStore(s => s.lastAnalyzedAt);
  const setLastAnalyzedAt = useAIStore(s => s.setLastAnalyzedAt);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const analyzeTimeoutRef = useRef(null);
  const aiAvailable = isAIAvailable();

  // Track clip changes for auto-analyze
  const tracks = useProjectStore(s => s.tracks);
  const clipCount = tracks.reduce((sum, t) => sum + t.clips.length, 0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, suggestions]);

  // Auto-analyze when clips change (debounced 3 seconds)
  useEffect(() => {
    if (!aiAvailable || clipCount === 0) return;
    if (Date.now() - lastAnalyzedAt < 10000) return; // Don't re-analyze within 10s

    if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
    analyzeTimeoutRef.current = setTimeout(() => {
      handleAnalyze();
    }, 3000);

    return () => {
      if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
    };
  }, [clipCount]);

  const handleAnalyze = useCallback(async () => {
    if (!aiAvailable) return;
    setIsAnalyzing(true);
    try {
      const snapshot = useProjectStore.getState().getProjectSnapshot();
      const results = await analyzeProject(snapshot);
      setSuggestions(results);
      setLastAnalyzedAt(Date.now());
    } catch (err) {
      addMessage({ role: 'system', content: `Analysis failed: ${err.message}` });
    }
    setIsAnalyzing(false);
  }, [aiAvailable, setIsAnalyzing, setSuggestions, addMessage, setLastAnalyzedAt]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !aiAvailable || isStreaming) return;
    const msg = input.trim();
    setInput('');
    addMessage({ role: 'user', content: msg });

    // Add empty assistant message for streaming
    addMessage({ role: 'assistant', content: '' });
    setIsStreaming(true);

    try {
      const snapshot = useProjectStore.getState().getProjectSnapshot();
      const history = useAIStore.getState().messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      let fullResponse = '';
      for await (const chunk of chatStream(msg, history, snapshot)) {
        fullResponse += chunk;
        updateLastMessage(fullResponse);
      }
    } catch (err) {
      updateLastMessage(`Error: ${err.message}`);
    }
    setIsStreaming(false);
  }, [input, aiAvailable, isStreaming, addMessage, updateLastMessage, setIsStreaming]);

  const priorityColors = {
    high: 'var(--color-accent-warm)',
    medium: 'var(--color-accent-primary)',
    low: 'var(--color-accent-secondary)',
  };

  const categoryIcons = {
    Pacing: '⏱', Hook: '🎯', Audio: '🔊', Visual: '🎨',
    Captions: '📝', Structure: '📐', PACING: '⏱', COMPOSITION: '🎨',
    AUDIO: '🔊', STORY: '📖', POLISH: '✨', PLATFORM: '📱',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="ai-header">
        <span className="ai-sparkle">✦</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>
            AI Director
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {aiAvailable && <div className="ai-status-dot" />}
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              {!aiAvailable ? 'Configure API key to enable' : isAnalyzing ? 'Analyzing...' : isStreaming ? 'Thinking...' : 'Watching your project'}
            </span>
          </div>
        </div>
      </div>

      {/* Analyze button */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-ai-border)' }}>
        <button
          className="btn-ai"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !aiAvailable}
          style={{ width: '100%', justifyContent: 'center', opacity: (isAnalyzing || !aiAvailable) ? 0.6 : 1 }}
        >
          {isAnalyzing ? (
            <>
              <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              Analyzing...
            </>
          ) : (
            <>
              <span>✦</span> Analyze Project
            </>
          )}
        </button>
      </div>

      {/* Suggestions + Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {/* Suggestions */}
        {suggestions.map((s, i) => (
          <div key={s.id || i} className="ai-suggestion-card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{categoryIcons[s.category] || '💡'}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                color: priorityColors[s.priority] || 'var(--color-text-muted)',
              }}>
                {s.category}
              </span>
              {s.priority && (
                <span style={{
                  fontSize: 8, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                  background: `${priorityColors[s.priority]}15`,
                  color: priorityColors[s.priority],
                  marginLeft: 'auto',
                }}>
                  {s.priority}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>
              {s.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              {s.suggestion || s.description}
            </div>
          </div>
        ))}

        {/* Chat messages */}
        {messages.map((m, i) => (
          <div key={m.id || i} style={{
            padding: '8px 14px',
            fontSize: 12,
            lineHeight: 1.6,
            color: m.role === 'system' ? 'var(--color-text-muted)' : m.role === 'user' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            fontStyle: m.role === 'system' ? 'italic' : 'normal',
          }}>
            {m.role === 'user' && <span style={{ fontWeight: 600, color: 'var(--color-accent-primary)' }}>You: </span>}
            {m.role === 'assistant' && <span style={{ fontWeight: 600, color: 'var(--color-accent-secondary)' }}>AI: </span>}
            <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
            {m.role === 'assistant' && isStreaming && i === messages.length - 1 && (
              <span style={{ display: 'inline-block', width: 6, height: 14, background: 'var(--color-accent-secondary)', marginLeft: 2, animation: 'pulse-dot 0.8s infinite', verticalAlign: 'middle' }} />
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />

        {/* Empty state */}
        {suggestions.length === 0 && messages.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✦</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
              Your AI Director is ready
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              {aiAvailable
                ? 'Add some clips to your timeline, then click "Analyze Project" for creative feedback and suggestions.'
                : 'Set VITE_GEMINI_API_KEY in your .env file or configure Supabase Edge Functions to enable AI features.'}
            </div>
          </div>
        )}

        {/* Powered by badge */}
        <div style={{ padding: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: 0.5 }}>
            Powered by Gemma 3 27B ✦
          </span>
        </div>
      </div>

      {/* Chat input */}
      <div className="ai-chat-input">
        <input
          type="text"
          className="input-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={aiAvailable ? 'Ask the AI Director...' : 'AI not configured'}
          disabled={!aiAvailable || isStreaming}
          style={{ fontSize: 12, height: 34 }}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
        />
        <button
          className="btn-ai"
          onClick={handleSend}
          disabled={!aiAvailable || isStreaming || !input.trim()}
          style={{ padding: '4px 14px', fontSize: 12, flexShrink: 0, opacity: (!aiAvailable || isStreaming || !input.trim()) ? 0.5 : 1 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}

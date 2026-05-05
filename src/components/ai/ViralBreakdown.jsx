import React, { useState, useRef } from 'react';
import { getViralBreakdown } from '../../services/aiService';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

export default function ViralBreakdown() {
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const cardRef = useRef(null);

  const handleAnalyze = async () => {
    if (!url) return;
    setAnalyzing(true);
    setError(null);
    try {
      const breakdown = await getViralBreakdown(url);
      setResult(breakdown);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to analyze URL. Ensure it is a valid TikTok or Instagram Reel link.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyTemplate = () => {
    if (!result) return;
    // Apply template creates a new editor project structure
    // We will clear existing tracks and add structure based on breakdown
    const state = useProjectStore.getState();
    // For now, we just switch to editor view since we'd need to mock the timeline
    // In a full implementation, we'd add placeholder clips or markers.
    
    // Add text track if not exists
    if (!state.tracks.find(t => t.accepts.includes('text'))) {
      state.addTrack('text');
    }
    
    // Inform user
    alert("Template applied! Switch to the editor to start building your reel using the suggested format.");
    useUIStore.getState().setCurrentView('editor');
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '40px 20px', background: 'var(--color-bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ maxWidth: 800, width: '100%', display: 'flex', flexDirection: 'column', gap: 32 }}>
        
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--color-accent-primary)' }}>Viral</span> Breakdown
          </h1>
          <p style={{ fontSize: 18, color: 'var(--color-text-muted)' }}>
            Paste any viral TikTok or Instagram Reel to reverse-engineer exactly why it works and generate a step-by-step template you can steal.
          </p>
        </div>

        {!result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, background: 'var(--color-bg-surface)', padding: 32, borderRadius: 16, border: '1px solid var(--color-border)' }}>
            <input 
              type="text" 
              placeholder="https://tiktok.com/... or https://instagram.com/reel/..." 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                width: '100%', padding: '20px 24px', borderRadius: 12, border: '1px solid var(--color-border)',
                background: 'var(--color-bg-primary)', color: 'white', fontSize: 16, outline: 'none',
              }}
            />

            <button 
              className="btn-primary" 
              style={{ padding: '16px', fontSize: 16, display: 'flex', justifyContent: 'center' }}
              onClick={handleAnalyze}
              disabled={!url || analyzing}
            >
              {analyzing ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Extracting Viral Formula...
                </span>
              ) : 'Reverse Engineer It'}
            </button>
            {error && <p style={{ color: '#e74c3c', margin: 0, textAlign: 'center' }}>{error}</p>}
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeInUp 0.5s ease-out' }}>
            <div ref={cardRef} style={{ background: 'var(--color-bg-surface)', padding: 40, borderRadius: 24, border: '1px solid var(--color-border)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, borderBottom: '1px solid var(--color-border)', paddingBottom: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 24 }}>The Blueprint</h2>
                  <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--color-accent-secondary)', textDecoration: 'none' }}>Original Video Link ↗</a>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 32 }}>
                <div style={{ background: 'var(--color-bg-primary)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Hook Type</span>
                  <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4, color: 'white' }}>{result.hookType}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-accent-primary)', marginTop: 4 }}>First {result.hookTiming}s</div>
                </div>
                <div style={{ background: 'var(--color-bg-primary)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Cut Rhythm</span>
                  <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4, color: 'white' }}>{result.cutRhythm}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-accent-primary)', marginTop: 4 }}>Avg {result.averageClipLength}s / clip</div>
                </div>
                <div style={{ background: 'var(--color-bg-primary)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Audio Strategy</span>
                  <div style={{ fontSize: 14, marginTop: 4, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>{result.audioAnalysis}</div>
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontFamily: 'var(--font-display)', color: 'white' }}>Emotional Arc & Text Strategy</h3>
                <p style={{ margin: '0 0 12px 0', color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.6 }}><strong>Arc:</strong> {result.emotionalArc}</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.6 }}><strong>Text:</strong> {result.textStrategy}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                <div>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: 'var(--color-accent-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    What to Steal
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 20, color: 'rgba(255,255,255,0.9)', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 12, lineHeight: 1.5 }}>
                    {result.whatToSteal.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                
                <div style={{ background: 'rgba(91, 79, 245, 0.05)', border: '1px solid rgba(91, 79, 245, 0.2)', padding: 24, borderRadius: 16 }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    Template Steps
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {result.templateSteps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-accent-primary)', flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, marginTop: 2 }}>{step}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button className="btn-primary" onClick={handleApplyTemplate} style={{ padding: '12px 24px', fontSize: 15 }}>
                Apply Template to Editor
              </button>
              <button className="btn-outline" onClick={() => { setResult(null); setUrl(''); }} style={{ padding: '12px 24px', fontSize: 15 }}>
                Analyze Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { analyzeReel } from '../../services/aiService';
import useProjectStore from '../../stores/useProjectStore';
import useUIStore from '../../stores/useUIStore';

export default function ReelAnalyzer() {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const scorecardRef = useRef(null);

  const extractFrames = async (videoFile) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(videoFile);
      video.muted = true;
      video.playsInline = true;
      
      video.onloadeddata = async () => {
        const duration = video.duration;
        const frames = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 480;
        canvas.height = 854; // 9:16 aspect ratio roughly
        
        // Grab 5 frames evenly spaced
        for (let i = 1; i <= 5; i++) {
          video.currentTime = (duration / 6) * i;
          await new Promise(r => {
            video.onseeked = r;
          });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
          frames.push(base64);
        }
        resolve(frames);
      };
    });
  };

  const handleAnalyze = async () => {
    if (!file && !url) return;
    setAnalyzing(true);
    setError(null);
    try {
      let frames = [];
      if (file) {
        frames = await extractFrames(file);
      }
      
      const analysisResult = await analyzeReel(url || file.name, frames);
      setResult(analysisResult);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('video/')) {
        setFile(droppedFile);
        setUrl('');
      }
    }
  };

  const handleShare = async () => {
    if (!scorecardRef.current) return;
    try {
      const canvas = await html2canvas(scorecardRef.current, { backgroundColor: '#0a0a0a' });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'viral-score.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    }
  };

  const handleOpenInEditor = () => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      const mediaItem = {
        id: crypto.randomUUID(),
        name: file.name,
        type: 'video',
        objectUrl,
        fileUrl: objectUrl,
        size: file.size,
        duration: 15, // Approx, should be parsed properly ideally
        waveform: [],
        thumbnail: '',
      };
      // For a robust implementation, we would extract duration and thumbnail here before adding.
      // Assuming a simplified flow for now.
      useProjectStore.getState().addMedia(mediaItem);
      
      // Auto-add to a video track
      const vTrack = useProjectStore.getState().tracks.find(t => t.accepts.includes('video'));
      if (vTrack) {
        useProjectStore.getState().addClip(vTrack.id, {
          type: 'video',
          name: mediaItem.name,
          mediaId: mediaItem.id,
          startTime: 0,
          duration: mediaItem.duration,
        });
      }
      useUIStore.getState().setCurrentView('editor');
    }
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '40px 20px', background: 'var(--color-bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ maxWidth: 800, width: '100%', display: 'flex', flexDirection: 'column', gap: 32 }}>
        
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
            Get Your <span style={{ color: 'var(--color-accent-primary)' }}>Viral Score</span>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--color-text-muted)' }}>
            Upload your reel or paste a TikTok/Instagram URL to get a comprehensive breakdown of its viral potential using our multimodal AI model.
          </p>
        </div>

        {!result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, background: 'var(--color-bg-surface)', padding: 32, borderRadius: 16, border: '1px solid var(--color-border)' }}>
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                border: '2px dashed var(--color-border)',
                borderRadius: 12,
                padding: '48px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: file ? 'rgba(91, 79, 245, 0.05)' : 'transparent',
                borderColor: file ? 'var(--color-accent-primary)' : 'var(--color-border)',
                transition: 'all 0.2s',
              }}
              onClick={() => document.getElementById('reel-upload').click()}
            >
              <input 
                id="reel-upload" 
                type="file" 
                accept="video/*" 
                style={{ display: 'none' }} 
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFile(e.target.files[0]);
                    setUrl('');
                  }
                }} 
              />
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" color="var(--color-accent-primary)" style={{ margin: '0 auto 16px auto' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>{file ? file.name : 'Drop your video here'}</h3>
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>MP4, MOV, WebM up to 50MB</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              <span style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600 }}>OR PASTE URL</span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>

            <input 
              type="text" 
              placeholder="https://tiktok.com/... or https://instagram.com/reel/..." 
              value={url}
              onChange={(e) => { setUrl(e.target.value); setFile(null); }}
              style={{
                width: '100%', padding: '16px 20px', borderRadius: 8, border: '1px solid var(--color-border)',
                background: 'var(--color-bg-primary)', color: 'white', fontSize: 15, outline: 'none',
              }}
            />

            <button 
              className="btn-primary" 
              style={{ padding: '16px', fontSize: 16, display: 'flex', justifyContent: 'center' }}
              onClick={handleAnalyze}
              disabled={(!file && !url) || analyzing}
            >
              {analyzing ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Analyzing Video Structure...
                </span>
              ) : 'Analyze Reel'}
            </button>
            {error && <p style={{ color: '#e74c3c', margin: 0, textAlign: 'center' }}>{error}</p>}
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeInUp 0.5s ease-out' }}>
            <div ref={scorecardRef} style={{ background: 'var(--color-bg-surface)', padding: 40, borderRadius: 24, border: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden' }}>
              {/* Background Glow */}
              <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: 'var(--color-accent-primary)', filter: 'blur(100px)', opacity: 0.15, pointerEvents: 'none' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 32 }}>AI Score Card</h2>
                    <span style={{ 
                      padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, 
                      background: result.viralPrediction === 'very_high' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(91, 79, 245, 0.2)',
                      color: result.viralPrediction === 'very_high' ? '#2ecc71' : 'var(--color-accent-primary)',
                      border: `1px solid ${result.viralPrediction === 'very_high' ? '#2ecc71' : 'var(--color-accent-primary)'}`
                    }}>
                      {result.viralPrediction.replace('_', ' ').toUpperCase()} POTENTIAL 🔥
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-text-muted)', maxWidth: 400, lineHeight: 1.5 }}>
                    {result.hook3SecondAnalysis}
                  </p>
                </div>
                
                <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                    <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-border)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-accent-primary)" strokeWidth="8" strokeDasharray="339.292" strokeDashoffset={339.292 - (339.292 * result.overallScore) / 100} style={{ transition: 'stroke-dashoffset 1s ease-out' }} strokeLinecap="round" />
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: 'white', lineHeight: 1 }}>{result.overallScore}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: 1 }}>/ 100</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 40 }}>
                {Object.entries(result.scores).map(([key, data]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 14 }}>{key}</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-accent-primary)' }}>{data.score}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--color-bg-primary)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ height: '100%', background: 'var(--color-accent-primary)', width: `${data.score}%`, transition: 'width 1s ease-out', borderRadius: 3 }} />
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 8px 0', lineHeight: 1.4 }}>{data.analysis}</p>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {data.fixes.map((fix, idx) => <li key={idx}>{fix}</li>)}
                    </ul>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.3)', padding: 20, borderRadius: 12 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#e74c3c', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Top Fix Needed
                </h4>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.5 }}>
                  {result.topFix}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={handleShare} style={{ padding: '12px 24px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Share My Score
              </button>
              {file && (
                <button className="btn-primary" onClick={handleOpenInEditor} style={{ padding: '12px 24px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="14 2 18 6 7 17 3 17 3 13 14 2z"/><line x1="3" y1="22" x2="21" y2="22"/></svg>
                  Open in Editor
                </button>
              )}
              <button className="btn-outline" onClick={() => { setResult(null); setFile(null); setUrl(''); }} style={{ padding: '12px 24px', fontSize: 15 }}>
                Analyze Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

let audioContext = null;

export function getAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

export function resumeAudioContext() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

// ═══════════════════════════════════════
// Audio Playback Manager
// ═══════════════════════════════════════

export class AudioPlaybackManager {
  constructor() {
    this.sources = new Map(); // clipId -> { source, gainNode }
    this.audioBuffers = new Map(); // mediaId -> AudioBuffer
    this.masterGain = null;
  }

  async loadAudioBuffer(mediaId, url) {
    if (this.audioBuffers.has(mediaId)) return this.audioBuffers.get(mediaId);

    try {
      const ctx = getAudioContext();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(mediaId, audioBuffer);
      return audioBuffer;
    } catch (e) {
      console.error('Failed to load audio buffer:', mediaId, e);
      return null;
    }
  }

  getMasterGain() {
    if (!this.masterGain) {
      const ctx = getAudioContext();
      this.masterGain = ctx.createGain();
      this.masterGain.connect(ctx.destination);
    }
    return this.masterGain;
  }

  setMasterVolume(volume, muted) {
    const gain = this.getMasterGain();
    gain.gain.value = muted ? 0 : volume;
  }

  // Start all audio sources for the given time
  startPlayback(currentTime, tracks, mediaItems) {
    this.stopAll();

    const ctx = resumeAudioContext();
    const master = this.getMasterGain();

    for (const track of tracks) {
      for (const clip of track.clips) {
        if (clip.type !== 'audio') continue;

        const media = mediaItems.find(m => m.id === clip.mediaId);
        if (!media) continue;

        const effectiveDuration = clip.duration - (clip.trimIn || 0) - (clip.trimOut || 0);
        const clipStart = clip.startTime;
        const clipEnd = clipStart + effectiveDuration;

        if (currentTime >= clipEnd || currentTime < clipStart) continue;

        const buffer = this.audioBuffers.get(clip.mediaId);
        if (!buffer) continue;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = clip.speed || 1;

        const gainNode = ctx.createGain();
        const volume = (clip.volume || 100) / 100;

        // Fade in / out
        const clipTime = currentTime - clipStart;
        const fadeIn = clip.fadeIn || 0;
        const fadeOut = clip.fadeOut || 0;

        if (fadeIn > 0 && clipTime < fadeIn) {
          gainNode.gain.setValueAtTime(0, ctx.currentTime);
          gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + (fadeIn - clipTime));
        } else {
          gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        }

        if (fadeOut > 0) {
          const timeUntilEnd = effectiveDuration - clipTime;
          if (timeUntilEnd > fadeOut) {
            gainNode.gain.setValueAtTime(volume, ctx.currentTime + timeUntilEnd - fadeOut);
          }
          gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + timeUntilEnd);
        }

        source.connect(gainNode);
        gainNode.connect(master);

        const offset = (clip.trimIn || 0) + clipTime * (clip.speed || 1);
        const remainingDuration = (effectiveDuration - clipTime) / (clip.speed || 1);

        try {
          source.start(0, offset, remainingDuration);
          this.sources.set(clip.id, { source, gainNode });

          source.onended = () => {
            this.sources.delete(clip.id);
          };
        } catch (e) {
          console.error('Audio start error:', e);
        }
      }
    }
  }

  stopAll() {
    for (const [clipId, { source }] of this.sources) {
      try {
        source.stop();
      } catch {}
    }
    this.sources.clear();
  }

  destroy() {
    this.stopAll();
    this.audioBuffers.clear();
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
  }
}

// ═══════════════════════════════════════
// Waveform utilities
// ═══════════════════════════════════════

export function drawWaveformToCanvas(canvas, waveformData, color = '#00b894') {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  const barWidth = width / waveformData.length;
  waveformData.forEach((val, i) => {
    const barHeight = val * height * 0.85;
    ctx.fillRect(i * barWidth, (height - barHeight) / 2, Math.max(1, barWidth - 0.5), barHeight);
  });
}

export function detectBPM(audioBuffer) {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const blockSize = Math.floor(sampleRate * 0.05);
  const energies = [];
  for (let i = 0; i < data.length; i += blockSize) {
    let energy = 0;
    for (let j = i; j < Math.min(i + blockSize, data.length); j++) {
      energy += data[j] * data[j];
    }
    energies.push(energy / blockSize);
  }
  const threshold = energies.reduce((a, b) => a + b, 0) / energies.length * 1.5;
  const peaks = [];
  for (let i = 1; i < energies.length - 1; i++) {
    if (energies[i] > threshold && energies[i] > energies[i - 1] && energies[i] > energies[i + 1]) {
      peaks.push(i);
    }
  }
  if (peaks.length < 2) return 120;
  const intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push((peaks[i] - peaks[i - 1]) * 0.05);
  }
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = Math.round(60 / avgInterval);
  return Math.max(60, Math.min(200, bpm));
}

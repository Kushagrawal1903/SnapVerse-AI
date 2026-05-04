import { FILTERS, ASPECT_RATIOS } from '../utils/constants';

export class CanvasEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mediaElements = {}; // mediaId -> { element, ready }
    this.animationId = null;
  }

  setSize(aspectRatio) {
    const ar = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['9:16'];
    this.canvas.width = ar.displayW;
    this.canvas.height = ar.displayH;
  }

  registerMedia(mediaId, element) {
    this.mediaElements[mediaId] = { element, ready: false };

    if (element.tagName === 'VIDEO') {
      element.addEventListener('canplay', () => {
        if (this.mediaElements[mediaId]) {
          this.mediaElements[mediaId].ready = true;
        }
      }, { once: false });
      // If already ready
      if (element.readyState >= 2) {
        this.mediaElements[mediaId].ready = true;
      }
    } else {
      // Images are ready when loaded
      if (element.complete || element.naturalWidth > 0) {
        this.mediaElements[mediaId].ready = true;
      } else {
        element.addEventListener('load', () => {
          if (this.mediaElements[mediaId]) {
            this.mediaElements[mediaId].ready = true;
          }
        }, { once: true });
      }
    }
  }

  unregisterMedia(mediaId) {
    delete this.mediaElements[mediaId];
  }

  getMediaElement(mediaId) {
    const entry = this.mediaElements[mediaId];
    return entry?.ready ? entry.element : null;
  }

  renderFrame(currentTime, tracks, aspectRatio) {
    const { ctx, canvas } = this;
    const ar = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['9:16'];

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render layers bottom-up: photo, video2, video1, text
    const layerOrder = ['photo', 'video2', 'video1', 'text'];

    for (const trackId of layerOrder) {
      const track = tracks.find(t => t.id === trackId);
      if (!track) continue;

      for (const clip of track.clips) {
        const effectiveDuration = clip.duration - (clip.trimIn || 0) - (clip.trimOut || 0);
        if (currentTime < clip.startTime || currentTime >= clip.startTime + effectiveDuration) continue;

        const clipTime = currentTime - clip.startTime;

        ctx.save();

        // Build combined filter string
        let filterParts = [];

        // Preset filter
        if (clip.filter && clip.filter !== 'none') {
          const filterDef = FILTERS.find(f => f.id === clip.filter);
          if (filterDef && filterDef.css !== 'none') {
            filterParts.push(filterDef.css);
          }
        }

        // Adjustments
        const adj = clip.adjustments || {};
        if (adj.brightness) filterParts.push(`brightness(${1 + adj.brightness / 100})`);
        if (adj.contrast) filterParts.push(`contrast(${1 + adj.contrast / 100})`);
        if (adj.saturation) filterParts.push(`saturate(${1 + adj.saturation / 100})`);
        if (adj.temperature) filterParts.push(`hue-rotate(${adj.temperature / 5}deg)`);
        if (adj.blur) filterParts.push(`blur(${adj.blur}px)`);

        if (filterParts.length > 0) {
          ctx.filter = filterParts.join(' ');
        }

        if (clip.type === 'video' || clip.type === 'photo') {
          const el = this.getMediaElement(clip.mediaId);
          if (el) {
            if (clip.type === 'video' && el.tagName === 'VIDEO') {
              const targetTime = (clip.trimIn || 0) + clipTime * (clip.speed || 1);
              if (Math.abs(el.currentTime - targetTime) > 0.15) {
                el.currentTime = targetTime;
              }
            }
            // Cover-fit
            const srcW = el.videoWidth || el.naturalWidth || el.width || canvas.width;
            const srcH = el.videoHeight || el.naturalHeight || el.height || canvas.height;
            if (srcW > 0 && srcH > 0) {
              const scale = Math.max(canvas.width / srcW, canvas.height / srcH);
              const w = srcW * scale;
              const h = srcH * scale;
              const x = (canvas.width - w) / 2;
              const y = (canvas.height - h) / 2;
              ctx.drawImage(el, x, y, w, h);
            }
          }
        } else if (clip.type === 'text') {
          ctx.filter = 'none'; // Don't apply video filters to text
          this.renderText(ctx, clip, clipTime, canvas);
        }

        // Reset filter for post-processing effects
        ctx.filter = 'none';

        // Vignette overlay
        if (adj.vignette > 0) {
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const maxDim = Math.max(canvas.width, canvas.height);
          const gradient = ctx.createRadialGradient(cx, cy, maxDim * 0.25, cx, cy, maxDim * 0.75);
          gradient.addColorStop(0, 'transparent');
          gradient.addColorStop(1, `rgba(0,0,0,${adj.vignette / 100})`);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Grain effect
        if (adj.grain > 0) {
          const intensity = adj.grain / 100;
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 16) { // Skip pixels for performance
            const noise = (Math.random() - 0.5) * intensity * 80;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
          }
          ctx.putImageData(imageData, 0, 0);
        }

        ctx.restore();
      }
    }
  }

  renderText(ctx, clip, clipTime, canvas) {
    const { text, font, fontSize, fontColor, textAlign, textBg, entrance, exit } = clip;
    if (!text) return;

    const effectiveDuration = clip.duration - (clip.trimIn || 0) - (clip.trimOut || 0);
    let opacity = 1;
    let offsetY = 0;
    let scale = 1;

    // Entrance animation (first 0.5s)
    const enterDur = 0.5;
    if (clipTime < enterDur) {
      const t = clipTime / enterDur;
      const eased = t * (2 - t); // ease-out
      switch (entrance) {
        case 'Fade In': opacity = eased; break;
        case 'Slide Up': offsetY = (1 - eased) * 40; opacity = eased; break;
        case 'Pop': scale = 0.3 + eased * 0.7; opacity = eased; break;
        case 'Bounce':
          if (t < 0.5) { scale = t * 2 * 1.15; }
          else { scale = 1.15 - (t - 0.5) * 2 * 0.15; }
          opacity = Math.min(1, t * 2);
          break;
        case 'Typewriter': break;
        default: break;
      }
    }

    // Exit animation (last 0.3s)
    const exitDur = 0.3;
    const timeFromEnd = effectiveDuration - clipTime;
    if (timeFromEnd < exitDur && exit !== 'None') {
      const t = timeFromEnd / exitDur;
      switch (exit) {
        case 'Fade Out': opacity = t; break;
        case 'Slide Down': offsetY = (1 - t) * 40; opacity = t; break;
        default: break;
      }
    }

    ctx.globalAlpha = opacity;

    const displayText = entrance === 'Typewriter' && clipTime < enterDur
      ? text.slice(0, Math.floor((clipTime / enterDur) * text.length))
      : text;

    const fSize = (fontSize || 24) * (canvas.width / 390);
    ctx.font = `${clip.bold ? 'bold ' : ''}${fSize}px "${font || 'DM Sans'}"`;
    ctx.textAlign = textAlign || 'center';
    ctx.textBaseline = 'middle';

    const x = textAlign === 'left' ? 20 : textAlign === 'right' ? canvas.width - 20 : canvas.width / 2;
    const y = canvas.height * 0.8 + offsetY;

    ctx.save();
    if (scale !== 1) {
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.translate(-x, -y);
    }

    // Background
    if (textBg && textBg !== 'none') {
      const metrics = ctx.measureText(displayText);
      const bgW = metrics.width + 24;
      const bgH = fSize * 1.5;
      ctx.fillStyle = textBg;
      const rx = x - (textAlign === 'center' ? bgW / 2 : textAlign === 'right' ? bgW : 0);
      ctx.beginPath();
      ctx.roundRect(rx, y - bgH / 2, bgW, bgH, 8);
      ctx.fill();
    }

    // Outline
    if (clip.outlineWidth > 0) {
      ctx.strokeStyle = clip.outlineColor || '#000000';
      ctx.lineWidth = clip.outlineWidth || 2;
      ctx.lineJoin = 'round';
      ctx.strokeText(displayText, x, y);
    }

    // Text
    ctx.fillStyle = fontColor || '#ffffff';
    ctx.fillText(displayText, x, y);

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Sync video elements for playback
  playVideos(currentTime, tracks) {
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (clip.type !== 'video') continue;
        const entry = this.mediaElements[clip.mediaId];
        if (!entry?.ready) continue;
        const el = entry.element;
        if (el.tagName !== 'VIDEO') continue;

        const effectiveDuration = clip.duration - (clip.trimIn || 0) - (clip.trimOut || 0);
        const isActive = currentTime >= clip.startTime && currentTime < clip.startTime + effectiveDuration;

        if (isActive) {
          const targetTime = (clip.trimIn || 0) + (currentTime - clip.startTime) * (clip.speed || 1);
          el.playbackRate = clip.speed || 1;
          if (el.paused) {
            el.currentTime = targetTime;
            el.play().catch(() => {});
          }
        } else {
          if (!el.paused) el.pause();
        }
      }
    }
  }

  pauseAllVideos() {
    for (const entry of Object.values(this.mediaElements)) {
      if (entry.element?.tagName === 'VIDEO' && !entry.element.paused) {
        entry.element.pause();
      }
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.pauseAllVideos();
    this.mediaElements = {};
  }
}

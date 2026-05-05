import { FILTERS, ASPECT_RATIOS } from '../utils/constants';
import { localTimeToVideoTime } from '../utils/speedMath';

export class CanvasEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mediaElements = {}; // mediaId -> { element, ready }
    this.animationId = null;
    
    // Create offscreen canvas for chroma key
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }

  getInterpolatedValue(clip, property, time, defaultValue) {
    if (!clip.transformKeyframes || !clip.transformKeyframes[property] || clip.transformKeyframes[property].length === 0) {
      return clip.transform?.[property] ?? defaultValue;
    }
    const keyframes = clip.transformKeyframes[property];
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    if (time <= sorted[0].time) return sorted[0].value;
    if (time >= sorted[sorted.length-1].time) return sorted[sorted.length-1].value;
    
    const idx = sorted.findIndex(k => k.time > time) - 1;
    const k1 = sorted[idx], k2 = sorted[idx + 1];
    const t = (time - k1.time) / (k2.time - k1.time);
    return k1.value + (k2.value - k1.value) * t;
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

  renderFrame(currentTime, tracks, aspectRatio, hoveredFilter = null, selectedClipIds = new Set()) {
    const { ctx, canvas } = this;
    const ar = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['9:16'];

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render layers bottom-up: photo, video2, video1, text, adjustments
    const layerOrder = ['photo', 'video2', 'video1', 'text'];
    
    // First pass: render normal layers
    for (const trackId of layerOrder) {
      const track = tracks.find(t => t.id === trackId);
      if (!track) continue;

      const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);

      for (let i = 0; i < sortedClips.length; i++) {
        const clip = sortedClips[i];
        const nextClip = sortedClips[i + 1];
        const effectiveDuration = clip.duration - (clip.trimIn || 0) - (clip.trimOut || 0);
        let clipEndTime = clip.startTime + effectiveDuration;

        // Transition overlap logic: extend this clip's render time if the NEXT clip has an incoming transition
        let isTransitioningOut = false;
        let transProgressOut = 0;
        let activeTransitionType = 'None';
        
        if (nextClip && nextClip.transitionType && nextClip.transitionType !== 'None' && nextClip.transitionType !== 'Cut') {
          if (Math.abs(clipEndTime - nextClip.startTime) < 0.05) {
            clipEndTime += nextClip.transitionDuration || 0.5;
            if (currentTime >= nextClip.startTime && currentTime < clipEndTime) {
              isTransitioningOut = true;
              transProgressOut = (currentTime - nextClip.startTime) / (nextClip.transitionDuration || 0.5);
              activeTransitionType = nextClip.transitionType;
            }
          }
        }

        if (currentTime < clip.startTime || currentTime >= clipEndTime) continue;

        let isTransitioningIn = false;
        let transProgressIn = 0;
        if (clip.transitionType && clip.transitionType !== 'None' && clip.transitionType !== 'Cut') {
          if (currentTime >= clip.startTime && currentTime < clip.startTime + (clip.transitionDuration || 0.5)) {
            isTransitioningIn = true;
            transProgressIn = (currentTime - clip.startTime) / (clip.transitionDuration || 0.5);
          }
        }

        // Clamp clip time for media playback so it doesn't freeze or throw error if extended
        const clipTime = Math.min(currentTime - clip.startTime, effectiveDuration - 0.001);

        ctx.save();

        // Build combined filter string
        let filterParts = [];

        // Preset filter
        const activeFilter = (hoveredFilter && selectedClipIds.has(clip.id)) ? hoveredFilter : clip.filter;
        if (activeFilter && activeFilter !== 'none') {
          const filterDef = FILTERS.find(f => f.id === activeFilter);
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
        
        let blurAmount = adj.blur || 0;

        // Apply transition effects
        let globalAlpha = clip.type === 'text' ? 1 : (this.getInterpolatedValue(clip, 'opacity', clipTime, 100) / 100);
        let trScaleX = 1, trScaleY = 1;
        let trOffsetX = 0, trOffsetY = 0;

        if (isTransitioningIn) {
          const p = transProgressIn; // 0 to 1
          if (clip.transitionType === 'Fade' || clip.transitionType === 'Dissolve') {
            globalAlpha *= p;
          } else if (clip.transitionType === 'Wipe Right') {
            // Handled via clipping path later
          } else if (clip.transitionType === 'Wipe Left') {
            // Handled via clipping path later
          } else if (clip.transitionType === 'Zoom') {
            globalAlpha *= p;
            trScaleX *= 0.5 + p * 0.5;
            trScaleY *= 0.5 + p * 0.5;
          } else if (clip.transitionType === 'Blur') {
            blurAmount += (1 - p) * 20;
          } else if (clip.transitionType === 'Slide Up') {
            trOffsetY += (1 - p) * canvas.height;
          }
        } else if (isTransitioningOut) {
          const p = transProgressOut; // 0 to 1
          if (activeTransitionType === 'Fade') {
            globalAlpha *= (1 - p);
          } else if (activeTransitionType === 'Dissolve') {
            // Keeps full alpha, next clip fades over it
          } else if (activeTransitionType === 'Zoom') {
            globalAlpha *= (1 - p);
            trScaleX *= 1 + p * 0.5;
            trScaleY *= 1 + p * 0.5;
          } else if (activeTransitionType === 'Blur') {
            blurAmount += p * 20;
          } else if (activeTransitionType === 'Slide Up') {
            // Prev clip stays still
          }
        }

        if (blurAmount > 0) filterParts.push(`blur(${blurAmount}px)`);
        if (filterParts.length > 0) ctx.filter = filterParts.join(' ');

        ctx.globalAlpha = Math.max(0, Math.min(1, globalAlpha));

        // Clipping path for Wipes
        if (isTransitioningIn && clip.transitionType === 'Wipe Right') {
          ctx.beginPath();
          ctx.rect(0, 0, canvas.width * transProgressIn, canvas.height);
          ctx.clip();
        } else if (isTransitioningIn && clip.transitionType === 'Wipe Left') {
          ctx.beginPath();
          ctx.rect(canvas.width * (1 - transProgressIn), 0, canvas.width, canvas.height);
          ctx.clip();
        }

        if (clip.type === 'video' || clip.type === 'photo') {
          const el = this.getMediaElement(clip.mediaId);
          if (el) {
            if (clip.type === 'video' && el.tagName === 'VIDEO') {
              let targetTime;
              if (clip.speedKeyframes?.length) {
                targetTime = localTimeToVideoTime(clip, clipTime + clip.startTime);
              } else if (clip.reversed) {
                const effDur = clip.duration - (clip.trimIn || 0) - (clip.trimOut || 0);
                targetTime = (clip.trimIn || 0) + (effDur - clipTime) * (clip.speed || 1);
              } else {
                targetTime = (clip.trimIn || 0) + clipTime * (clip.speed || 1);
              }

              if (Math.abs(el.currentTime - targetTime) > 0.15) {
                el.currentTime = targetTime;
              }
            }
            
            // Cover-fit
            const srcW = el.videoWidth || el.naturalWidth || el.width || canvas.width;
            const srcH = el.videoHeight || el.naturalHeight || el.height || canvas.height;
            if (srcW > 0 && srcH > 0) {
              const trX = this.getInterpolatedValue(clip, 'x', clipTime, 0);
              const trY = this.getInterpolatedValue(clip, 'y', clipTime, 0);
              const scaleX = this.getInterpolatedValue(clip, 'scaleX', clipTime, 1) * trScaleX;
              const scaleY = this.getInterpolatedValue(clip, 'scaleY', clipTime, 1) * trScaleY;
              const rotation = this.getInterpolatedValue(clip, 'rotation', clipTime, 0);

              const crop = clip.crop || { x: 0, y: 0, width: 1, height: 1 };
              const chroma = clip.chromaKey || { enabled: false, color: [0, 255, 0], threshold: 40, feather: 20 };

              const cx = canvas.width / 2;
              const cy = canvas.height / 2;
              ctx.translate(cx + trX * canvas.width + trOffsetX, cy + trY * canvas.height + trOffsetY);
              ctx.rotate(rotation * Math.PI / 180);
              ctx.scale(scaleX, scaleY);
              ctx.translate(-cx, -cy);

              const scale = Math.max(canvas.width / srcW, canvas.height / srcH);
              const drawW = srcW * scale;
              const drawH = srcH * scale;
              const x = (canvas.width - drawW) / 2;
              const y = (canvas.height - drawH) / 2;

              const dx = x + crop.x * drawW;
              const dy = y + crop.y * drawH;
              const dw = crop.width * drawW;
              const dh = crop.height * drawH;

              if (chroma.enabled) {
                if (this.offscreenCanvas.width !== drawW || this.offscreenCanvas.height !== drawH) {
                  this.offscreenCanvas.width = drawW;
                  this.offscreenCanvas.height = drawH;
                }
                const oCtx = this.offscreenCtx;
                oCtx.clearRect(0, 0, drawW, drawH);
                oCtx.drawImage(el, 0, 0, drawW, drawH);
                
                const imageData = oCtx.getImageData(0, 0, drawW, drawH);
                const data = imageData.data;
                const [kr, kg, kb] = chroma.color;
                const thresh = chroma.threshold;
                const feat = chroma.feather;
                
                for (let k = 0; k < data.length; k += 4) {
                  const r = data[k], g = data[k+1], b = data[k+2];
                  const dist = Math.sqrt((r-kr)**2 + (g-kg)**2 + (b-kb)**2);
                  if (dist < thresh) {
                    const alpha = Math.max(0, (dist - (thresh - feat)) / Math.max(1, feat) * 255);
                    data[k+3] = Math.min(data[k+3], alpha);
                  }
                }
                oCtx.putImageData(imageData, 0, 0);
                
                const sx = crop.x * drawW;
                const sy = crop.y * drawH;
                ctx.drawImage(this.offscreenCanvas, sx, sy, dw, dh, dx, dy, dw, dh);
              } else {
                const sx = crop.x * srcW;
                const sy = crop.y * srcH;
                const sw = crop.width * srcW;
                const sh = crop.height * srcH;
                ctx.drawImage(el, sx, sy, sw, sh, dx, dy, dw, dh);
              }
            }
          }
        } else if (clip.type === 'text') {
          ctx.filter = 'none'; 
          ctx.translate(trOffsetX, trOffsetY);
          if (trScaleX !== 1 || trScaleY !== 1) {
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.scale(trScaleX, trScaleY);
            ctx.translate(-canvas.width/2, -canvas.height/2);
          }
          this.renderText(ctx, clip, clipTime, canvas);
        }

        // Reset filter for post-processing effects on this clip
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
          for (let k = 0; k < data.length; k += 16) { 
            const noise = (Math.random() - 0.5) * intensity * 80;
            data[k] = Math.min(255, Math.max(0, data[k] + noise));
            data[k + 1] = Math.min(255, Math.max(0, data[k + 1] + noise));
            data[k + 2] = Math.min(255, Math.max(0, data[k + 2] + noise));
          }
          ctx.putImageData(imageData, 0, 0);
        }

        ctx.restore();
      }
    }

    // Adjustment Layers Post-Processing Pass
    // Find active adjustment clips across all tracks
    const activeAdjClips = [];
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (clip.type === 'adjustment') {
          const effectiveDuration = clip.duration - (clip.trimIn || 0) - (clip.trimOut || 0);
          if (currentTime >= clip.startTime && currentTime < clip.startTime + effectiveDuration) {
            activeAdjClips.push(clip);
          }
        }
      }
    }

    if (activeAdjClips.length > 0) {
      // Build composite filter from all active adjustment layers
      let adjFilterParts = [];
      activeAdjClips.forEach(clip => {
        // Preset filter
        if (clip.filter && clip.filter !== 'none') {
          const filterDef = FILTERS.find(f => f.id === clip.filter);
          if (filterDef && filterDef.css !== 'none') {
            adjFilterParts.push(filterDef.css);
          }
        }
        // Adjustments
        const adj = clip.adjustments || {};
        if (adj.brightness) adjFilterParts.push(`brightness(${1 + adj.brightness / 100})`);
        if (adj.contrast) adjFilterParts.push(`contrast(${1 + adj.contrast / 100})`);
        if (adj.saturation) adjFilterParts.push(`saturate(${1 + adj.saturation / 100})`);
        if (adj.temperature) adjFilterParts.push(`hue-rotate(${adj.temperature / 5}deg)`);
        if (adj.blur) adjFilterParts.push(`blur(${adj.blur}px)`);
      });

      if (adjFilterParts.length > 0) {
        // Copy current canvas to offscreen
        if (this.offscreenCanvas.width !== canvas.width || this.offscreenCanvas.height !== canvas.height) {
          this.offscreenCanvas.width = canvas.width;
          this.offscreenCanvas.height = canvas.height;
        }
        const oCtx = this.offscreenCtx;
        oCtx.clearRect(0, 0, canvas.width, canvas.height);
        oCtx.drawImage(canvas, 0, 0);

        // Draw back with filter
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.filter = adjFilterParts.join(' ');
        ctx.drawImage(this.offscreenCanvas, 0, 0);
        ctx.restore();
      }

      // Vignette and Grain from adjustment layers
      activeAdjClips.forEach(clip => {
        const adj = clip.adjustments || {};
        if (adj.vignette > 0) {
          ctx.save();
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const maxDim = Math.max(canvas.width, canvas.height);
          const gradient = ctx.createRadialGradient(cx, cy, maxDim * 0.25, cx, cy, maxDim * 0.75);
          gradient.addColorStop(0, 'transparent');
          gradient.addColorStop(1, `rgba(0,0,0,${adj.vignette / 100})`);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
        if (adj.grain > 0) {
          const intensity = adj.grain / 100;
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let k = 0; k < data.length; k += 16) { 
            const noise = (Math.random() - 0.5) * intensity * 80;
            data[k] = Math.min(255, Math.max(0, data[k] + noise));
            data[k + 1] = Math.min(255, Math.max(0, data[k + 1] + noise));
            data[k + 2] = Math.min(255, Math.max(0, data[k + 2] + noise));
          }
          ctx.putImageData(imageData, 0, 0);
        }
      });
    }
  }

  renderText(ctx, clip, clipTime, canvas) {
    const { textData, entrance, exit, loop } = clip;
    if (!textData && !clip.text) return;

    // Support legacy clips which used clip.text/fontSize/etc directly
    const text = textData?.content || clip.text || '';
    const font = textData?.font || clip.font || 'DM Sans';
    const fontSize = textData?.size || clip.fontSize || 24;
    const fontColor = textData?.color || clip.fontColor || '#ffffff';
    const textAlign = textData?.align || clip.textAlign || 'center';
    const textBg = textData?.bg || clip.textBg || 'none';
    const isBold = textData?.bold || clip.bold || false;
    const outlineWidth = clip.outlineWidth || 0;
    const outlineColor = clip.outlineColor || '#000000';

    const effectiveDuration = clip.duration - (clip.trimIn || 0) - (clip.trimOut || 0);

    // Baseline transform support
    const trX = this.getInterpolatedValue(clip, 'x', clipTime, clip.transform?.x ?? 0);
    const trY = this.getInterpolatedValue(clip, 'y', clipTime, clip.transform?.y ?? 0);
    const trScaleX = this.getInterpolatedValue(clip, 'scaleX', clipTime, clip.transform?.scaleX ?? 1);
    const trScaleY = this.getInterpolatedValue(clip, 'scaleY', clipTime, clip.transform?.scaleY ?? 1);
    const trRot = this.getInterpolatedValue(clip, 'rotation', clipTime, clip.transform?.rotation ?? 0);
    const trOp = this.getInterpolatedValue(clip, 'opacity', clipTime, clip.transform?.opacity ?? 100);

    let opacity = trOp / 100;
    let offsetX = 0;
    let offsetY = 0;
    let scale = 1;
    let rotation = 0;

    // Entrance animation (first 20% or max 1s)
    const enterDur = Math.min(1.0, effectiveDuration * 0.2);
    if (clipTime < enterDur && entrance && entrance !== 'None') {
      const t = clipTime / enterDur;
      const eased = t * (2 - t); // ease-out
      switch (entrance) {
        case 'Fade In': opacity *= eased; break;
        case 'Slide Up': offsetY += (1 - eased) * 40; opacity *= eased; break;
        case 'Slide Down': offsetY -= (1 - eased) * 40; opacity *= eased; break;
        case 'Slide Left': offsetX += (1 - eased) * 60; opacity *= eased; break;
        case 'Slide Right': offsetX -= (1 - eased) * 60; opacity *= eased; break;
        case 'Pop': scale *= 0.3 + eased * 0.7; opacity *= eased; break;
        case 'Bounce':
          if (t < 0.5) { scale *= t * 2 * 1.15; }
          else { scale *= 1.15 - (t - 0.5) * 2 * 0.15; }
          opacity *= Math.min(1, t * 2);
          break;
        case 'Zoom In': scale *= 2 - eased; opacity *= eased; break;
        case 'Zoom Out': scale *= 0.5 + eased * 0.5; opacity *= eased; break;
        case 'Rotate In': rotation += (1 - eased) * -180; opacity *= eased; break;
        case 'Spin': rotation += (1 - eased) * -360; opacity *= eased; break;
      }
    }

    // Exit animation (last 20% or max 1s)
    const exitDur = Math.min(1.0, effectiveDuration * 0.2);
    const timeFromEnd = effectiveDuration - clipTime;
    if (timeFromEnd < exitDur && exit && exit !== 'None') {
      const t = timeFromEnd / exitDur;
      switch (exit) {
        case 'Fade Out': opacity *= t; break;
        case 'Slide Down': offsetY += (1 - t) * 40; opacity *= t; break;
        case 'Slide Up': offsetY -= (1 - t) * 40; opacity *= t; break;
        case 'Slide Left': offsetX -= (1 - t) * 60; opacity *= t; break;
        case 'Slide Right': offsetX += (1 - t) * 60; opacity *= t; break;
        case 'Pop Out': scale *= t; opacity *= t; break;
        case 'Zoom Out': scale *= 1 + (1 - t); opacity *= t; break;
      }
    }

    // Loop animations
    if (loop && loop !== 'None') {
      const time = clipTime;
      switch (loop) {
        case 'Pulse':
          scale *= 0.95 + 0.1 * Math.abs(Math.sin(time * Math.PI / 0.8));
          break;
        case 'Float':
          offsetY += Math.sin(time * Math.PI * 2 / 2) * -8;
          break;
        case 'Shake':
          offsetX += (Math.random() - 0.5) * 6;
          offsetY += (Math.random() - 0.5) * 6;
          break;
        case 'Jiggle':
          rotation += Math.sin(time * Math.PI * 2 / 0.3) * 5;
          break;
      }
    }

    ctx.globalAlpha = opacity;

    let displayText = text;
    let isTypewriter = entrance === 'Typewriter' && clipTime < enterDur;
    let isWordByWord = entrance === 'Word by Word' && clipTime < enterDur;
    
    if (isTypewriter) {
      displayText = text.slice(0, Math.floor((clipTime / enterDur) * text.length));
    } else if (isWordByWord) {
      const words = text.split(' ');
      const wordsToShow = Math.floor((clipTime / enterDur) * words.length);
      displayText = words.slice(0, wordsToShow).join(' ');
    }

    const fSize = fontSize * (canvas.width / 390);
    ctx.font = `${isBold ? 'bold ' : ''}${fSize}px "${font}"`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'middle';

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    // Default origin mapping: y = cy + 30% height = 80% height.
    const originX = textAlign === 'left' ? 20 : textAlign === 'right' ? canvas.width - 20 : cx;
    const originY = canvas.height * 0.8;

    const x = originX + trX * canvas.width + offsetX;
    const y = originY + trY * canvas.height + offsetY;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((trRot + rotation) * Math.PI / 180);
    ctx.scale(trScaleX * scale, trScaleY * scale);
    ctx.translate(-x, -y);

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
    if (outlineWidth > 0) {
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = outlineWidth;
      ctx.lineJoin = 'round';
      ctx.strokeText(displayText, x, y);
    }

    // Karaoke mode
    if ((entrance === 'Karaoke' || clip.textStyle === 'karaoke') && textData?.words) {
      const words = textData.words;
      let curX = x - (textAlign === 'center' ? ctx.measureText(words.map(w => w.word).join(' ')).width / 2 : 0);
      
      words.forEach(wordObj => {
        const isActive = clipTime >= wordObj.start && clipTime < wordObj.end;
        ctx.fillStyle = isActive ? '#FFD700' : fontColor;
        ctx.fillText(wordObj.word, curX + (textAlign === 'center' ? ctx.measureText(wordObj.word).width / 2 : 0), y);
        curX += ctx.measureText(wordObj.word + ' ').width;
      });
    } else {
      ctx.fillStyle = fontColor;
      ctx.fillText(displayText, x, y);
    }

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
          let targetTime;
          if (clip.speedKeyframes?.length) {
            targetTime = localTimeToVideoTime(clip, currentTime);
          } else if (clip.reversed) {
            targetTime = (clip.trimIn || 0) + (effectiveDuration - (currentTime - clip.startTime)) * (clip.speed || 1);
          } else {
            targetTime = (clip.trimIn || 0) + (currentTime - clip.startTime) * (clip.speed || 1);
          }
          
          el.playbackRate = clip.speed || 1; // Basic speed for standard playback, ramp integration handles exact frames when scrubbing/playing
          
          const isSoloActive = tracks.some(t => t.solo);
          const trackMuted = track.muted || (isSoloActive && !track.solo);
          el.muted = trackMuted || clip.audioDetached || false;

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

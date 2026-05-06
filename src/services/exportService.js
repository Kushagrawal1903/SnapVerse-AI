import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance = null;
let ffmpegLoaded = false;

// ═══════════════════════════════════════
// FFmpeg.wasm loader
// ═══════════════════════════════════════

export async function loadFFmpeg() {
  if (ffmpegLoaded && ffmpegInstance) return ffmpegInstance;

  ffmpegInstance = new FFmpeg();

  // Load from CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegLoaded = true;
  return ffmpegInstance;
}

// ═══════════════════════════════════════
// Export pipeline
// ═══════════════════════════════════════

export async function exportVideo(
  canvas,
  engine,
  tracks,
  aspectRatio,
  duration,
  fps,
  quality,
  onRenderProgress,
  onEncodeProgress,
  cancelledRef
) {
  const ffmpeg = await loadFFmpeg();
  if (!canvas) throw new Error('Export canvas is unavailable.');
  if (!Array.isArray(tracks) || tracks.length === 0) throw new Error('No timeline tracks found.');
  if (!duration || duration <= 0) throw new Error('Project duration must be greater than 0.');
  if (!fps || fps <= 0) throw new Error('Invalid export FPS.');

  const totalFrames = Math.ceil(duration * fps);
  const crf = quality === 'High' ? 18 : quality === 'Standard' ? 23 : 28;

  // Render frames
  for (let frame = 0; frame < totalFrames; frame++) {
    if (cancelledRef.current) return null;

    const time = frame / fps;
    engine.renderFrame(time, tracks, aspectRatio);

    // Capture frame as JPEG
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) throw new Error('Failed to render frame data.');
    const frameData = new Uint8Array(await blob.arrayBuffer());
    const frameName = `frame_${String(frame).padStart(6, '0')}.jpg`;
    await ffmpeg.writeFile(frameName, frameData);

    onRenderProgress((frame + 1) / totalFrames);
  }

  if (cancelledRef.current) return null;

  // Collect audio tracks
  const audioClips = [];
  for (const track of tracks) {
    for (const clip of track.clips) {
      if (clip.type === 'audio' && clip.mediaId) {
        audioClips.push(clip);
      }
      // Also extract audio from video clips
      if (clip.type === 'video' && clip.mediaId) {
        audioClips.push({ ...clip, isVideoAudio: true });
      }
    }
  }

  // Write audio files
  let audioInputs = [];
  let audioFilterParts = [];

  // Get media items from the store (passed via importable static reference)
  const useProjectStore = (await import('../stores/useProjectStore')).default;
  const mediaItems = useProjectStore.getState().mediaItems;

  for (let i = 0; i < audioClips.length; i++) {
    const clip = audioClips[i];
    const media = mediaItems.find(m => m.id === clip.mediaId);
    if (!media?.objectUrl) continue;

    try {
      const response = await fetch(media.objectUrl);
      const audioData = new Uint8Array(await response.arrayBuffer());
      const ext = media.name.split('.').pop() || 'mp3';
      const audioFileName = `audio_${i}.${ext}`;
      await ffmpeg.writeFile(audioFileName, audioData);
      audioInputs.push(audioFileName);

      const volume = (clip.volume || 100) / 100;
      audioFilterParts.push(`[${i + 1}:a]adelay=${Math.round(clip.startTime * 1000)}|${Math.round(clip.startTime * 1000)},volume=${volume}[a${i}]`);
    } catch (e) {
      console.warn('Failed to write audio:', e);
    }
  }

  if (cancelledRef.current) return null;

  // Build FFmpeg command
  let command = [
    '-framerate', String(fps),
    '-i', 'frame_%06d.jpg',
  ];

  // Add audio inputs
  for (const audioFile of audioInputs) {
    command.push('-i', audioFile);
  }

  // Video encoding
  command.push(
    '-c:v', 'libx264',
    '-crf', String(crf),
    '-pix_fmt', 'yuv420p',
    '-preset', quality === 'High' ? 'slow' : 'ultrafast',
  );

  // Mix audio if present
  if (audioInputs.length > 0 && audioFilterParts.length > 0) {
    const mixInputs = audioFilterParts.map((_, i) => `[a${i}]`).join('');
    const filterComplex = audioFilterParts.join(';') + `;${mixInputs}amix=inputs=${audioInputs.length}:duration=longest[aout]`;
    command.push('-filter_complex', filterComplex, '-map', '0:v', '-map', '[aout]');
  }

  command.push(
    '-movflags', '+faststart',
    '-y',
    'output.mp4'
  );

  // Set up progress callback
  ffmpeg.on('progress', ({ progress: p }) => {
    if (onEncodeProgress) onEncodeProgress(Math.min(1, p));
  });

  await ffmpeg.exec(command);

  if (cancelledRef.current) return null;

  // Read output
  const outputData = await ffmpeg.readFile('output.mp4');
  if (!outputData || outputData.length === 0) {
    throw new Error('FFmpeg produced an empty export file.');
  }
  const blob = new Blob([outputData], { type: 'video/mp4' });

  // Cleanup
  for (let frame = 0; frame < totalFrames; frame++) {
    try {
      await ffmpeg.deleteFile(`frame_${String(frame).padStart(6, '0')}.jpg`);
    } catch {}
  }
  for (const audioFile of audioInputs) {
    try {
      await ffmpeg.deleteFile(audioFile);
    } catch {}
  }
  try { await ffmpeg.deleteFile('output.mp4'); } catch {}

  return blob;
}

// ═══════════════════════════════════════
// Download helper
// ═══════════════════════════════════════

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

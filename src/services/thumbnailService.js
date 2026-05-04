export async function generateVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 4);
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(url);
      resolve({ thumbnail, duration: video.duration, width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ thumbnail: null, duration: 0 });
    };
  });
}

export function generateImageThumbnail(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(url);
      resolve({ thumbnail, width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ thumbnail: null });
    };
    img.src = url;
  });
}

export function generateAudioWaveform(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(e.target.result);
        const rawData = audioBuffer.getChannelData(0);
        const samples = 80;
        const blockSize = Math.floor(rawData.length / samples);
        const waveform = [];
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j]);
          }
          waveform.push(sum / blockSize);
        }
        const max = Math.max(...waveform);
        const normalized = waveform.map(v => v / max);

        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#c8f0e5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00b894';
        const barWidth = canvas.width / samples;
        normalized.forEach((val, i) => {
          const barHeight = val * canvas.height * 0.8;
          ctx.fillRect(i * barWidth, (canvas.height - barHeight) / 2, barWidth - 1, barHeight);
        });
        const thumbnail = canvas.toDataURL('image/png');
        audioContext.close();
        resolve({ thumbnail, duration: audioBuffer.duration, waveform: normalized });
      } catch {
        resolve({ thumbnail: null, duration: 0, waveform: [] });
      }
    };
    reader.onerror = () => resolve({ thumbnail: null, duration: 0, waveform: [] });
    reader.readAsArrayBuffer(file);
  });
}

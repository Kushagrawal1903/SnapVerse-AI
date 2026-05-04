let idCounter = 0;

export function generateId() {
  return `${Date.now()}-${++idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getMediaType(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (['.mp4', '.mov', '.webm'].includes(ext)) return 'video';
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'photo';
  if (['.mp3', '.wav', '.aac', '.ogg'].includes(ext)) return 'audio';
  return null;
}

export function snapToGrid(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}

export function clipOverlaps(clipA, clipB) {
  return clipA.startTime < clipB.startTime + clipB.duration &&
         clipA.startTime + clipA.duration > clipB.startTime;
}

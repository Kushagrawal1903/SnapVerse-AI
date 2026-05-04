export const TRACK_TYPES = {
  TEXT: 'text',
  VIDEO_1: 'video1',
  VIDEO_2: 'video2',
  PHOTO: 'photo',
  AUDIO_1: 'audio1',
  AUDIO_2: 'audio2',
};

export const TRACK_CONFIG = [
  { id: TRACK_TYPES.TEXT, label: 'Text / Overlay', icon: '𝐓', accepts: ['text'] },
  { id: TRACK_TYPES.VIDEO_1, label: 'Video 1', icon: '▶', accepts: ['video'] },
  { id: TRACK_TYPES.VIDEO_2, label: 'Video 2', icon: '▶', accepts: ['video'] },
  { id: TRACK_TYPES.PHOTO, label: 'Photo', icon: '◻', accepts: ['photo'] },
  { id: TRACK_TYPES.AUDIO_1, label: 'Audio 1', icon: '♪', accepts: ['audio'] },
  { id: TRACK_TYPES.AUDIO_2, label: 'Audio 2', icon: '♫', accepts: ['audio'] },
];

export const MEDIA_TYPES = {
  VIDEO: 'video',
  PHOTO: 'photo',
  AUDIO: 'audio',
  TEXT: 'text',
};

export const ACCEPTED_VIDEO = ['.mp4', '.mov', '.webm'];
export const ACCEPTED_PHOTO = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
export const ACCEPTED_AUDIO = ['.mp3', '.wav', '.aac', '.ogg'];
export const ALL_ACCEPTED = [...ACCEPTED_VIDEO, ...ACCEPTED_PHOTO, ...ACCEPTED_AUDIO];

export const ASPECT_RATIOS = {
  '9:16': { width: 1080, height: 1920, label: '9:16 Reels', displayW: 390, displayH: 693 },
  '1:1':  { width: 1080, height: 1080, label: '1:1 Square', displayW: 500, displayH: 500 },
  '16:9': { width: 1920, height: 1080, label: '16:9 YouTube', displayW: 693, displayH: 390 },
};

export const FILTERS = [
  { id: 'none', label: 'None', css: 'none' },
  { id: 'vivid', label: 'Vivid', css: 'saturate(1.4) contrast(1.1)' },
  { id: 'cinematic', label: 'Cinematic', css: 'contrast(1.2) saturate(0.85) brightness(0.95)' },
  { id: 'faded', label: 'Faded', css: 'contrast(0.9) saturate(0.7) brightness(1.1)' },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.3)' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.25) saturate(1.2) brightness(1.05)' },
  { id: 'cool', label: 'Cool', css: 'saturate(0.9) hue-rotate(15deg) brightness(1.05)' },
  { id: 'neon', label: 'Neon', css: 'saturate(2) contrast(1.15) brightness(1.1)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.35) contrast(0.95) brightness(1.05) saturate(0.8)' },
  { id: 'dramatic', label: 'Dramatic', css: 'contrast(1.4) saturate(0.9) brightness(0.9)' },
];

export const TEXT_PRESETS = [
  { id: 'subtitle', label: 'Subtitle', font: 'DM Sans', size: 24, color: '#ffffff', bg: 'rgba(0,0,0,0.6)', align: 'center' },
  { id: 'headline', label: 'Headline', font: 'Syne', size: 48, color: '#ffffff', bg: 'none', align: 'center', bold: true },
  { id: 'lower-third', label: 'Lower Third', font: 'DM Sans', size: 20, color: '#ffffff', bg: 'rgba(91,79,245,0.85)', align: 'left' },
  { id: 'callout', label: 'Callout', font: 'DM Sans', size: 28, color: '#0d0d12', bg: 'rgba(255,255,255,0.9)', align: 'center' },
  { id: 'animated-word', label: 'Animated Word', font: 'Syne', size: 56, color: '#5b4ff5', bg: 'none', align: 'center', bold: true },
];

export const TEXT_ANIMATIONS = {
  entrance: ['None', 'Fade In', 'Slide Up', 'Typewriter', 'Pop', 'Bounce'],
  exit: ['None', 'Fade Out', 'Slide Down'],
};

export const FONTS = ['Syne', 'DM Sans', 'IBM Plex Mono', 'Poppins', 'Bebas Neue', 'Playfair Display'];

export const TRANSITION_TYPES = ['Cut', 'Fade', 'Dissolve', 'Wipe Left', 'Wipe Right', 'Zoom'];

export const EXPORT_PRESETS = {
  instagram: { label: 'Instagram Reels', width: 1080, height: 1920, fps: 30, bitrate: '8M' },
  tiktok: { label: 'TikTok', width: 1080, height: 1920, fps: 30, bitrate: '6M' },
  youtube: { label: 'YouTube Shorts', width: 1080, height: 1920, fps: 30, bitrate: '10M' },
};

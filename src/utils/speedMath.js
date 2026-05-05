// speedMath.js
// Provides utilities for calculating dynamic video time based on a speed ramp (curve).

// Simple bezier ease computation
// Points are [cx1, cy1, cx2, cy2]
function getBezierValue(t, p1, p2, p3, p4) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  let p = p1 * uuu;
  p += 3 * p2 * t * uu;
  p += 3 * p3 * tt * u;
  p += p4 * ttt;

  return p;
}

// Keyframe structure: { time: number (0-1), speed: number (0.1-4), easeIn: [x,y], easeOut: [x,y] }
export function getSpeedAtTime(keyframes, localProgress) {
  if (!keyframes || keyframes.length === 0) return 1;
  if (keyframes.length === 1) return keyframes[0].speed;

  // Clamp to bounds
  if (localProgress <= keyframes[0].time) return keyframes[0].speed;
  if (localProgress >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].speed;

  // Find segment
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];

    if (localProgress >= k1.time && localProgress <= k2.time) {
      const segmentProgress = (localProgress - k1.time) / (k2.time - k1.time);
      // For simplicity, we just use a basic lerp or ease if provided
      // In a full implementation, we'd solve the cubic bezier for X to find T, then solve for Y.
      // Here we use a fast approximation: use segmentProgress as T.
      
      const p1y = k1.speed;
      const p2y = k1.easeOut ? k1.easeOut[1] : k1.speed;
      const p3y = k2.easeIn ? k2.easeIn[1] : k2.speed;
      const p4y = k2.speed;

      return getBezierValue(segmentProgress, p1y, p2y, p3y, p4y);
    }
  }

  return 1;
}

// Numerical integration using Simpson's rule for better accuracy
export function localTimeToVideoTime(clip, globalTime) {
  const localTime = globalTime - clip.startTime;
  if (localTime <= 0) return clip.trimIn || 0;
  
  const effectiveDuration = clip.duration - (clip.trimIn || 0) - (clip.trimOut || 0);
  
  const steps = 100;
  const h = localTime / steps;
  let integral = 0;

  for (let i = 0; i <= steps; i++) {
    const t = i * h;
    const progress = Math.min(1, Math.max(0, t / effectiveDuration));
    const speed = getSpeedAtTime(clip.speedKeyframes, progress);
    
    let weight = 2;
    if (i === 0 || i === steps) weight = 1;
    else if (i % 2 !== 0) weight = 4;
    
    integral += weight * speed;
  }
  
  integral = (h / 3) * integral;
  
  if (clip.reversed) {
    return (clip.trimIn || 0) + (effectiveDuration - integral);
  }
  return (clip.trimIn || 0) + integral;
}

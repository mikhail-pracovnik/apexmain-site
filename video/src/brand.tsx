import React from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

// Palette (в): dark with a cold blue undertone (matches the site tokens).
export const C = {
  ink: '#030406',
  ink2: '#090B10',
  ink3: '#0F131A',
  paper: '#ECF0F1',
  apex: '#46C8D9',
};

export const W = 960;
export const H = 600;
export const FPS = 24;

/**
 * Frame shifted by `offset` and wrapped, so the rendered loop starts mid-animation
 * (frame 0 = a finished scene, which also becomes the poster) and still loops seamlessly.
 */
export const useLoopFrame = (offset: number) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (frame + offset) % durationInFrames;
};

const out = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 0 → 1 between `start` and `start + dur` (ease-out), clamped. */
export const appear = (frame: number, start: number, dur = 12) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: out });

/** 0 → 1 with ease-in-out. */
export const move = (frame: number, start: number, dur: number) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut });

/** Global fade-out at the end of a loop so the last frame matches the first. */
export const loopOut = (frame: number, total: number, dur = 14) =>
  interpolate(frame, [total - dur - 2, total - 2], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Brand background: ink, faint grid, soft turquoise glow. */
export const Backdrop: React.FC<{ w?: number; h?: number }> = ({ w = W, h = H }) => (
  <>
    <defs>
      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M32 0H0V32" fill="none" stroke="#94B2DC" strokeOpacity={0.05} />
      </pattern>
      <radialGradient id="glow" cx="0.75" cy="0.2" r="0.8">
        <stop offset="0" stopColor={C.apex} stopOpacity={0.07} />
        <stop offset="1" stopColor={C.apex} stopOpacity={0} />
      </radialGradient>
      <radialGradient id="glow2" cx="0.1" cy="0.95" r="0.7">
        <stop offset="0" stopColor="#285AA0" stopOpacity={0.08} />
        <stop offset="1" stopColor="#285AA0" stopOpacity={0} />
      </radialGradient>
      <linearGradient id="img" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={C.paper} stopOpacity={0.1} />
        <stop offset="1" stopColor={C.paper} stopOpacity={0.03} />
      </linearGradient>
      <symbol id="peak" viewBox="0 0 40 24">
        <path d="M2 22 14 4l8 12M18 22l10-14 10 14" fill="none" stroke={C.paper} strokeOpacity={0.32} strokeWidth={2} />
      </symbol>
    </defs>
    <rect width={w} height={h} fill={C.ink2} />
    <rect width={w} height={h} fill="url(#grid)" />
    <rect width={w} height={h} fill="url(#glow)" />
    <rect width={w} height={h} fill="url(#glow2)" />
  </>
);

/** Mouse pointer arrow. */
export const Cursor: React.FC<{ x: number; y: number; opacity?: number; scale?: number }> = ({ x, y, opacity = 1, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    <path d="M0 0 L0 22 L6 16.5 L10.5 26 L14 24.4 L9.6 15.2 L17 15 Z" fill={C.paper} stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />
  </g>
);

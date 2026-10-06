import React from 'react';
import { Easing, interpolate, useVideoConfig } from 'remotion';
import { Backdrop, C, lerp, useLoopFrame } from './brand';

/**
 * Square mini loops for the compact home-page service cards (shown ~165px wide on phones):
 * one big, simple image per service, thick shapes, no small detail.
 * The main image is on screen in every frame (no fade to empty); only details move, and every
 * motion is periodic over the loop, so any frame — including the poster — shows a full picture.
 */
export const S = 480;

const ease = Easing.bezier(0.65, 0, 0.35, 1);
/** 0 → 1 between phases a and b of the loop (0..1), eased and clamped. */
const step = (p: number, a: number, b: number) =>
  interpolate(p, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
/** 0 → 1 → 0 bump between a and b. */
const bump = (p: number, a: number, b: number) => {
  const m = (a + b) / 2;
  return step(p, a, m) - step(p, m, b);
};

const usePhase = (offset: number) => {
  const f = useLoopFrame(offset);
  const { durationInFrames } = useVideoConfig();
  return { f, p: f / durationInFrames };
};

/* Websites: a big browser window; the cursor comes in, clicks the button, it lights up. */
export const MiniSites: React.FC = () => {
  const { p } = usePhase(52);
  const toButton = step(p, 0.2, 0.42) - step(p, 0.72, 0.95);
  const press = 1 - 0.1 * bump(p, 0.44, 0.52);
  const lit = bump(p, 0.46, 0.85);
  const ring = step(p, 0.48, 0.72);
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <Backdrop w={S} h={S} />
      <rect x={60} y={90} width={360} height={300} rx={28} fill={C.ink} stroke={C.paper} strokeOpacity={0.25} strokeWidth={4} />
      <path d="M60 150H420" stroke={C.paper} strokeOpacity={0.2} strokeWidth={4} />
      {[100, 130, 160].map((x) => (
        <circle key={x} cx={x} cy={120} r={9} fill={C.paper} fillOpacity={0.35} />
      ))}
      <rect x={100} y={185} width={220} height={30} rx={15} fill={C.paper} fillOpacity={0.85} />
      <rect x={100} y={230} width={150} height={30} rx={15} fill={C.paper} fillOpacity={0.4} />
      <g style={{ scale: press, transformOrigin: '180px 318px' }}>
        <rect x={100} y={292} width={160} height={52} rx={26} fill={C.apex} fillOpacity={lerp(0.6, 1, lit)} />
      </g>
      <circle cx={180} cy={318} r={34 + ring * 60} fill="none" stroke={C.apex} strokeWidth={5} strokeOpacity={ring > 0 && ring < 1 ? (1 - ring) * 0.7 : 0} />
      <g transform={`translate(${lerp(372, 196, toButton)} ${lerp(404, 326, toButton)}) scale(2.1)`}>
        <path d="M0 0 L0 22 L6 16.5 L10.5 26 L14 24.4 L9.6 15.2 L17 15 Z" fill={C.paper} stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />
      </g>
    </svg>
  );
};

/* Instagram & SMM: a post frame with a big heart that beats, a ring spreads out. */
export const MiniSmm: React.FC = () => {
  const { p } = usePhase(46);
  const beat = 1 + 0.2 * bump(p, 0.36, 0.5);
  const ring = step(p, 0.42, 0.7);
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <Backdrop w={S} h={S} />
      <rect x={80} y={80} width={320} height={320} rx={64} fill="none" stroke={C.paper} strokeOpacity={0.3} strokeWidth={14} />
      <circle cx={340} cy={140} r={13} fill={C.paper} fillOpacity={0.45} />
      <circle cx={240} cy={240} r={84} fill="none" stroke={C.paper} strokeOpacity={0.3} strokeWidth={14} />
      <circle cx={240} cy={244} r={70 + ring * 90} fill="none" stroke={C.apex} strokeWidth={6} strokeOpacity={ring > 0 && ring < 1 ? (1 - ring) * 0.8 : 0} />
      <g style={{ scale: beat, transformOrigin: '240px 246px' }}>
        <path d="M240 312c-46-32-82-60-82-98 0-25 20-44 43-44 18 0 31 10 39 24 8-14 21-24 39-24 23 0 43 19 43 44 0 38-36 66-82 98z" fill={C.apex} />
      </g>
    </svg>
  );
};

/* Ads: three bars that "breathe", the tallest one wins; the arrow bobs up. */
export const MiniAds: React.FC = () => {
  const { p } = usePhase(30);
  const base = [0.38, 0.6, 0.92];
  const wave = (i: number) => 0.82 + 0.18 * Math.sin(2 * Math.PI * (p - i * 0.12));
  const bob = Math.sin(2 * Math.PI * p) * 10;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <Backdrop w={S} h={S} />
      <path d="M70 400H410" stroke={C.paper} strokeOpacity={0.3} strokeWidth={6} strokeLinecap="round" />
      {base.map((v, i) => {
        const h = v * 260 * wave(i);
        return <rect key={i} x={95 + i * 105} y={390 - h} width={80} height={h} rx={14} fill={i === 2 ? C.apex : C.paper} fillOpacity={i === 2 ? 1 : 0.45} />;
      })}
      <g style={{ translate: `0 ${-bob}px` }}>
        <path d="M335 92 L380 140 H352 V176 H318 V140 H290 Z" fill={C.paper} />
      </g>
    </svg>
  );
};

/* Sales setup: a "typing…" chat bubble turns into a turquoise check and back — never empty. */
export const MiniSales: React.FC = () => {
  const { f, p } = usePhase(58);
  const toCheck = step(p, 0.38, 0.48) - step(p, 0.84, 0.94);
  const typing = (i: number) => 0.35 + 0.65 * Math.max(0, Math.sin(((f - i * 4) / 24) * Math.PI * 2));
  const draw = step(p, 0.44, 0.56) - step(p, 0.86, 0.9);
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <Backdrop w={S} h={S} />
      <g style={{ opacity: 1 - toCheck, scale: lerp(1, 0.85, toCheck), transformOrigin: '240px 230px' }}>
        <path
          d="M90 130 Q90 90 130 90 H350 Q390 90 390 130 V290 Q390 330 350 330 H200 L130 390 V330 Q90 330 90 290 Z"
          fill={C.ink3}
          stroke={C.paper}
          strokeOpacity={0.35}
          strokeWidth={6}
        />
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={180 + i * 60} cy={210} r={20} fill={C.paper} fillOpacity={typing(i)} />
        ))}
      </g>
      <g style={{ opacity: toCheck, scale: lerp(0.7, 1, toCheck), transformOrigin: '240px 240px' }}>
        <circle cx={240} cy={240} r={130} fill={C.apex} />
        <path
          d="M180 244 L224 288 L304 200"
          fill="none"
          stroke={C.ink}
          strokeWidth={26}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
        />
      </g>
    </svg>
  );
};

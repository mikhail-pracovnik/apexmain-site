import React from 'react';
import { interpolate, useVideoConfig } from 'remotion';
import { appear, Backdrop, C, lerp, loopOut, move, useLoopFrame } from './brand';

/**
 * Square mini loops for the compact home-page service cards (shown ~165px wide on phones):
 * one big, simple image per service, thick shapes, no small detail.
 */
export const S = 480;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/* Websites: a big browser window; the button gets clicked and lights up. */
export const MiniSites: React.FC = () => {
  const f = useLoopFrame(70);
  const { durationInFrames: T } = useVideoConfig();
  const out = loopOut(f, T, 12);
  const press = interpolate(f, [52, 56, 62], [1, 0.9, 1], clamp);
  const lit = appear(f, 56, 10);
  const cur = move(f, 30, 22);
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <Backdrop w={S} h={S} />
      <rect x={60} y={90} width={360} height={300} rx={28} fill={C.ink} stroke={C.paper} strokeOpacity={0.25} strokeWidth={4} />
      <path d="M60 150H420" stroke={C.paper} strokeOpacity={0.2} strokeWidth={4} />
      {[100, 130, 160].map((x) => (
        <circle key={x} cx={x} cy={120} r={9} fill={C.paper} fillOpacity={0.35} />
      ))}
      <g opacity={out}>
        <rect x={100} y={185} width={lerp(0, 220, appear(f, 4, 14))} height={30} rx={15} fill={C.paper} fillOpacity={0.85} />
        <rect x={100} y={230} width={lerp(0, 150, appear(f, 10, 14))} height={30} rx={15} fill={C.paper} fillOpacity={0.4} />
        <g style={{ scale: press, transformOrigin: '180px 318px', opacity: appear(f, 18, 10) }}>
          <rect x={100} y={292} width={160} height={52} rx={26} fill={C.apex} fillOpacity={lerp(0.55, 1, lit)} />
        </g>
        <circle cx={180} cy={318} r={34 + lit * 60} fill="none" stroke={C.apex} strokeWidth={5} strokeOpacity={lit > 0 && lit < 1 ? (1 - lit) * 0.7 : 0} />
        {/* cursor */}
        <g transform={`translate(${lerp(380, 196, cur)} ${lerp(420, 326, cur)}) scale(2.1)`} opacity={appear(f, 26, 6)}>
          <path d="M0 0 L0 22 L6 16.5 L10.5 26 L14 24.4 L9.6 15.2 L17 15 Z" fill={C.paper} stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  );
};

/* Instagram & SMM: a post frame and a big heart that pops. */
export const MiniSmm: React.FC = () => {
  const f = useLoopFrame(62);
  const { durationInFrames: T } = useVideoConfig();
  const out = loopOut(f, T, 12);
  const pop = interpolate(f, [30, 40, 48], [0, 1.18, 1], clamp);
  const ring = appear(f, 36, 18);
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <Backdrop w={S} h={S} />
      <rect x={80} y={80} width={320} height={320} rx={64} fill="none" stroke={C.paper} strokeOpacity={0.3} strokeWidth={14} />
      <circle cx={340} cy={140} r={13} fill={C.paper} fillOpacity={0.45} />
      <circle cx={240} cy={240} r={84} fill="none" stroke={C.paper} strokeOpacity={0.3} strokeWidth={14} />
      <g opacity={out}>
        <circle cx={240} cy={244} r={70 + ring * 90} fill="none" stroke={C.apex} strokeWidth={6} strokeOpacity={ring > 0 && ring < 1 ? (1 - ring) * 0.8 : 0} />
        <g style={{ scale: pop, transformOrigin: '240px 246px' }}>
          <path d="M240 312c-46-32-82-60-82-98 0-25 20-44 43-44 18 0 31 10 39 24 8-14 21-24 39-24 23 0 43 19 43 44 0 38-36 66-82 98z" fill={C.apex} />
        </g>
      </g>
    </svg>
  );
};

/* Ads: three bars grow, the last one wins with an arrow up. */
export const MiniAds: React.FC = () => {
  const f = useLoopFrame(72);
  const { durationInFrames: T } = useVideoConfig();
  const out = loopOut(f, T, 12);
  const bars = [0.38, 0.6, 0.92];
  const arrow = appear(f, 44, 14);
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <Backdrop w={S} h={S} />
      <path d="M70 400H410" stroke={C.paper} strokeOpacity={0.3} strokeWidth={6} strokeLinecap="round" />
      <g opacity={out}>
        {bars.map((v, i) => {
          const g = appear(f, 6 + i * 8, 18);
          const h = v * 260 * g;
          return <rect key={i} x={95 + i * 105} y={390 - h} width={80} height={h} rx={14} fill={i === 2 ? C.apex : C.paper} fillOpacity={i === 2 ? 1 : 0.45} />;
        })}
        <g style={{ opacity: arrow, translate: `0 ${(1 - arrow) * 30}px` }}>
          <path d="M335 92 L380 140 H352 V176 H318 V140 H290 Z" fill={C.paper} />
        </g>
      </g>
    </svg>
  );
};

/* Sales setup: a chat bubble "typing…" turns into a turquoise check. */
export const MiniSales: React.FC = () => {
  const f = useLoopFrame(64);
  const { durationInFrames: T } = useVideoConfig();
  const out = loopOut(f, T, 12);
  const typing = (i: number) => 0.35 + 0.65 * Math.max(0, Math.sin(((f - i * 4) / 24) * Math.PI * 2));
  const ok = appear(f, 40, 14);
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <Backdrop w={S} h={S} />
      <g opacity={out}>
        <g style={{ opacity: 1 - ok, scale: lerp(1, 0.85, ok), transformOrigin: '240px 230px' }}>
          <path d="M90 130 Q90 90 130 90 H350 Q390 90 390 130 V290 Q390 330 350 330 H200 L130 390 V330 Q90 330 90 290 Z" fill={C.ink3} stroke={C.paper} strokeOpacity={0.35} strokeWidth={6} />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={180 + i * 60} cy={210} r={20} fill={C.paper} fillOpacity={typing(i)} />
          ))}
        </g>
        <g style={{ opacity: ok, scale: lerp(0.7, 1, ok), transformOrigin: '240px 240px' }}>
          <circle cx={240} cy={240} r={130} fill={C.apex} />
          <path d="M180 244 L224 288 L304 200" fill="none" stroke={C.ink} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - appear(f, 46, 12)} />
        </g>
      </g>
    </svg>
  );
};

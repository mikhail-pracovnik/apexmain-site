import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { appear, Backdrop, C, Cursor, H, lerp, loopOut, move, W } from './brand';

const T = (t: number) => ({ opacity: t, translate: `0 ${(1 - t) * 14}px` });

/* ---------------- Websites: a page assembles, the visitor clicks, a request arrives ---------------- */
export const SitesLoop: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames: total } = useVideoConfig();
  const out = loopOut(f, total);
  const cx = lerp(860, 300, move(f, 50, 26));
  const cy = lerp(560, 330, move(f, 50, 26));
  const click = interpolate(f, [78, 81, 86], [1, 0.94, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ring = appear(f, 79, 16);
  const notice = appear(f, 86, 14);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Backdrop />
      <g transform="translate(150 80)">
        <rect width={660} height={440} rx={16} fill={C.ink} stroke={C.paper} strokeOpacity={0.12} />
        {[20, 36, 52].map((x) => (
          <circle key={x} cx={x} cy={18} r={4.5} fill={C.paper} fillOpacity={0.18} />
        ))}
        <rect x={220} y={10} width={220} height={16} rx={8} fill={C.paper} fillOpacity={0.06} />
        <path d="M0 36H660" stroke={C.paper} strokeOpacity={0.1} />
        <g opacity={out}>
          <g style={T(appear(f, 4))}>
            <rect x={28} y={58} width={64} height={10} rx={5} fill={C.paper} fillOpacity={0.62} />
            {[0, 1, 2].map((i) => (
              <rect key={i} x={430 + i * 58} y={60} width={40} height={6} rx={3} fill={C.paper} fillOpacity={0.2} />
            ))}
          </g>
          <rect x={28} y={110} width={290} height={26} rx={6} fill={C.paper} fillOpacity={0.62} style={T(appear(f, 10))} />
          <rect x={28} y={144} width={220} height={26} rx={6} fill={C.paper} fillOpacity={0.62} style={T(appear(f, 15))} />
          <g style={T(appear(f, 20))}>
            <rect x={28} y={188} width={260} height={8} rx={4} fill={C.paper} fillOpacity={0.2} />
            <rect x={28} y={204} width={200} height={8} rx={4} fill={C.paper} fillOpacity={0.2} />
          </g>
          <g style={{ ...T(appear(f, 26)), scale: click, transformOrigin: '96px 248px' }}>
            <rect x={28} y={230} width={136} height={36} rx={18} fill={C.apex} />
          </g>
          <circle cx={96} cy={248} r={20 + ring * 40} fill="none" stroke={C.apex} strokeOpacity={ring > 0 ? (1 - ring) * 0.6 : 0} strokeWidth={2} />
          <g style={{ opacity: appear(f, 14), translate: `${(1 - appear(f, 14, 18)) * 30}px 0` }}>
            <rect x={360} y={96} width={272} height={180} rx={10} fill="url(#img)" />
            <use href="#peak" x={476} y={174} width={40} height={24} />
          </g>
          {[0, 1, 2].map((i) => (
            <g key={i} style={T(appear(f, 32 + i * 5))}>
              <rect x={28 + i * 204} y={300} width={188} height={112} rx={10} fill={C.paper} fillOpacity={0.05} />
              <rect x={48 + i * 204} y={324} width={100} height={9} rx={4} fill={C.paper} fillOpacity={0.62} />
              <rect x={48 + i * 204} y={344} width={140} height={6} rx={3} fill={C.paper} fillOpacity={0.2} />
              <rect x={48 + i * 204} y={358} width={110} height={6} rx={3} fill={C.paper} fillOpacity={0.2} />
            </g>
          ))}
        </g>
      </g>

      {/* New request notification */}
      <g opacity={out} style={{ opacity: notice * out, translate: `${(1 - notice) * 40}px 0` }}>
        <rect x={610} y={36} width={250} height={64} rx={16} fill={C.ink3} stroke={C.paper} strokeOpacity={0.14} />
        <circle cx={644} cy={68} r={14} fill={C.apex} />
        <path d="M637 68l5 5 9-10" stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x={670} y={56} width={120} height={9} rx={4} fill={C.paper} fillOpacity={0.62} />
        <rect x={670} y={74} width={160} height={6} rx={3} fill={C.paper} fillOpacity={0.24} />
      </g>

      <Cursor x={cx} y={cy} opacity={appear(f, 46, 8) * out} />
    </svg>
  );
};

/* ---------------- Instagram & SMM: a profile fills with posts, likes and a message ---------------- */
export const SmmLoop: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames: total } = useVideoConfig();
  const out = loopOut(f, total);
  const ring = appear(f, 4, 24);
  const heart = interpolate(f, [62, 70, 76], [0, 1.25, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const msg = appear(f, 80, 14);
  const C_R = 30;
  const circ = 2 * Math.PI * C_R;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Backdrop />
      <g transform="translate(360 30)">
        <rect x={-6} y={-6} width={252} height={552} rx={40} fill={C.ink} fillOpacity={0.6} />
        <rect width={240} height={540} rx={36} fill={C.ink} stroke={C.paper} strokeOpacity={0.16} />
        <rect x={94} y={12} width={52} height={14} rx={7} fill={C.paper} fillOpacity={0.1} />
        <g opacity={out}>
          <circle cx={58} cy={86} r={24} fill="url(#img)" />
          <circle
            cx={58}
            cy={86}
            r={C_R}
            fill="none"
            stroke={C.apex}
            strokeWidth={3}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - ring)}
            transform="rotate(-90 58 86)"
          />
          <g style={T(appear(f, 10))}>
            <rect x={104} y={70} width={90} height={9} rx={4} fill={C.paper} fillOpacity={0.62} />
            <rect x={104} y={88} width={110} height={6} rx={3} fill={C.paper} fillOpacity={0.2} />
            <rect x={104} y={100} width={70} height={6} rx={3} fill={C.paper} fillOpacity={0.2} />
          </g>
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={40 + i * 52} cy={150} r={16} fill="none" stroke={C.paper} strokeOpacity={0.22} style={{ opacity: appear(f, 16 + i * 3) }} />
          ))}
          <path d="M16 186H224" stroke={C.paper} strokeOpacity={0.1} />
          {Array.from({ length: 9 }, (_, i) => {
            const t = appear(f, 24 + i * 4, 14);
            const x = 16 + (i % 3) * 70;
            const y = 196 + Math.floor(i / 3) * 70;
            return (
              <g key={i} style={{ opacity: t, scale: lerp(0.86, 1, t), transformOrigin: `${x + 33}px ${y + 33}px` }}>
                <rect x={x} y={y} width={66} height={66} rx={4} fill="url(#img)" />
                <use href="#peak" x={x + 21} y={y + 26} width={24} height={14} />
              </g>
            );
          })}
          <g style={{ scale: heart, transformOrigin: '120px 300px', opacity: heart > 0 ? 1 : 0 }}>
            <path
              d="M120 318c-14-10-26-19-26-31 0-8 6-14 13-14 6 0 10 3 13 8 3-5 7-8 13-8 7 0 13 6 13 14 0 12-12 21-26 31z"
              fill={C.apex}
            />
          </g>
        </g>
      </g>
      {/* Direct message bubble */}
      <g style={{ opacity: msg * out, translate: `${(1 - msg) * 30}px 0` }}>
        <rect x={620} y={380} width={210} height={58} rx={20} fill={C.ink3} stroke={C.paper} strokeOpacity={0.14} />
        <rect x={642} y={398} width={120} height={8} rx={4} fill={C.paper} fillOpacity={0.62} />
        <rect x={642} y={414} width={160} height={6} rx={3} fill={C.paper} fillOpacity={0.24} />
      </g>
    </svg>
  );
};

/* ---------------- Ads: bars grow, the trend line draws, the best channel lights up ---------------- */
export const AdsLoop: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames: total } = useVideoConfig();
  const out = loopOut(f, total);
  const bars = [0.42, 0.58, 0.36, 0.86, 0.5, 0.64];
  const pts = [
    [60, 300],
    [160, 270],
    [260, 285],
    [360, 200],
    [460, 215],
    [560, 140],
    [620, 120],
  ];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  const draw = move(f, 30, 44);
  const best = appear(f, 80, 12);
  // Dot travels along the polyline
  const seg = draw * (pts.length - 1);
  const i0 = Math.min(pts.length - 2, Math.floor(seg));
  const k = seg - i0;
  const dot = [lerp(pts[i0][0], pts[i0 + 1][0], k), lerp(pts[i0][1], pts[i0 + 1][1], k)];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Backdrop />
      <g transform="translate(140 90)">
        <rect width={680} height={420} rx={18} fill={C.ink} stroke={C.paper} strokeOpacity={0.12} />
        <g opacity={out}>
          <rect x={32} y={30} width={140} height={10} rx={5} fill={C.paper} fillOpacity={0.62} style={T(appear(f, 2))} />
          <rect x={32} y={50} width={90} height={6} rx={3} fill={C.paper} fillOpacity={0.2} style={T(appear(f, 4))} />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M32 ${120 + i * 70}H648`} stroke={C.paper} strokeOpacity={0.07} />
          ))}
          {bars.map((v, i) => {
            const g = appear(f, 8 + i * 5, 22);
            const h = v * 250 * g;
            const isBest = i === 3;
            return (
              <rect
                key={i}
                x={70 + i * 98}
                y={370 - h}
                width={48}
                height={h}
                rx={6}
                fill={isBest ? C.apex : C.paper}
                fillOpacity={isBest ? lerp(0.16, 1, best) : 0.16}
              />
            );
          })}
          <path d={d} fill="none" stroke={C.paper} strokeOpacity={0.7} strokeWidth={2.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          <circle cx={dot[0]} cy={dot[1]} r={7} fill={C.apex} opacity={draw > 0 ? 1 : 0} />
          <circle cx={dot[0]} cy={dot[1]} r={16} fill={C.apex} opacity={draw > 0 ? 0.18 : 0} />
        </g>
      </g>
    </svg>
  );
};

/* ---------------- Sales setup: messages land in a board and move to "booked" ---------------- */
export const SalesLoop: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames: total } = useVideoConfig();
  const out = loopOut(f, total);
  const cols = [380, 530, 680];
  const bubbles = [0, 1, 2];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Backdrop />
      {/* chat */}
      <g transform="translate(90 90)">
        <rect width={230} height={420} rx={22} fill={C.ink} stroke={C.paper} strokeOpacity={0.12} />
        <rect x={20} y={22} width={80} height={9} rx={4} fill={C.paper} fillOpacity={0.62} />
        <path d="M0 50H230" stroke={C.paper} strokeOpacity={0.1} />
      </g>
      {/* board */}
      {cols.map((x, i) => (
        <g key={x}>
          <rect x={x} y={90} width={136} height={420} rx={14} fill={C.paper} fillOpacity={0.03} stroke={C.paper} strokeOpacity={0.08} />
          <rect x={x + 16} y={110} width={i === 2 ? 70 : 56} height={8} rx={4} fill={i === 2 ? C.apex : C.paper} fillOpacity={i === 2 ? 0.9 : 0.4} />
        </g>
      ))}
      <g opacity={out}>
        {bubbles.map((b) => {
          const inT = appear(f, 4 + b * 9, 12);
          const fly = move(f, 34 + b * 7, 20);
          const book = b === 0 ? move(f, 72, 20) : b === 1 ? move(f, 84, 18) : 0;
          // positions: chat bubble → column 1 card → column 3 card
          const chatX = 110;
          const chatY = 160 + b * 70;
          const cardX = cols[0] + 12;
          const cardY = 136 + b * 64;
          const doneX = cols[2] + 12;
          const doneY = 136 + (b === 0 ? 0 : 64);
          let x = lerp(chatX, cardX, fly);
          let y = lerp(chatY, cardY, fly);
          if (book > 0) {
            x = lerp(cardX, doneX, book);
            y = lerp(cardY, doneY, book) - Math.sin(book * Math.PI) * 30;
          }
          const w = lerp(170, 112, fly);
          const booked = book > 0.98;
          return (
            <g key={b} style={{ opacity: inT, translate: `0 ${(1 - inT) * 12}px` }}>
              <rect x={x} y={y} width={w} height={52} rx={fly > 0.5 ? 10 : 18} fill={C.ink3} stroke={booked ? C.apex : C.paper} strokeOpacity={booked ? 0.9 : 0.14} />
              <rect x={x + 14} y={y + 16} width={w * 0.55} height={8} rx={4} fill={C.paper} fillOpacity={0.62} />
              <rect x={x + 14} y={y + 31} width={w * 0.75} height={6} rx={3} fill={C.paper} fillOpacity={0.22} />
            </g>
          );
        })}
      </g>
    </svg>
  );
};

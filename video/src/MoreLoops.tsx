import React from 'react';
import { interpolate, useVideoConfig } from 'remotion';
import { appear, Backdrop, C, H, lerp, loopOut, move, useLoopFrame, W } from './brand';

const T = (t: number) => ({ opacity: t, translate: `0 ${(1 - t) * 14}px` });

/* ---------------- CRM: contacts fill a table, one card opens with its history ---------------- */
export const CrmLoop: React.FC = () => {
  const f = useLoopFrame(88);
  const { durationInFrames: total } = useVideoConfig();
  const out = loopOut(f, total);
  const rows = [0, 1, 2, 3, 4, 5];
  const pick = appear(f, 52, 14);
  const panel = appear(f, 58, 16);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Backdrop />
      <g transform="translate(90 80)">
        <rect width={780} height={440} rx={16} fill={C.ink} stroke={C.paper} strokeOpacity={0.12} />
        <rect x={0} y={0} width={150} height={440} rx={16} fill={C.paper} fillOpacity={0.03} />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={24}
            y={36 + i * 34}
            width={i === 0 ? 92 : 70}
            height={8}
            rx={4}
            fill={i === 0 ? C.apex : C.paper}
            fillOpacity={i === 0 ? 0.9 : 0.22}
          />
        ))}
        <g opacity={out}>
          <rect x={176} y={30} width={160} height={10} rx={5} fill={C.paper} fillOpacity={0.62} style={T(appear(f, 2))} />
          {rows.map((r) => {
            const t = appear(f, 8 + r * 5, 12);
            const y = 70 + r * 56;
            const active = r === 2;
            return (
              <g key={r} style={{ opacity: t, translate: `${(1 - t) * 20}px 0` }}>
                <rect
                  x={176}
                  y={y}
                  width={330}
                  height={44}
                  rx={10}
                  fill={C.paper}
                  fillOpacity={active ? lerp(0.04, 0.08, pick) : 0.04}
                  stroke={C.apex}
                  strokeOpacity={active ? pick * 0.9 : 0}
                />
                <circle cx={200} cy={y + 22} r={10} fill="url(#img)" />
                <rect x={222} y={y + 14} width={96} height={7} rx={3.5} fill={C.paper} fillOpacity={0.62} />
                <rect x={222} y={y + 27} width={64} height={5} rx={2.5} fill={C.paper} fillOpacity={0.22} />
                <rect x={420} y={y + 15} width={66} height={16} rx={8} fill="none" stroke={C.paper} strokeOpacity={0.18} />
              </g>
            );
          })}
          <g style={{ opacity: panel, translate: `${(1 - panel) * 40}px 0` }}>
            <rect x={530} y={30} width={226} height={384} rx={14} fill={C.ink3} stroke={C.paper} strokeOpacity={0.12} />
            <circle cx={562} cy={70} r={18} fill="url(#img)" />
            <rect x={590} y={60} width={110} height={9} rx={4} fill={C.paper} fillOpacity={0.62} />
            <rect x={590} y={76} width={76} height={6} rx={3} fill={C.paper} fillOpacity={0.22} />
            <path d="M554 116V380" stroke={C.paper} strokeOpacity={0.12} />
            {[0, 1, 2, 3].map((i) => (
              <g key={i} style={{ opacity: appear(f, 66 + i * 6, 10) }}>
                <circle cx={554} cy={130 + i * 64} r={6} fill={i === 3 ? C.apex : C.ink3} stroke={i === 3 ? C.apex : C.paper} strokeOpacity={0.5} />
                <rect x={572} y={124 + i * 64} width={120} height={7} rx={3.5} fill={C.paper} fillOpacity={0.5} />
                <rect x={572} y={138 + i * 64} width={150} height={5} rx={2.5} fill={C.paper} fillOpacity={0.18} />
              </g>
            ))}
          </g>
        </g>
      </g>
    </svg>
  );
};

/* ---------------- Databases: tables appear, relations draw, a record travels ---------------- */
const TABLES = [
  { x: 110, y: 120, rows: 5, d: 2 },
  { x: 400, y: 70, rows: 4, d: 10 },
  { x: 400, y: 330, rows: 3, d: 18 },
  { x: 690, y: 200, rows: 5, d: 26 },
];
const LINKS: [string, number][] = [
  ['M270 170 C 330 170, 340 110, 400 110', 36],
  ['M270 230 C 330 230, 340 370, 400 370', 42],
  ['M560 120 C 620 120, 630 250, 690 250', 48],
  ['M560 380 C 620 380, 630 300, 690 300', 54],
];

export const DatabaseLoop: React.FC = () => {
  const f = useLoopFrame(90);
  const { durationInFrames: total } = useVideoConfig();
  const out = loopOut(f, total);
  const k = move(f, 70, 22);
  const dot = { x: lerp(560, 690, k), y: lerp(120, 250, k * k * (3 - 2 * k)) };

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Backdrop />
      <g opacity={out}>
        {LINKS.map(([d, start], i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={i === 2 ? C.apex : C.paper}
            strokeOpacity={i === 2 ? 0.9 : 0.3}
            strokeWidth={2}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - move(f, start, 18)}
          />
        ))}
        {TABLES.map((tb, i) => {
          const t = appear(f, tb.d, 14);
          const h = 44 + tb.rows * 26;
          return (
            <g key={i} style={{ opacity: t, translate: `0 ${(1 - t) * 16}px` }}>
              <rect x={tb.x} y={tb.y} width={160} height={h} rx={12} fill={C.ink} stroke={C.paper} strokeOpacity={0.14} />
              <rect x={tb.x} y={tb.y} width={160} height={36} rx={12} fill={C.paper} fillOpacity={0.05} />
              <rect
                x={tb.x + 16}
                y={tb.y + 14}
                width={70}
                height={8}
                rx={4}
                fill={i === 3 ? C.apex : C.paper}
                fillOpacity={i === 3 ? 0.9 : 0.62}
              />
              {Array.from({ length: tb.rows }, (_, r) => (
                <g key={r} style={{ opacity: appear(f, tb.d + 8 + r * 3, 8) }}>
                  <rect x={tb.x + 16} y={tb.y + 50 + r * 26} width={56} height={6} rx={3} fill={C.paper} fillOpacity={0.4} />
                  <rect x={tb.x + 90} y={tb.y + 50 + r * 26} width={50} height={6} rx={3} fill={C.paper} fillOpacity={0.18} />
                </g>
              ))}
            </g>
          );
        })}
        <circle cx={dot.x} cy={dot.y} r={6} fill={C.apex} opacity={k > 0 && k < 1 ? 1 : 0} />
      </g>
    </svg>
  );
};

/* ---------------- Acquiring: a card taps the terminal, payment confirmed, receipt prints ---------------- */
export const AcquiringLoop: React.FC = () => {
  const f = useLoopFrame(92);
  const { durationInFrames: total } = useVideoConfig();
  const out = loopOut(f, total);
  const cardIn = move(f, 8, 26);
  const tap = interpolate(f, [34, 40, 46], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ok = appear(f, 46, 12);
  const receipt = move(f, 58, 30);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Backdrop />
      <defs>
        <clipPath id="rcpt">
          <rect x={400} y={-100} width={160} height={210} />
        </clipPath>
      </defs>
      {/* receipt sliding out of the top of the terminal */}
      <g clipPath="url(#rcpt)">
        <g opacity={out} style={{ translate: `0 ${lerp(0, -150, receipt)}px` }}>
          <rect x={410} y={110} width={140} height={170} rx={4} fill={C.paper} fillOpacity={0.9} />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={426} y={130 + i * 22} width={i === 4 ? 60 : 108} height={6} rx={3} fill={C.ink} fillOpacity={i === 4 ? 0.7 : 0.25} />
          ))}
        </g>
      </g>
      {/* terminal */}
      <g transform="translate(360 110)">
        <rect width={240} height={380} rx={30} fill={C.ink} stroke={C.paper} strokeOpacity={0.14} />
        <rect x={24} y={28} width={192} height={150} rx={14} fill={C.ink3} />
        <g opacity={out}>
          <circle cx={120} cy={103} r={34} fill="none" stroke={C.apex} strokeWidth={3} strokeOpacity={ok} />
          <path
            d="M104 104l11 11 22-24"
            fill="none"
            stroke={C.apex}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - ok}
          />
          <circle cx={120} cy={103} r={34 + tap * 30} fill="none" stroke={C.paper} strokeOpacity={tap * 0.4} />
        </g>
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <rect key={`${row}-${col}`} x={40 + col * 58} y={206 + row * 50} width={44} height={34} rx={8} fill={C.paper} fillOpacity={0.06} />
          )),
        )}
      </g>
      {/* card */}
      <g
        opacity={out}
        style={{
          translate: `${lerp(260, 0, cardIn)}px ${lerp(80, 0, cardIn)}px`,
          rotate: `${lerp(14, -8, cardIn)}deg`,
          transformOrigin: '650px 210px',
        }}
      >
        <rect x={560} y={150} width={200} height={124} rx={14} fill={C.ink3} stroke={C.paper} strokeOpacity={0.2} />
        <rect x={582} y={176} width={34} height={26} rx={5} fill={C.paper} fillOpacity={0.35} />
        <rect x={582} y={226} width={120} height={8} rx={4} fill={C.paper} fillOpacity={0.5} />
        <rect x={582} y={244} width={70} height={6} rx={3} fill={C.paper} fillOpacity={0.22} />
        <circle cx={728} cy={180} r={9} fill={C.apex} fillOpacity={0.9} />
      </g>
    </svg>
  );
};

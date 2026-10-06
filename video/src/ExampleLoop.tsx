import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { desktop, phone } from '../../src/data/example-layouts';
import { Backdrop, C, H, W, move } from './brand';
import { Prims } from './Prims';

export type ExampleLoopProps = { layout: number };

/**
 * A website concept being scrolled: the first frame equals the static placeholder on the site
 * (used as the poster), the page scrolls down, holds, scrolls back — the loop is seamless.
 */
export const ExampleLoop: React.FC<ExampleLoopProps> = ({ layout }) => {
  const frame = useCurrentFrame();
  const { durationInFrames: T } = useVideoConfig();
  const n = ((layout - 1) % 6) + 1;

  // hold → down → hold → up → hold
  const down = move(frame, T * 0.12, T * 0.32);
  const up = move(frame, T * 0.6, T * 0.3);
  const scroll = down - up; // 0 → 1 → 0
  const desktopY = -scroll * 200;
  const phoneDelay = move(frame, T * 0.18, T * 0.32) - move(frame, T * 0.64, T * 0.28);
  const phoneY = -phoneDelay * 160;

  // Content below the first screen: the same layout without the nav, repeated.
  const rest = desktop[n].slice(5);
  const phoneRest = phone[n].slice(1);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Backdrop />
      <defs>
        <clipPath id="d-clip">
          <rect x={0} y={0} width={720} height={446} rx={0} />
        </clipPath>
        <clipPath id="p-clip">
          <rect x={0} y={0} width={164} height={334} rx={18} />
        </clipPath>
      </defs>

      {/* Desktop browser */}
      <g transform="translate(40 48)">
        <rect width={720} height={480} rx={14} fill={C.ink} stroke={C.paper} strokeOpacity={0.12} />
        <circle cx={20} cy={17} r={4.5} fill={C.paper} fillOpacity={0.18} />
        <circle cx={36} cy={17} r={4.5} fill={C.paper} fillOpacity={0.18} />
        <circle cx={52} cy={17} r={4.5} fill={C.paper} fillOpacity={0.18} />
        <rect x={250} y={9} width={220} height={16} rx={8} fill={C.paper} fillOpacity={0.06} />
        <path d="M0 34H720" stroke={C.paper} strokeOpacity={0.1} />
        <g transform="translate(0 34)" clipPath="url(#d-clip)">
          <g transform={`translate(0 ${desktopY})`}>
            <Prims items={desktop[n]} />
            <Prims items={rest} dy={400} />
          </g>
        </g>
        {/* scrollbar */}
        <rect x={712} y={44 + scroll * 220} width={4} height={180} rx={2} fill={C.paper} fillOpacity={0.14} />
      </g>

      {/* Phone */}
      <g transform="translate(736 158)">
        <rect x={-6} y={-6} width={192} height={388} rx={30} fill={C.ink} fillOpacity={0.6} />
        <rect width={180} height={376} rx={26} fill={C.ink} stroke={C.paper} strokeOpacity={0.16} />
        <g transform="translate(8 34)" clipPath="url(#p-clip)">
          <g transform={`translate(0 ${phoneY})`}>
            <Prims items={phone[n]} small />
            <Prims items={phoneRest} small dy={322} />
          </g>
        </g>
        <rect x={66} y={10} width={48} height={12} rx={6} fill={C.paper} fillOpacity={0.1} />
      </g>
    </svg>
  );
};

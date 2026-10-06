import React from 'react';
import type { Prim } from '../../src/data/example-layouts';
import { C } from './brand';

/** Renders wireframe primitives exactly like the site's ExamplePlaceholder. */
export const Prims: React.FC<{ items: Prim[]; small?: boolean; dy?: number }> = ({ items, small = false, dy = 0 }) => (
  <g transform={`translate(0 ${dy})`}>
    {items.map((p, i) => {
      if (p.t === 'circle') {
        return <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="url(#img)" stroke={C.paper} strokeOpacity={0.1} />;
      }
      if (p.t === 'img') {
        const gw = small ? 24 : 40;
        const gh = small ? 14 : 24;
        return (
          <g key={i}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={small ? 6 : 8} fill="url(#img)" />
            <use href="#peak" x={p.x + p.w / 2 - gw / 2} y={p.y + p.h / 2 - gh / 2} width={gw} height={gh} />
          </g>
        );
      }
      if (p.t === 'btn') return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.h / 2} fill={C.apex} />;
      if (p.t === 'chip' || p.t === 'chipA') {
        return (
          <rect
            key={i}
            x={p.x + 0.5}
            y={p.y + 0.5}
            width={p.w - 1}
            height={p.h - 1}
            rx={p.h / 2}
            fill="none"
            stroke={p.t === 'chipA' ? C.apex : C.paper}
            strokeOpacity={p.t === 'chipA' ? 0.9 : 0.16}
          />
        );
      }
      return (
        <rect
          key={i}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          rx={p.t === 'block' ? (small ? 8 : 10) : Math.min(p.h / 2, small ? 4 : 5)}
          fill={C.paper}
          fillOpacity={p.t === 'title' ? 0.62 : p.t === 'line' ? 0.2 : 0.05}
        />
      );
    })}
  </g>
);

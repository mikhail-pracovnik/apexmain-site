/**
 * Wireframe layouts for example placeholders (1–6). Used by the site (ExamplePlaceholder.astro)
 * and by the Remotion loops in /video, so the poster frame matches the static placeholder.
 * Desktop content area: 720 × 446. Phone screen: 164 × 330.
 */
export type Prim =
  | { t: 'title' | 'line' | 'block' | 'img' | 'btn' | 'chip' | 'chipA'; x: number; y: number; w: number; h: number }
  | { t: 'circle'; x: number; y: number; r: number };

const nav = (w: number): Prim[] => [
  { t: 'title', x: 28, y: 22, w: 64, h: 10 },
  ...[0, 1, 2].map((i) => ({ t: 'line' as const, x: w - 250 + i * 58, y: 24, w: 40, h: 6 })),
  { t: 'chip', x: w - 82, y: 15, w: 54, h: 22 },
];
export const W = 720;

export const desktop: Record<number, Prim[]> = {
  1: [
    ...nav(W),
    { t: 'title', x: 28, y: 84, w: 300, h: 24 },
    { t: 'title', x: 28, y: 116, w: 240, h: 24 },
    { t: 'line', x: 28, y: 160, w: 290, h: 8 },
    { t: 'line', x: 28, y: 176, w: 230, h: 8 },
    { t: 'btn', x: 28, y: 204, w: 132, h: 34 },
    { t: 'img', x: 380, y: 66, w: 312, h: 196 },
    ...[0, 1, 2, 3].flatMap((i) => [
      { t: 'img' as const, x: 28 + i * 168, y: 290, w: 152, h: 100 },
      { t: 'line' as const, x: 28 + i * 168, y: 402, w: 100, h: 8 },
      { t: 'line' as const, x: 28 + i * 168, y: 418, w: 60, h: 6 },
    ]),
  ],
  2: [
    ...nav(W),
    { t: 'title', x: 200, y: 78, w: 320, h: 24 },
    { t: 'title', x: 240, y: 110, w: 240, h: 24 },
    { t: 'line', x: 225, y: 152, w: 270, h: 8 },
    { t: 'btn', x: 294, y: 178, w: 132, h: 34 },
    ...[0, 1, 2].flatMap((i) => [
      { t: 'block' as const, x: 28 + i * 226, y: 244, w: 210, h: 176 },
      { t: 'circle' as const, x: 60 + i * 226, y: 282, r: 16 },
      { t: 'title' as const, x: 46 + i * 226, y: 316, w: 120, h: 10 },
      { t: 'line' as const, x: 46 + i * 226, y: 340, w: 160, h: 6 },
      { t: 'line' as const, x: 46 + i * 226, y: 354, w: 140, h: 6 },
      { t: 'line' as const, x: 46 + i * 226, y: 368, w: 100, h: 6 },
    ]),
  ],
  3: [
    ...nav(W),
    { t: 'block', x: 28, y: 56, w: 664, h: 70 },
    { t: 'title', x: 52, y: 76, w: 220, h: 14 },
    { t: 'line', x: 52, y: 100, w: 160, h: 6 },
    { t: 'btn', x: 560, y: 76, w: 108, h: 30 },
    ...[0, 1].flatMap((row) =>
      [0, 1, 2, 3].flatMap((i) => [
        { t: 'img' as const, x: 28 + i * 168, y: 144 + row * 152, w: 152, h: 96 },
        { t: 'line' as const, x: 28 + i * 168, y: 250 + row * 152, w: 110, h: 7 },
        { t: 'title' as const, x: 28 + i * 168, y: 266 + row * 152, w: 54, h: 8 },
      ]),
    ),
  ],
  4: [
    ...nav(W),
    { t: 'img', x: 28, y: 56, w: 664, h: 232 },
    { t: 'title', x: 56, y: 186, w: 280, h: 22 },
    { t: 'line', x: 56, y: 218, w: 200, h: 8 },
    { t: 'btn', x: 56, y: 240, w: 132, h: 32 },
    { t: 'title', x: 28, y: 312, w: 150, h: 10 },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: (i === 2 ? 'chipA' : 'chip') as 'chip', x: 28 + i * 111, y: 336, w: 99, h: 32 })),
    { t: 'line', x: 28, y: 392, w: 420, h: 7 },
    { t: 'line', x: 28, y: 408, w: 300, h: 7 },
  ],
  5: [
    ...nav(W),
    { t: 'title', x: 28, y: 70, w: 330, h: 30 },
    { t: 'title', x: 28, y: 108, w: 280, h: 30 },
    { t: 'title', x: 28, y: 146, w: 200, h: 30 },
    { t: 'btn', x: 28, y: 198, w: 132, h: 34 },
    { t: 'img', x: 420, y: 56, w: 272, h: 246 },
    ...[0, 1, 2].flatMap((i) => [
      { t: 'line' as const, x: 28, y: 328 + i * 36, w: 260, h: 8 },
      { t: 'title' as const, x: 330, y: 326 + i * 36, w: 60, h: 10 },
      { t: 'block' as const, x: 28, y: 348 + i * 36, w: 362, h: 1 },
    ]),
    { t: 'img', x: 420, y: 318, w: 130, h: 104 },
    { t: 'img', x: 562, y: 318, w: 130, h: 104 },
  ],
  6: [
    ...nav(W),
    ...[0, 1, 2, 3, 4].map((i) => ({ t: (i === 0 ? 'btn' : 'chip') as 'chip', x: 28 + i * 92, y: 60, w: 80, h: 26 })),
    ...[0, 1].flatMap((row) =>
      [0, 1, 2].flatMap((i) => [
        { t: 'block' as const, x: 28 + i * 226, y: 106 + row * 168, w: 210, h: 156 },
        { t: 'circle' as const, x: 133 + i * 226, y: 154 + row * 168, r: 38 },
        { t: 'title' as const, x: 48 + i * 226, y: 212 + row * 168, w: 110, h: 9 },
        { t: 'line' as const, x: 48 + i * 226, y: 230 + row * 168, w: 70, h: 7 },
        { t: 'chip' as const, x: 186 + i * 226, y: 222 + row * 168, w: 32, h: 22 },
      ]),
    ),
  ],
};

// Phone screen content, 164 × 330
export const phone: Record<number, Prim[]> = {
  1: [
    { t: 'title', x: 12, y: 12, w: 40, h: 8 },
    { t: 'img', x: 12, y: 32, w: 140, h: 116 },
    { t: 'title', x: 12, y: 162, w: 124, h: 12 },
    { t: 'title', x: 12, y: 180, w: 90, h: 12 },
    { t: 'line', x: 12, y: 202, w: 132, h: 6 },
    { t: 'btn', x: 12, y: 220, w: 140, h: 28 },
    { t: 'img', x: 12, y: 262, w: 66, h: 60 },
    { t: 'img', x: 86, y: 262, w: 66, h: 60 },
  ],
  2: [
    { t: 'title', x: 12, y: 12, w: 40, h: 8 },
    { t: 'title', x: 22, y: 40, w: 120, h: 12 },
    { t: 'title', x: 36, y: 58, w: 92, h: 12 },
    { t: 'line', x: 26, y: 80, w: 112, h: 6 },
    { t: 'btn', x: 32, y: 98, w: 100, h: 26 },
    ...[0, 1, 2].flatMap((i) => [
      { t: 'block' as const, x: 12, y: 140 + i * 62, w: 140, h: 52 },
      { t: 'circle' as const, x: 32, y: 166 + i * 62, r: 10 },
      { t: 'title' as const, x: 52, y: 158 + i * 62, w: 80, h: 7 },
      { t: 'line' as const, x: 52, y: 172 + i * 62, w: 64, h: 5 },
    ]),
  ],
  3: [
    { t: 'title', x: 12, y: 12, w: 40, h: 8 },
    { t: 'block', x: 12, y: 30, w: 140, h: 44 },
    { t: 'title', x: 22, y: 42, w: 80, h: 8 },
    { t: 'btn', x: 22, y: 56, w: 50, h: 12 },
    ...[0, 1, 2].flatMap((row) =>
      [0, 1].flatMap((i) => [
        { t: 'img' as const, x: 12 + i * 74, y: 86 + row * 80, w: 66, h: 54 },
        { t: 'line' as const, x: 12 + i * 74, y: 146 + row * 80, w: 50, h: 5 },
      ]),
    ),
  ],
  4: [
    { t: 'title', x: 12, y: 12, w: 40, h: 8 },
    { t: 'img', x: 12, y: 30, w: 140, h: 150 },
    { t: 'title', x: 24, y: 130, w: 96, h: 10 },
    { t: 'btn', x: 24, y: 150, w: 70, h: 20 },
    { t: 'title', x: 12, y: 194, w: 70, h: 7 },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({
      t: (i === 2 ? 'chipA' : 'chip') as 'chip',
      x: 12 + (i % 3) * 48,
      y: 212 + Math.floor(i / 3) * 34,
      w: 42,
      h: 26,
    })),
  ],
  5: [
    { t: 'title', x: 12, y: 12, w: 40, h: 8 },
    { t: 'title', x: 12, y: 36, w: 130, h: 16 },
    { t: 'title', x: 12, y: 58, w: 100, h: 16 },
    { t: 'btn', x: 12, y: 86, w: 90, h: 26 },
    { t: 'img', x: 12, y: 126, w: 140, h: 110 },
    ...[0, 1, 2].flatMap((i) => [
      { t: 'line' as const, x: 12, y: 252 + i * 24, w: 90, h: 6 },
      { t: 'title' as const, x: 122, y: 251 + i * 24, w: 30, h: 7 },
    ]),
  ],
  6: [
    { t: 'title', x: 12, y: 12, w: 40, h: 8 },
    ...[0, 1, 2].map((i) => ({ t: (i === 0 ? 'btn' : 'chip') as 'chip', x: 12 + i * 48, y: 32, w: 42, h: 20 })),
    ...[0, 1, 2].flatMap((i) => [
      { t: 'block' as const, x: 12, y: 66 + i * 86, w: 140, h: 76 },
      { t: 'circle' as const, x: 46, y: 104 + i * 86, r: 24 },
      { t: 'title' as const, x: 80, y: 92 + i * 86, w: 60, h: 7 },
      { t: 'line' as const, x: 80, y: 106 + i * 86, w: 44, h: 5 },
    ]),
  ],
};


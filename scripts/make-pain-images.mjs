#!/usr/bin/env node
/**
 * Pain illustrations for the home page: assets/pains/pain-0N-*.jpg (928×1152 sources, not published)
 * → public/media/pains/pain-0N-{480,960}.{avif,webp}.
 * Prints each image's background tone (average of the bottom rows): it goes into src/content/pains.yaml
 * as `tone`, so the card under the picture has exactly the picture's own background.
 * Usage: node scripts/make-pain-images.mjs
 */
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'assets/pains';
const OUT = 'public/media/pains';
const WIDTHS = [480, 960];
mkdirSync(OUT, { recursive: true });

const hex = (n) => Math.round(n).toString(16).padStart(2, '0');
let total = 0;
for (const file of readdirSync(SRC).filter((f) => /^pain-\d\d-.*\.jpe?g$/.test(f)).sort()) {
  const id = file.slice(0, 7); // pain-01
  const src = sharp(`${SRC}/${file}`);
  const { width, height } = await src.metadata();
  // background tone: the bottom 6% of the picture, full width
  const band = Math.round(height * 0.06);
  const { data } = await sharp(`${SRC}/${file}`)
    .extract({ left: 0, top: height - band, width, height: band })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0];
  for (let i = 0; i < data.length; i += 3) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
  const n = data.length / 3;
  const tone = `#${sum.map((v) => hex(v / n)).join('')}`;

  for (const w of WIDTHS) {
    const img = sharp(`${SRC}/${file}`).resize({ width: w });
    await img.clone().avif({ quality: 52, effort: 6 }).toFile(`${OUT}/${id}-${w}.avif`);
    await img.clone().webp({ quality: 74, effort: 6 }).toFile(`${OUT}/${id}-${w}.webp`);
  }
  const sizes = WIDTHS.flatMap((w) => ['avif', 'webp'].map((f) => statSync(`${OUT}/${id}-${w}.${f}`).size));
  total += sizes.reduce((a, b) => a + b, 0);
  console.log(`${id}  tone ${tone}  ${sizes.map((s) => `${(s / 1024).toFixed(0)}K`).join(' / ')}  (avif480 webp480 avif960 webp960)`);
}
console.log(`all files: ${(total / 1024).toFixed(0)} KB`);

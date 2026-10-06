// Render every loop to WebM (VP9) + MP4 (H.264) + JPEG poster into ../public/media.
// Retries with stronger compression until each video is under the size budget.
// Usage: node scripts/render-all.mjs [composition-id ...]
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BUDGET = 500 * 1024;
const OUT = 'out';
const PUBLIC = join('..', 'public', 'media');

const jobs = [
  ['service-sites', 'services/sites', 92],
  ['service-instagram-smm', 'services/instagram-smm', 90],
  ['service-ads', 'services/ads', 92],
  ['service-sales', 'services/sales', 70],
  ...[1, 2, 3, 4, 5, 6].map((n) => [`example-${n}`, `examples/example-${n}`, 0]),
];

const only = process.argv.slice(2);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = (args) => execFileSync(npx, ['remotion', ...args], { stdio: ['ignore', 'ignore', 'inherit'], shell: process.platform === 'win32' });

mkdirSync(OUT, { recursive: true });
for (const [id, target, posterFrame] of jobs) {
  if (only.length && !only.includes(id)) continue;
  const dest = join(PUBLIC, target);
  mkdirSync(join(dest, '..'), { recursive: true });

  for (const [codec, ext, crfs] of [
    ['vp9', 'webm', [36, 40, 44, 48]],
    ['h264', 'mp4', [28, 31, 34, 37]],
  ]) {
    let size = Infinity;
    for (const crf of crfs) {
      const file = join(OUT, `${id}.${ext}`);
      run(['render', id, file, `--codec=${codec}`, `--crf=${crf}`, '--muted', '--log=error']);
      size = statSync(file).size;
      if (size <= BUDGET) {
        copyFileSync(file, `${dest}.${ext}`);
        console.log(`${id}.${ext}: ${(size / 1024).toFixed(0)} KB (crf ${crf})`);
        break;
      }
    }
    if (size > BUDGET) throw new Error(`${id}.${ext} is ${(size / 1024).toFixed(0)} KB, over budget`);
  }

  const poster = join(OUT, `${id}.jpg`);
  run(['still', id, poster, `--frame=${posterFrame}`, '--image-format=jpeg', '--jpeg-quality=78', '--log=error']);
  copyFileSync(poster, `${dest}.jpg`);
  console.log(`${id}.jpg: ${(statSync(poster).size / 1024).toFixed(0)} KB`);
}

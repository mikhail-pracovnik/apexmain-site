// Render every loop into ../public/media:
//   1. Remotion renders a high-quality H.264 master at 640×400 (24 fps, from the 960×600 composition);
//   2. ffmpeg (bundled with Remotion) encodes the web files with standard settings:
//      MP4 — H.264 High, yuv420p, faststart; WebM — VP9 (libvpx-vp9), yuv420p;
//   3. the poster is frame 0, which is mid-animation thanks to useLoopFrame().
// Each video must stay under the size budget; CRF is raised until it fits.
// Usage: node scripts/render-all.mjs [composition-id ...]
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BUDGET = 500 * 1024;
const OUT = 'out';
const PUBLIC = join('..', 'public', 'media');
const SCALE = String(2 / 3); // 960×600 → 640×400

const jobs = [
  ['service-sites', 'services/sites'],
  ['service-instagram-smm', 'services/instagram-smm'],
  ['service-ads', 'services/ads'],
  ['service-sales', 'services/sales'],
  ['service-crm', 'services/crm'],
  ['service-databases', 'services/databases'],
  ['service-acquiring', 'services/acquiring'],
  ...[1, 2, 3, 4, 5, 6].map((n) => [`example-${n}`, `examples/example-${n}`]),
];

const only = process.argv.slice(2);
const isWin = process.platform === 'win32';
const npx = isWin ? 'npx.cmd' : 'npx';
const exec = (args) => execFileSync(npx, args, { stdio: ['ignore', 'ignore', 'inherit'], shell: isWin });
const remotion = (...args) => exec(['remotion', ...args]);
const ffmpeg = (...args) => exec(['remotion', 'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', ...args]);

const encoders = {
  mp4: (src, dst, crf) =>
    ffmpeg('-i', src, '-an', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', crf, '-movflags', '+faststart', dst),
  webm: (src, dst, crf) =>
    ffmpeg('-i', src, '-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-b:v', '0', '-crf', crf, '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', dst),
};
const crfs = { mp4: ['24', '27', '30', '33'], webm: ['34', '38', '42', '46'] };

mkdirSync(OUT, { recursive: true });
for (const [id, target] of jobs) {
  if (only.length && !only.includes(id)) continue;
  const dest = join(PUBLIC, target);
  mkdirSync(join(dest, '..'), { recursive: true });

  const master = join(OUT, `${id}.master.mp4`);
  remotion('render', id, master, '--codec=h264', '--crf=12', `--scale=${SCALE}`, '--muted', '--log=error');

  for (const ext of ['mp4', 'webm']) {
    const file = join(OUT, `${id}.${ext}`);
    let size = Infinity;
    for (const crf of crfs[ext]) {
      encoders[ext](master, file, crf);
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
  remotion('still', id, poster, '--frame=0', `--scale=${SCALE}`, '--image-format=jpeg', '--jpeg-quality=82', '--log=error');
  copyFileSync(poster, `${dest}.jpg`);
  console.log(`${id}.jpg: ${(statSync(poster).size / 1024).toFixed(0)} KB`);
}

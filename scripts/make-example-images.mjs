#!/usr/bin/env node
/**
 * Example mock-ups for the site: assets/examples-src/<id>/*.png (anonymised screenshots, not in git)
 * → public/media/examples/<id>/… and the manifest src/data/example-media.json.
 * Usage: npm run images:examples   (deterministic; the sources are never modified)
 *
 * Quality is the owner's requirement (these are the showcase): AVIF q70 4:4:4, WebP near-lossless (better than
 * lossy q90: full colour resolution), JPEG q90 4:4:4,
 * Lanczos3 downscaling only (never upscaling), no sharpening.
 *
 * What is made, per example:
 *  - card-desktop-<w>: the top three desktop screens (strip for the card's browser window, it scrolls);
 *  - card-mobile-<w>:  the top three phone screens (strip for the card's phone);
 *  - thumb-<w>:        the first desktop screen, small (background grid of the "your business" card);
 *  - <device>-<page>-<nn>-<w>: full pages for the panel, in pieces. Safari on iPhone does not decode images
 *    much over ~16 MP, so a page is cut into pieces of at most 2880×3000 (desktop) / 1170×3000 (phone).
 *    The page is resized as a whole first and cut after, so the pieces are slices of one image; each piece
 *    also repeats the first OVERLAP rows of the next one (the CSS pulls the next piece up over them), so no
 *    seam can open at any zoom. Widths are chosen so every scale gives whole pixels.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

sharp.concurrency(4);
const SRC = 'assets/examples-src';
const OUT = 'public/media/examples';
const MANIFEST = 'src/data/example-media.json';
const IDS = ['barber', 'coffee', 'clinic', 'salon', 'florist', 'beauty'];

const ENC = {
  avif: (s) => s.avif({ quality: 70, chromaSubsampling: '4:4:4', effort: 4 }),
  // lossy WebP always halves colour resolution (4:2:0), even at q95: small coloured text came out soft at 1x.
  // Near-lossless keeps full colour and matches the source (WebP is only the fallback for browsers without AVIF).
  webp: (s) => s.webp({ nearLossless: true, quality: 60, effort: 5 }),
  jpg: (s) => s.jpeg({ quality: 90, chromaSubsampling: '4:4:4', mozjpeg: true }),
};
const DEVICE = {
  // srcW: source width; rows: piece height in source px (+ overlap = 3000 max); widths: whole-pixel scales
  desktop: { srcW: 2880, rows: 2992, overlap: 8, widths: [1440, 2160, 2880] },
  mobile: { srcW: 1170, rows: 2991, overlap: 9, widths: [390, 780, 1170] },
};
const CARD = {
  desktop: { file: 'desktop-index-full.png', screen: 1800, screens: 3, widths: [400, 640, 860, 1140, 1600] },
  mobile: { file: 'mobile-index.png', screen: 2532, screens: 3, widths: [130, 260, 390] },
};
const THUMB_WIDTHS = [240, 480, 720, 960];
const PAGES = { index: { desktop: 'desktop-index-full.png', mobile: 'mobile-index.png' }, catalog: { desktop: 'desktop-catalog.png', mobile: 'mobile-catalog.png' } };

const open = (file) => sharp(file, { limitInputPixels: false });
async function writeAll(img, base) {
  await Promise.all(Object.entries(ENC).map(([ext, enc]) => enc(img.clone()).toFile(`${base}.${ext}`)));
}

const manifest = { device: DEVICE, card: {}, examples: {} };
for (const [k, c] of Object.entries(CARD)) manifest.card[k] = { widths: c.widths, screens: c.screens };
manifest.thumbWidths = THUMB_WIDTHS;

for (const id of IDS) {
  const dir = `${SRC}/${id}`;
  if (!existsSync(dir)) throw new Error(`missing ${dir}`);
  const out = `${OUT}/${id}`;
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const entry = { card: {}, pages: { desktop: {}, mobile: {} } };

  // card strips
  for (const [kind, c] of Object.entries(CARD)) {
    const meta = await open(`${dir}/${c.file}`).metadata();
    const rows = Math.min(meta.height, c.screen * c.screens);
    entry.card[kind] = { srcW: meta.width, rows };
    for (const w of c.widths) {
      if (w > meta.width) continue; // never upscale
      await writeAll(open(`${dir}/${c.file}`).extract({ left: 0, top: 0, width: meta.width, height: rows }).resize({ width: w, kernel: 'lanczos3' }), `${out}/card-${kind}-${w}`);
    }
  }
  // thumbnails of the first desktop screen
  for (const w of THUMB_WIDTHS) await writeAll(open(`${dir}/desktop-index.png`).resize({ width: w, kernel: 'lanczos3' }), `${out}/thumb-${w}`);

  // full pages in pieces
  for (const [page, files] of Object.entries(PAGES)) {
    for (const [device, d] of Object.entries(DEVICE)) {
      const file = `${dir}/${files[device]}`;
      const meta = await open(file).metadata();
      if (meta.width !== d.srcW) throw new Error(`${file}: width ${meta.width}, expected ${d.srcW}`);
      const pieces = [];
      for (let y = 0; y < meta.height; y += d.rows) pieces.push({ y, rows: Math.min(d.rows + d.overlap, meta.height - y) });
      entry.pages[device][page] = { height: meta.height, pieces: pieces.map((p) => p.rows) };
      for (const w of d.widths) {
        const s = w / d.srcW;
        const { data, info } = await open(file).resize({ width: w, kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
        for (const [i, p] of pieces.entries()) {
          const top = Math.round(p.y * s);
          const height = Math.min(Math.round(p.rows * s), info.height - top);
          const piece = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).extract({ left: 0, top, width: info.width, height });
          await writeAll(piece, `${out}/${device}-${page}-${String(i + 1).padStart(2, '0')}-${w}`);
        }
      }
    }
  }
  manifest.examples[id] = entry;
  console.log(`${id}: done`);
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest → ${MANIFEST}`);

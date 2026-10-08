/**
 * Picture sets for the example mock-ups, from the manifest written by scripts/make-example-images.mjs.
 * Every place gets AVIF + WebP + JPEG with a width ladder, so the browser always has a file at least as
 * wide as it needs (1x–3x) and never has to stretch one.
 */
import manifest from '../data/example-media.json';
import { asset } from '../i18n';

export type MediaManifest = typeof manifest;
export const exampleMedia = manifest;

export interface PictureSet {
  /** srcset per format, the JPEG one doubles as the <img> srcset */
  avif: string;
  webp: string;
  jpg: string;
  /** smallest JPEG as the plain src */
  src: string;
  /** intrinsic size of the largest file (for width/height attributes = aspect ratio) */
  width: number;
  height: number;
}

const dir = (id: string) => `media/examples/${id}`;

function set(base: (w: number) => string, widths: number[], heightAt: (w: number) => number): PictureSet {
  const list = (ext: string) => widths.map((w) => `${asset(`${base(w)}.${ext}`)} ${w}w`).join(', ');
  const max = widths[widths.length - 1];
  return { avif: list('avif'), webp: list('webp'), jpg: list('jpg'), src: asset(`${base(widths[0])}.jpg`), width: max, height: heightAt(max) };
}

/** Scrolling strip in the card: the top screens of the desktop (browser window) or phone home page. */
export function cardStrip(id: string, kind: 'desktop' | 'mobile'): PictureSet {
  const c = manifest.examples[id as keyof typeof manifest.examples].card[kind];
  const widths = manifest.card[kind].widths.filter((w) => w <= c.srcW);
  return set((w) => `${dir(id)}/card-${kind}-${w}`, widths, (w) => Math.round((c.rows * w) / c.srcW));
}

/** First desktop screen, small (background of the "your business" card). */
export function thumb(id: string): PictureSet {
  return set((w) => `${dir(id)}/thumb-${w}`, manifest.thumbWidths, (w) => Math.round((w * 1800) / 2880));
}

/** Card backdrop: the first desktop screen, small and blurred at build time; color = its average (placeholder). */
export function cardBg(id: string) {
  const b = manifest.examples[id as keyof typeof manifest.examples].bg;
  const f = (ext: string) => asset(`${dir(id)}/bg.${ext}`);
  return { avif: f('avif'), webp: f('webp'), jpg: f('jpg'), width: b.width, height: b.height, color: b.color };
}

export function exampleIds() {
  return Object.keys(manifest.examples);
}

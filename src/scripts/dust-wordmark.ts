/**
 * "Dust" wordmark behind the hero: lowercase "apex / main" made of small, dense dots.
 *
 * - The text is drawn with the site display font on an offscreen canvas; every grid point takes the
 *   anti-aliased coverage as its brightness, and a small jitter breaks the grid, so curves stay smooth
 *   and the mark reads as dust rather than pixels.
 * - At rest it is dim (brightness setting = share of the text colour). Near the cursor / finger dots get
 *   brighter and drift apart; a click or tap sends a circular ripple that lights dots up as it passes.
 * - No masks: every dot of "apex" has the same brightness, every dot of "main" too; the page layout
 *   keeps the text off the wordmark (stacked layout) or puts it beside it (desktop).
 * - Dot count adapts to the device; the loop sleeps at rest and stops while the hero is off screen.
 */

export type DustLayout = 'stacked' | 'stacked-shift';

export interface DustSettings {
  apex: number; // brightness of "apex", 0..1 (share of the text colour)
  main: number; // brightness of "main", 0..1
  size: number; // dot size in CSS px
}

interface Dot {
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number; // base coverage 0..1
  main: boolean;
}

interface Ripple {
  x: number;
  y: number;
  t0: number;
}

const PAPER = [236, 240, 241];
const APEX = [70, 200, 217];
const WEIGHT = 700;
const LEVELS = 12; // brightness buckets for batched drawing

export class DustWordmark {
  private ctx: CanvasRenderingContext2D;
  private dots: Dot[] = [];
  private w = 0;
  private h = 0;
  private dpr = 1;
  private gap = 3;
  private running = false;
  private raf = 0;
  private visible = true;
  private pointer = { x: -9999, y: -9999, active: false };
  private ripples: Ripple[] = [];
  private rest = 0;
  private family: string;
  private radius = 110;

  constructor(
    private host: HTMLElement,
    private canvas: HTMLCanvasElement,
    private layoutKind: DustLayout,
    private settings: DustSettings,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.family = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'sans-serif';
    this.bind();
  }

  set(settings: Partial<DustSettings>) {
    Object.assign(this.settings, settings);
    this.draw(performance.now());
  }

  /** Bottom of the first headline line (stacked layout), in host coordinates. */
  private firstTitleLineBottom() {
    const line = this.host.querySelector('[data-dust-title] > span');
    if (!line) return null;
    const range = document.createRange();
    range.selectNodeContents(line);
    return range.getBoundingClientRect().bottom - this.host.getBoundingClientRect().top;
  }

  /** Top of the text block (stacked layout), in host coordinates. */
  private textTop() {
    const el = this.host.querySelector('[data-dust-top]');
    if (!el) return null;
    return el.getBoundingClientRect().top - this.host.getBoundingClientRect().top;
  }

  layout() {
    const r = this.host.getBoundingClientRect();
    if (!r.width) return;
    this.w = r.width;
    this.h = r.height;
    const lite = document.documentElement.classList.contains('lite');
    // Desktop layout (text beside the wordmark) from 1100px; below it text and wordmark are stacked.
    const desktop = this.w >= 1100;
    this.dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.radius = desktop ? 130 : 90;


    // --- measure the wordmark at a reference size
    const probe = document.createElement('canvas').getContext('2d')!;
    const REF = 100;
    probe.font = `${WEIGHT} ${REF}px ${this.family}`;
    const m1 = probe.measureText('apex');
    const m2 = probe.measureText('main');
    const top1 = m1.actualBoundingBoxAscent; // x-height of "apex" (no ascenders)
    const bot1 = m1.actualBoundingBoxDescent; // descender of "p"
    // Lines nested closely so "apex / main" reads as one name: the top of "main" sits just under the "p".
    const lineStep = top1 + bot1 + REF * 0.05; // baseline to baseline
    const shift = this.layoutKind === 'stacked-shift' ? probe.measureText('a').width : 0; // exactly one letter
    const left = Math.max(m1.actualBoundingBoxLeft, m2.actualBoundingBoxLeft - shift, 0);
    const wRef = left + Math.max(m1.actualBoundingBoxRight, shift + m2.actualBoundingBoxRight);
    const hRef = top1 + lineStep + m2.actualBoundingBoxDescent;

    // --- size and position: both words always fully on screen and below the header
    const plate = document.querySelector('#site-header .plate')?.getBoundingClientRect();
    // the header is fixed: keep the wordmark below it as seen with the page scrolled to the top
    const hostDocTop = this.host.getBoundingClientRect().top + window.scrollY;
    const topLimit = Math.max(plate ? plate.bottom - hostDocTop + 14 : 80, 64);
    const margin = desktop ? Math.max(24, this.w * 0.03) : this.w >= 768 ? 32 : 16;
    let scale: number;
    let ox: number;
    let oy: number;
    if (desktop) {
      // As big as both words allow, right-aligned, hanging from just below the header.
      // "apex" runs above the text block (which sits low in the hero), so only "main" meets the headline.
      // The width is the limit on usual screens (the name is ~2.3× wider than tall); on very wide
      // but short screens the height is.
      const xStart = this.w * 0.17;
      const availH = this.h - margin - topLimit;
      scale = Math.min((this.w - margin - xStart) / wRef, availH / hRef);
      ox = this.w - margin - wRef * scale;
      // Centre the composition: equal space above "apex" (below the header) and below "main".
      // The text block is moved by the same amount in CSS (--hero-shift in Stage.astro).
      const plateBottom = topLimit - 14;
      const shiftDown = Math.max(0, (this.h - plateBottom - hRef * scale) / 2 - 14);
      oy = topLimit + shiftDown;
    } else {
      // Stacked (phones, tablets): the wordmark spans the full container width ("apex" ≈ 80%, "main"
      // from the second letter to the right edge). It hangs from the header; where the screen is short
      // it may run under the eyebrow and the first headline line, but never lower than that line
      // (the subtitle and buttons stay clear) — if needed it gets slightly smaller instead.
      const gapBelow = 16;
      const textTop = this.textTop() ?? this.h * 0.55;
      const firstLine = this.firstTitleLineBottom() ?? textTop;
      const fitW = (this.w - margin * 2) / wRef;
      scale = Math.min(fitW, (firstLine - topLimit) / hRef);
      const hBox = hRef * scale;
      const freeH = textTop - gapBelow - topLimit;
      ox = margin;
      oy = hBox <= freeH ? topLimit + (freeH - hBox) / 2 : topLimit;
    }
    ox += left * scale;
    oy += top1 * scale;

    // --- render the text offscreen (red = apex, blue = main)
    const off = document.createElement('canvas');
    off.width = Math.ceil(this.w);
    off.height = Math.ceil(this.h);
    const c = off.getContext('2d', { willReadFrequently: true })!;
    c.font = `${WEIGHT} ${REF * scale}px ${this.family}`;
    c.textBaseline = 'alphabetic';
    c.fillStyle = '#ff0000';
    c.fillText('apex', ox, oy);
    c.fillStyle = '#0000ff';
    c.fillText('main', ox + shift * scale, oy + lineStep * scale);
    // glyph boxes in host coordinates (used for layout checks)
    const box = (m: TextMetrics, x: number, y: number) => [x - m.actualBoundingBoxLeft * scale, y - m.actualBoundingBoxAscent * scale, x + m.actualBoundingBoxRight * scale, y + m.actualBoundingBoxDescent * scale].map(Math.round).join(',');
    this.canvas.dataset.apexBox = box(m1, ox, oy);
    this.canvas.dataset.mainBox = box(m2, ox + shift * scale, oy + lineStep * scale);
    const data = c.getImageData(0, 0, off.width, off.height).data;

    // --- grid density adapted to the device
    const ink = (() => {
      let n = 0;
      for (let i = 3; i < data.length; i += 4 * 9) if (data[i] > 60) n++;
      return n * 9;
    })();
    const maxDots = lite ? 6000 : desktop ? 26000 : 11000;
    this.gap = Math.max(desktop ? 3 : 2.2, Math.sqrt(ink / maxDots));

    const g = this.gap;
    const jitter = g * 0.48; // breaks the grid: dust, not pixels
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
    const dots: Dot[] = [];
    for (let y = g / 2; y < off.height; y += g) {
      for (let x = g / 2; x < off.width; x += g) {
        const i = (Math.floor(y) * off.width + Math.floor(x)) * 4;
        const cov = data[i + 3] / 255;
        if (cov < 0.12) continue; // anti-aliasing fringe and stray pixels: no dot
        const px = x + rnd() * jitter;
        const py = y + rnd() * jitter;
        dots.push({ hx: px, hy: py, x: px, y: py, vx: 0, vy: 0, a: Math.min(1, cov), main: data[i + 2] > data[i] });
      }
    }
    this.dots = dots;
    this.draw(performance.now());
  }

  private wake() {
    this.rest = 0;
    if (this.running || !this.visible) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    if (!this.running) return;
    const { x: mx, y: my, active } = this.pointer;
    const R = this.radius;
    const R2 = R * R;
    let energy = 0;
    for (const d of this.dots) {
      d.vx += (d.hx - d.x) * 0.05;
      d.vy += (d.hy - d.y) * 0.05;
      if (active) {
        const dx = d.x - mx;
        const dy = d.y - my;
        const q = dx * dx + dy * dy;
        if (q < R2 && q > 0.01) {
          const dist = Math.sqrt(q);
          const f = (1 - dist / R) * 1.6;
          d.vx += (dx / dist) * f;
          d.vy += (dy / dist) * f;
        }
      }
      d.vx *= 0.84;
      d.vy *= 0.84;
      d.x += d.vx;
      d.y += d.vy;
      energy += Math.abs(d.vx) + Math.abs(d.vy);
    }
    this.ripples = this.ripples.filter((r) => now - r.t0 < 2800);
    this.draw(now);
    const calm = !active && !this.ripples.length && energy / Math.max(1, this.dots.length) < 0.004;
    this.rest = calm ? this.rest + 1 : 0;
    if (this.rest > 30) {
      this.running = false;
      for (const d of this.dots) ((d.x = d.hx), (d.y = d.hy), (d.vx = 0), (d.vy = 0));
      this.draw(now);
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private draw(now: number) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    const s = this.settings.size;
    const half = s / 2;
    const { x: mx, y: my, active } = this.pointer;
    const R = this.radius;
    const band = 40;
    const buckets: number[][] = Array.from({ length: LEVELS * 2 }, () => []);

    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i];
      let x = d.x;
      let y = d.y;
      let boost = 0;
      if (active) {
        const dist = Math.hypot(d.x - mx, d.y - my);
        if (dist < R) boost += (1 - dist / R) ** 2 * 0.55;
      }
      for (const r of this.ripples) {
        const age = now - r.t0;
        const dx = d.hx - r.x;
        const dy = d.hy - r.y;
        const dist = Math.hypot(dx, dy) || 1;
        const k = (dist - age * 0.45) / band;
        if (k > 3 || k < -3) continue;
        const env = Math.exp(-k * k) * Math.exp(-age / 1300);
        const amp = 5 * env * Math.cos(k * 1.5);
        x += (dx / dist) * amp;
        y += (dy / dist) * amp;
        boost += env * 1.1; // the ring lights the dust up as it passes
      }
      const base = d.main ? this.settings.main : this.settings.apex;
      const alpha = Math.min(0.85, d.a * base + boost * d.a);
      if (alpha < 0.01) continue;
      const lvl = Math.min(LEVELS - 1, Math.round(alpha * (LEVELS - 1) / 0.85));
      const bucket = buckets[(d.main ? LEVELS : 0) + lvl];
      bucket.push(x - half, y - half);
    }
    for (let b = 0; b < buckets.length; b++) {
      const list = buckets[b];
      if (!list.length) continue;
      const main = b >= LEVELS;
      const lvl = b % LEVELS;
      const a = Math.max(0.01, (lvl * 0.85) / (LEVELS - 1));
      const [r, g, bl] = main ? APEX : PAPER;
      ctx.fillStyle = `rgba(${r},${g},${bl},${a.toFixed(3)})`;
      for (let i = 0; i < list.length; i += 2) ctx.fillRect(list[i], list[i + 1], s, s);
    }
  }

  private bind() {
    const local = (cx: number, cy: number) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: cx - r.left, y: cy - r.top };
    };
    const setPointer = (cx: number, cy: number) => {
      const p = local(cx, cy);
      this.pointer = { ...p, active: p.x > -this.radius && p.y > -this.radius && p.x < this.w + this.radius && p.y < this.h + this.radius };
      if (this.pointer.active) this.wake();
    };
    const ripple = (cx: number, cy: number) => {
      const p = local(cx, cy);
      if (p.x < 0 || p.y < 0 || p.x > this.w || p.y > this.h) return;
      this.ripples.push({ ...p, t0: performance.now() });
      if (this.ripples.length > 4) this.ripples.shift();
      this.wake();
    };
    window.addEventListener('pointermove', (e) => e.pointerType === 'mouse' && this.visible && setPointer(e.clientX, e.clientY), { passive: true });
    document.documentElement.addEventListener('pointerleave', () => (this.pointer.active = false));
    // Clicks anywhere on the hero (except links/buttons) drop a stone.
    this.host.addEventListener('pointerdown', (e) => {
      if ((e.target as Element).closest('a, button, input, label')) return;
      ripple(e.clientX, e.clientY);
    });
    this.host.addEventListener('touchstart', (e) => e.touches[0] && setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    this.host.addEventListener('touchmove', (e) => e.touches[0] && setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    this.host.addEventListener('touchend', () => (this.pointer.active = false), { passive: true });

    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (!this.visible) {
        this.running = false;
        cancelAnimationFrame(this.raf);
      }
    }).observe(this.host);

    let t = 0;
    let last = '';
    new ResizeObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(() => {
        const r = this.host.getBoundingClientRect();
        const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
        if (key === last) return;
        last = key;
        this.layout();
      }, 120);
    }).observe(this.host);
  }
}

/**
 * Start the dust wordmark inside `host` once the display font is ready.
 * Returns null without motion (no JS / reduced motion): the static text in the markup stays.
 */
export async function startDust(host: HTMLElement, settings: DustSettings, layout: DustLayout = 'stacked-shift') {
  const root = document.documentElement;
  if (!root.classList.contains('motion')) return null;
  const canvas = host.querySelector<HTMLCanvasElement>('canvas[data-dust-canvas]');
  if (!canvas || !('getContext' in canvas)) return null;
  try {
    await document.fonts.load(`${WEIGHT} 100px Display`);
  } catch {
    /* use whatever font is available */
  }
  const dw = new DustWordmark(host, canvas, layout, { ...settings });
  dw.layout();
  root.classList.add('dust-ready');
  return dw;
}

/**
 * "Dust" wordmark behind the hero: lowercase "apex / main" made of small, dense dots.
 *
 * - The text is drawn with the site display font on an offscreen canvas; every grid point takes the
 *   anti-aliased coverage as its brightness, and a small jitter breaks the grid, so curves stay smooth
 *   and the mark reads as dust rather than pixels.
 * - At rest it is dim (brightness setting = share of the text colour). Near the cursor / finger dots get
 *   brighter and drift apart; a click or tap sends a circular ripple that lights dots up as it passes.
 * - No dots under the "keep clear" elements (subtitle, buttons); a soft fade around them.
 * - Dot count adapts to the device; the loop sleeps at rest and stops while the hero is off screen.
 */

export type DustLayout = 'stacked' | 'stacked-shift';

export interface DustSettings {
  brightness: number; // 0..1, share of the text colour
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
  cap: number; // max brightness (lower under the headline to keep its contrast)
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

  /** Where the wordmark goes and which areas stay clear, in canvas (host) coordinates. */
  private frame() {
    const host = this.host.getBoundingClientRect();
    const rel = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - host.left, y: r.top - host.top, w: r.width, h: r.height };
    };
    const title = rel(this.host.querySelector('[data-dust-title]'));
    const clear = Array.from(this.host.querySelectorAll('[data-dust-clear]')).map(rel).filter(Boolean) as {
      x: number;
      y: number;
      w: number;
      h: number;
    }[];
    return { title, clear };
  }

  layout() {
    const r = this.host.getBoundingClientRect();
    if (!r.width) return;
    this.w = r.width;
    this.h = r.height;
    const lite = document.documentElement.classList.contains('lite');
    const desktop = this.w >= 1024;
    this.dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.radius = desktop ? 130 : 90;

    const { title, clear } = this.frame();

    // --- measure the wordmark at a reference size
    const probe = document.createElement('canvas').getContext('2d')!;
    const REF = 100;
    probe.font = `${WEIGHT} ${REF}px ${this.family}`;
    const m1 = probe.measureText('apex');
    const m2 = probe.measureText('main');
    const top1 = m1.actualBoundingBoxAscent; // tallest part of "apex" (x-height)
    const bot1 = m1.actualBoundingBoxDescent; // descender of "p"
    const top2 = m2.actualBoundingBoxAscent; // dot of "i"
    const lineStep = top1 + bot1 * 0.55 + top2 * 0.92; // baseline-to-baseline, lines nested tightly
    const shift = this.layoutKind === 'stacked-shift' ? probe.measureText('a').width : 0; // exactly one letter
    const wRef = Math.max(m1.width, shift + m2.width);
    const hRef = top1 + lineStep + m2.actualBoundingBoxDescent;

    // --- size and position
    let scale: number;
    let ox: number;
    let oy: number;
    if (desktop) {
      // big, shifted right, may run past the right edge
      scale = (this.h * 0.8) / hRef;
      ox = this.w * 0.42;
      oy = (this.h - hRef * scale) / 2 + top1 * scale;
    } else {
      // behind and above the headline; as wide as the screen
      scale = (this.w * 1.02) / wRef;
      const hBox = hRef * scale;
      const bottom = title ? title.y + title.h * 0.92 : this.h * 0.5;
      ox = this.w * 0.03;
      oy = Math.max(56, bottom - hBox) + top1 * scale;
    }

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
    const data = c.getImageData(0, 0, off.width, off.height).data;

    // --- grid density adapted to the device
    const ink = (() => {
      let n = 0;
      for (let i = 3; i < data.length; i += 4 * 9) if (data[i] > 60) n++;
      return n * 9;
    })();
    const maxDots = lite ? 6000 : desktop ? 26000 : 11000;
    this.gap = Math.max(desktop ? 3 : 2.2, Math.sqrt(ink / maxDots));

    // --- keep-clear zones with a soft fade
    const fade = 28;
    const pad = 14;
    const clearAt = (x: number, y: number) => {
      let k = 1;
      for (const z of clear) {
        const dx = Math.max(z.x - pad - x, 0, x - (z.x + z.w + pad));
        const dy = Math.max(z.y - pad - y, 0, y - (z.y + z.h + pad));
        const d = Math.hypot(dx, dy);
        if (d === 0) return 0;
        if (d < fade) k = Math.min(k, d / fade);
      }
      return k;
    };

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
        const keep = clearAt(x, y);
        if (keep <= 0) continue;
        const px = x + rnd() * jitter;
        const py = y + rnd() * jitter;
        const underTitle = title && px > title.x - 8 && px < title.x + title.w + 8 && py > title.y - 8 && py < title.y + title.h + 8;
        dots.push({ hx: px, hy: py, x: px, y: py, vx: 0, vy: 0, a: Math.min(1, cov) * keep, main: data[i + 2] > data[i], cap: underTitle ? 0.35 : 0.85 });
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
    this.ripples = this.ripples.filter((r) => now - r.t0 < 1900);
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
    const base = this.settings.brightness;
    const s = this.settings.size;
    const half = s / 2;
    const { x: mx, y: my, active } = this.pointer;
    const R = this.radius;
    const band = 34;
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
        const k = (dist - age * 0.5) / band;
        if (k > 3 || k < -3) continue;
        const env = Math.exp(-k * k) * Math.exp(-age / 800);
        const amp = 5 * env * Math.cos(k * 1.5);
        x += (dx / dist) * amp;
        y += (dy / dist) * amp;
        boost += env * 0.5;
      }
      const alpha = Math.min(d.cap, d.a * base + boost * d.a);
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

/** Start every dust wordmark on the page once the display font is ready. */
export async function initDust(settings: DustSettings) {
  const root = document.documentElement;
  if (!root.classList.contains('motion')) return []; // no JS / reduced motion: static text stays
  const hosts = Array.from(document.querySelectorAll<HTMLElement>('[data-dust]'));
  try {
    await document.fonts.load(`${WEIGHT} 100px Display`);
  } catch {
    /* use whatever font is available */
  }
  root.classList.add('dust-ready');
  return hosts.map((host) => {
    const canvas = host.querySelector<HTMLCanvasElement>('canvas[data-dust-canvas]')!;
    const dw = new DustWordmark(host, canvas, (host.dataset.dust as DustLayout) || 'stacked', { ...settings });
    dw.layout();
    return dw;
  });
}

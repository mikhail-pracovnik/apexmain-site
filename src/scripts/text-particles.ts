/**
 * Particle wordmark (canvas 2D): "APEX" + "MAIN" drawn as dots on a square grid.
 * The text is rendered with the site's display font on an offscreen canvas and sampled on a regular grid.
 * Cursor / finger pushes dots aside; a click or tap sends a circular ripple, like a stone dropped in water.
 * The canvas height follows the wordmark proportions, so there is no empty space around it.
 */

export type WordmarkLayout = 'stacked' | 'stacked-shift' | 'inline';

export interface WordmarkOptions {
  layout: WordmarkLayout;
  maxDpr?: number;
}

interface Dot {
  hx: number; // home
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  apex: boolean; // part of MAIN (turquoise)
}

interface Ripple {
  x: number;
  y: number;
  t0: number;
}

const PAPER = '#BAC3CA'; // muted, not pure white
const APEX = '#43B9C8';
const FONT_WEIGHT = 800;
const REF = 200; // reference font size for measuring

export class ParticleWordmark {
  private ctx: CanvasRenderingContext2D;
  private dots: Dot[] = [];
  private w = 0;
  private h = 0;
  private dpr = 1;
  private gap = 5;
  private size = 3;
  private radius = 60;
  private running = false;
  private raf = 0;
  private visible = true;
  private pointer = { x: 0, y: 0, active: false };
  private ripples: Ripple[] = [];
  private rest = 0;
  private family: string;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: WordmarkOptions,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.family = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'sans-serif';
    this.bind();
  }

  /** Measure the wordmark at the reference size: line boxes and overall proportions. */
  private measure(c: CanvasRenderingContext2D) {
    c.font = `${FONT_WEIGHT} ${REF}px ${this.family}`;
    const tracking = REF * 0.02;
    const width = (s: string) => c.measureText(s).width + tracking * (s.length - 1);
    const ascent = c.measureText('APEXMAIN').actualBoundingBoxAscent || REF * 0.72; // cap height
    const lineGap = REF * 0.16;
    const { layout } = this.opts;
    if (layout === 'inline') {
      const wApex = width('APEX');
      const w = wApex + tracking + width('MAIN');
      return { w, h: ascent, lines: [{ text: 'APEX', x: 0, y: ascent, apex: false }, { text: 'MAIN', x: wApex + tracking, y: ascent, apex: true }], tracking };
    }
    const shift = layout === 'stacked-shift' ? c.measureText('A').width + tracking : 0; // exactly one letter
    const w = Math.max(width('APEX'), shift + width('MAIN'));
    return {
      w,
      h: ascent * 2 + lineGap,
      lines: [
        { text: 'APEX', x: 0, y: ascent, apex: false },
        { text: 'MAIN', x: shift, y: ascent * 2 + lineGap, apex: true },
      ],
      tracking,
    };
  }

  /** Lay out for the current canvas width; sets the canvas height from the wordmark proportions. */
  layout() {
    const cssW = this.canvas.parentElement!.getBoundingClientRect().width;
    if (!cssW) return;
    const probe = document.createElement('canvas').getContext('2d')!;
    const m = this.measure(probe);
    const pad = Math.round(cssW * 0.02);
    const scale = (cssW - pad * 2) / m.w;
    const cssH = Math.ceil(m.h * scale + pad * 2);
    this.w = cssW;
    this.h = cssH;
    this.canvas.style.height = `${cssH}px`;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr ?? 2);
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // grid step: ~ 1/26 of a letter's width keeps letters legible at every size
    this.gap = Math.max(3, Math.min(8, Math.round((m.w * scale) / (this.opts.layout === 'inline' ? 150 : 95))));
    this.size = Math.max(1.6, this.gap * 0.58);
    this.radius = this.gap * 11;

    // draw the text: red channel = APEX, blue channel = MAIN
    const off = document.createElement('canvas');
    off.width = Math.ceil(cssW);
    off.height = cssH;
    const c = off.getContext('2d', { willReadFrequently: true })!;
    c.font = `${FONT_WEIGHT} ${REF * scale}px ${this.family}`;
    c.textBaseline = 'alphabetic';
    for (const line of m.lines) {
      c.fillStyle = line.apex ? '#0000ff' : '#ff0000';
      let x = pad + line.x * scale;
      for (const ch of line.text) {
        c.fillText(ch, x, pad + line.y * scale);
        x += c.measureText(ch).width + m.tracking * scale;
      }
    }
    const data = c.getImageData(0, 0, off.width, off.height).data;
    const prev = this.dots;
    const dots: Dot[] = [];
    const g = this.gap;
    for (let y = g / 2; y < off.height; y += g) {
      for (let x = g / 2; x < off.width; x += g) {
        const i = (Math.floor(y) * off.width + Math.floor(x)) * 4;
        if (data[i + 3] < 110) continue;
        const old = prev[dots.length];
        dots.push({ hx: x, hy: y, x: old ? old.x : x, y: old ? old.y : y, vx: 0, vy: 0, apex: data[i + 2] > data[i] });
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
      d.vx += (d.hx - d.x) * 0.06;
      d.vy += (d.hy - d.y) * 0.06;
      if (active) {
        const dx = d.x - mx;
        const dy = d.y - my;
        const q = dx * dx + dy * dy;
        if (q < R2 && q > 0.01) {
          const dist = Math.sqrt(q);
          const f = (1 - dist / R) * 3.2;
          d.vx += (dx / dist) * f;
          d.vy += (dy / dist) * f;
        }
      }
      d.vx *= 0.8;
      d.vy *= 0.8;
      d.x += d.vx;
      d.y += d.vy;
      energy += Math.abs(d.vx) + Math.abs(d.vy);
    }
    this.ripples = this.ripples.filter((r) => now - r.t0 < 1700);
    this.draw(now);
    this.rest = !active && !this.ripples.length && energy / Math.max(1, this.dots.length) < 0.01 ? this.rest + 1 : 0;
    if (this.rest > 30) {
      this.running = false;
      for (const d of this.dots) ((d.x = d.hx), (d.y = d.hy), (d.vx = 0), (d.vy = 0));
      this.draw(now);
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  /** Ripple displacement: a ring travelling outward, fading with age. */
  private waveOffset(x: number, y: number, now: number) {
    let ox = 0;
    let oy = 0;
    const band = this.gap * 3.2;
    for (const r of this.ripples) {
      const age = now - r.t0;
      const radius = age * 0.55;
      const dx = x - r.x;
      const dy = y - r.y;
      const dist = Math.hypot(dx, dy) || 1;
      const k = (dist - radius) / band;
      if (k > 3 || k < -3) continue;
      const amp = this.gap * 2.4 * Math.exp(-k * k) * Math.exp(-age / 700) * Math.cos(k * 1.6);
      ox += (dx / dist) * amp;
      oy += (dy / dist) * amp;
    }
    return [ox, oy];
  }

  private draw(now: number) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    const s = this.size;
    const half = s / 2;
    const waves = this.ripples.length > 0;
    for (const pass of [false, true]) {
      ctx.fillStyle = pass ? APEX : PAPER;
      for (const d of this.dots) {
        if (d.apex !== pass) continue;
        let x = d.x;
        let y = d.y;
        if (waves) {
          const [ox, oy] = this.waveOffset(d.hx, d.hy, now);
          x += ox;
          y += oy;
        }
        ctx.fillRect(x - half, y - half, s, s);
      }
    }
  }

  private local(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  private bind() {
    const setPointer = (cx: number, cy: number) => {
      const p = this.local(cx, cy);
      const R = this.radius;
      this.pointer = { ...p, active: p.x > -R && p.x < this.w + R && p.y > -R && p.y < this.h + R };
      if (this.pointer.active) this.wake();
    };
    const ripple = (cx: number, cy: number) => {
      const p = this.local(cx, cy);
      if (p.x < 0 || p.y < 0 || p.x > this.w || p.y > this.h) return;
      this.ripples.push({ ...p, t0: performance.now() });
      if (this.ripples.length > 4) this.ripples.shift();
      this.wake();
    };
    window.addEventListener('pointermove', (e) => e.pointerType === 'mouse' && this.visible && setPointer(e.clientX, e.clientY), { passive: true });
    document.documentElement.addEventListener('pointerleave', () => (this.pointer.active = false));
    this.canvas.addEventListener('pointerdown', (e) => ripple(e.clientX, e.clientY));
    this.canvas.addEventListener('touchstart', (e) => e.touches[0] && setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    this.canvas.addEventListener('touchmove', (e) => e.touches[0] && setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    this.canvas.addEventListener('touchend', () => (this.pointer.active = false), { passive: true });

    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (!this.visible) {
        this.running = false;
        cancelAnimationFrame(this.raf);
      }
    }).observe(this.canvas);

    let t = 0;
    let lastW = 0;
    new ResizeObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(() => {
        const w = Math.round(this.canvas.parentElement!.getBoundingClientRect().width);
        if (w === lastW) return;
        lastW = w;
        this.layout();
      }, 100);
    }).observe(this.canvas.parentElement!);
  }
}

/** Initialise every wordmark canvas on the page once the display font is ready. */
export async function initWordmarks() {
  const root = document.documentElement;
  if (!root.classList.contains('motion')) return; // reduced motion / no JS: static text is shown
  const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas[data-wordmark]'));
  if (!canvases.length) return;
  try {
    await document.fonts.load(`${FONT_WEIGHT} 100px Display`);
  } catch {
    /* fall back to whatever font is available */
  }
  root.classList.add('wordmark-ready');
  for (const c of canvases) {
    const wm = new ParticleWordmark(c, { layout: (c.dataset.wordmark as WordmarkLayout) || 'stacked' });
    wm.layout();
  }
}

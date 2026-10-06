/**
 * Particle mark for the hero (canvas 2D).
 * Targets are computed from the brand polygons themselves (point-in-polygon on a grid aligned
 * to the mark, plus points along every edge), so the shape is exact at any canvas size.
 * Each particle springs to its target and is pushed away by the cursor or a finger.
 * The loop sleeps when everything is at rest.
 */
import brand from '../data/brand-mark.json';

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  teal: boolean;
}

export interface ParticlesOptions {
  /** Approximate number of particles. */
  count: number;
  maxDpr: number;
}

type Pt = readonly [number, number];
const PAPER = '#ECF0F1';
const APEX = '#46C8D9';

function inside(x: number, y: number, poly: readonly Pt[]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function area(poly: readonly Pt[]) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  return Math.abs(a / 2);
}

/** Particle targets in mark units for a given grid step. */
function markPoints(step: number) {
  const shapes = brand.shapes.map((s) => ({ poly: s.points as unknown as Pt[], teal: s.tone === 'apex' }));
  const [, , vw, vh] = brand.viewBox;
  const pts: { x: number; y: number; teal: boolean }[] = [];
  // interior grid
  for (let y = step / 2; y < vh; y += step) {
    for (let x = step / 2; x < vw; x += step) {
      const s = shapes.find((sh) => inside(x, y, sh.poly));
      if (s) pts.push({ x, y, teal: s.teal });
    }
  }
  // edges, so the outline is crisp and exact
  const edgeStep = step * 0.85;
  for (const s of shapes) {
    for (let i = 0; i < s.poly.length; i++) {
      const [x1, y1] = s.poly[i];
      const [x2, y2] = s.poly[(i + 1) % s.poly.length];
      const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / edgeStep));
      for (let k = 0; k < n; k++) pts.push({ x: x1 + ((x2 - x1) * k) / n, y: y1 + ((y2 - y1) * k) / n, teal: s.teal });
    }
  }
  return pts;
}

export class ParticleMark {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private w = 0;
  private h = 0;
  private dpr = 1;
  private size = 1.6;
  private raf = 0;
  private running = false;
  private assembled = false;
  private visible = true;
  private pointer = { x: 0, y: 0, active: false };
  private restFrames = 0;
  private radius = 90;
  private stepUnits: number;
  private targets: ReturnType<typeof markPoints>;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: ParticlesOptions,
  ) {
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    // Grid step in mark units from the requested count: same pattern at every size.
    const total = brand.shapes.reduce((sum, s) => sum + area(s.points as unknown as Pt[]), 0);
    this.stepUnits = Math.sqrt(total / opts.count);
    this.targets = markPoints(this.stepUnits);
    this.resize();
    this.bind();
  }

  /** Fit the mark into the canvas and map the targets to pixels. */
  private layout() {
    const [, , vw, vh] = brand.viewBox;
    const pad = Math.min(this.w, this.h) * 0.06;
    const scale = Math.min((this.w - pad * 2) / vw, (this.h - pad * 2) / vh);
    const ox = (this.w - vw * scale) / 2;
    const oy = (this.h - vh * scale) / 2;
    this.size = Math.max(1.1, Math.min(2.6, this.stepUnits * scale * 0.55));
    this.radius = Math.max(56, Math.min(this.w, this.h) * 0.22);

    const prev = this.particles;
    this.particles = this.targets.map((p, i) => {
      const old = prev[i];
      return {
        tx: ox + p.x * scale,
        ty: oy + p.y * scale,
        // keep current positions on resize; scatter on the first layout
        x: old ? old.x : Math.random() * this.w,
        y: old ? old.y : Math.random() * this.h,
        vx: 0,
        vy: 0,
        teal: p.teal,
      };
    });
    if (this.assembled && !this.running) for (const p of this.particles) ((p.x = p.tx), (p.y = p.ty));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.layout();
    this.draw();
  }

  /** Fly the particles into the mark. */
  assemble() {
    if (this.assembled) return;
    this.assembled = true;
    this.wake();
  }

  private wake() {
    this.restFrames = 0;
    if (this.running || !this.visible) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = () => {
    if (!this.running) return;
    const { x: mx, y: my, active } = this.pointer;
    const R = this.radius;
    const R2 = R * R;
    let energy = 0;
    for (const p of this.particles) {
      p.vx += (p.tx - p.x) * 0.045;
      p.vy += (p.ty - p.y) * 0.045;
      if (active) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / R) * 6.5;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }
      p.vx *= 0.82;
      p.vy *= 0.82;
      p.x += p.vx;
      p.y += p.vy;
      energy += Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(p.tx - p.x) * 0.02;
    }
    this.draw();
    const avg = energy / Math.max(1, this.particles.length);
    this.restFrames = !active && avg < 0.02 ? this.restFrames + 1 : 0;
    if (this.restFrames > 45) {
      // Settle exactly on the targets and stop until the next interaction.
      for (const p of this.particles) ((p.x = p.tx), (p.y = p.ty), (p.vx = 0), (p.vy = 0));
      this.draw();
      this.running = false;
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private draw() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    if (!this.assembled) return;
    const s = this.size;
    const half = s / 2;
    ctx.fillStyle = PAPER;
    for (const p of this.particles) if (!p.teal) ctx.fillRect(p.x - half, p.y - half, s, s);
    ctx.fillStyle = APEX;
    for (const p of this.particles) if (p.teal) ctx.fillRect(p.x - half, p.y - half, s, s);
  }

  private setPointer(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    const R = this.radius;
    this.pointer.x = clientX - r.left;
    this.pointer.y = clientY - r.top;
    this.pointer.active = this.pointer.x > -R && this.pointer.x < this.w + R && this.pointer.y > -R && this.pointer.y < this.h + R;
    if (this.pointer.active && this.assembled) this.wake();
  }

  private bind() {
    window.addEventListener('pointermove', (e) => e.pointerType === 'mouse' && this.visible && this.setPointer(e.clientX, e.clientY), {
      passive: true,
    });
    document.documentElement.addEventListener('pointerleave', () => (this.pointer.active = false));
    const touch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) this.setPointer(t.clientX, t.clientY);
    };
    this.canvas.addEventListener('touchstart', touch, { passive: true });
    this.canvas.addEventListener('touchmove', touch, { passive: true });
    this.canvas.addEventListener('touchend', () => (this.pointer.active = false), { passive: true });
    this.canvas.addEventListener('pointerdown', (e) => this.setPointer(e.clientX, e.clientY));

    new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible && this.assembled) this.wake();
      else if (!this.visible) {
        this.running = false;
        cancelAnimationFrame(this.raf);
      }
    }).observe(this.canvas);

    // Recompute the layout whenever the canvas size changes (width or height).
    let timer = 0;
    let last = `${Math.round(this.w)}x${Math.round(this.h)}`;
    new ResizeObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        const r = this.canvas.getBoundingClientRect();
        const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
        if (key === last) return;
        last = key;
        this.resize();
      }, 120);
    }).observe(this.canvas);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.running = false;
        cancelAnimationFrame(this.raf);
      } else if (this.assembled) this.wake();
    });
  }
}

/**
 * Particle mark for the hero (canvas 2D).
 * Points are sampled from the brand polygons; each particle springs to its target
 * and is pushed away by the cursor or a finger. The loop sleeps when everything is at rest.
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
  /** Draw once at rest, no animation (reduced motion). */
  still: boolean;
  maxDpr: number;
}

const PAPER = '#ECF0F1';
const APEX = '#46C8D9';

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

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: ParticlesOptions,
  ) {
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.resize();
    this.bind();
  }

  /** Build target points from the polygons, fitted into the canvas. */
  private sample() {
    const [, , vw, vh] = brand.viewBox;
    const pad = Math.min(this.w, this.h) * (this.w < 640 ? 0.12 : 0.08);
    const scale = Math.min((this.w - pad * 2) / vw, (this.h - pad * 2) / vh);
    const ox = (this.w - vw * scale) / 2;
    const oy = (this.h - vh * scale) / 2;

    const off = document.createElement('canvas');
    off.width = Math.ceil(this.w);
    off.height = Math.ceil(this.h);
    const c = off.getContext('2d', { willReadFrequently: true })!;
    for (const s of brand.shapes) {
      c.beginPath();
      s.points.forEach(([x, y], i) => (i ? c.lineTo(ox + x * scale, oy + y * scale) : c.moveTo(ox + x * scale, oy + y * scale)));
      c.closePath();
      c.fillStyle = s.tone === 'apex' ? '#ff0000' : '#0000ff';
      c.fill();
    }
    const data = c.getImageData(0, 0, off.width, off.height).data;

    // Pick a grid step that gives roughly the requested count.
    const filled = (() => {
      let n = 0;
      for (let i = 3; i < data.length; i += 16) if (data[i] > 128) n++;
      return n * 4;
    })();
    const gap = Math.max(2.4, Math.sqrt(filled / this.opts.count));
    this.size = Math.max(1.2, Math.min(2.4, gap * 0.52));
    this.radius = Math.max(60, Math.min(this.w, this.h) * 0.2);

    const points: Particle[] = [];
    for (let y = gap / 2; y < off.height; y += gap) {
      // Offset every other row for a less mechanical texture.
      const shift = (Math.round(y / gap) % 2) * (gap / 2);
      for (let x = gap / 2 + shift; x < off.width; x += gap) {
        const i = (Math.floor(y) * off.width + Math.floor(x)) * 4;
        if (data[i + 3] < 128) continue;
        const prev = this.particles[points.length];
        points.push({
          tx: x,
          ty: y,
          x: prev ? prev.x : Math.random() * this.w,
          y: prev ? prev.y : this.h * (0.2 + Math.random() * 0.6) + (Math.random() - 0.5) * this.h,
          vx: 0,
          vy: 0,
          teal: data[i] > 128,
        });
      }
    }
    this.particles = points;
    // Still mode draws the mark at rest; otherwise particles stay hidden until assemble().
    if (this.opts.still) for (const p of points) ((p.x = p.tx), (p.y = p.ty));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.sample();
    if (this.opts.still) this.draw();
    else if (this.assembled) this.wake();
  }

  /** Fly particles into the mark. */
  assemble() {
    if (this.assembled) return;
    this.assembled = true;
    if (this.opts.still) return this.draw();
    this.wake();
  }

  private wake() {
    this.restFrames = 0;
    if (this.running || !this.visible || this.opts.still) return;
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
      // Settle exactly on targets and stop the loop until the next interaction.
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
    if (!this.assembled && !this.opts.still) return;
    const s = this.size;
    ctx.fillStyle = PAPER;
    for (const p of this.particles) if (!p.teal) ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    ctx.fillStyle = APEX;
    for (const p of this.particles) if (p.teal) ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }

  private setPointer(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.x = clientX - r.left;
    this.pointer.y = clientY - r.top;
    this.pointer.active = this.pointer.x > -this.radius && this.pointer.x < this.w + this.radius && this.pointer.y > -this.radius && this.pointer.y < this.h + this.radius;
    if (this.pointer.active && this.assembled) this.wake();
  }

  private bind() {
    if (this.opts.still) {
      let t = 0;
      new ResizeObserver(() => {
        clearTimeout(t);
        t = window.setTimeout(() => this.resize(), 120);
      }).observe(this.canvas);
      return;
    }
    window.addEventListener('pointermove', (e) => e.pointerType === 'mouse' && this.visible && this.setPointer(e.clientX, e.clientY), { passive: true });
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

    let timer = 0;
    let lastW = this.w;
    new ResizeObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        // Ignore height-only changes from the mobile address bar.
        const w = this.canvas.getBoundingClientRect().width;
        if (Math.abs(w - lastW) < 1 && this.particles.length) return;
        lastW = w;
        this.resize();
      }, 150);
    }).observe(this.canvas);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.running = false;
        cancelAnimationFrame(this.raf);
      } else if (this.assembled) this.wake();
    });
  }
}

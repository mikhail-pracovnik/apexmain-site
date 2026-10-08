/**
 * Dark section backgrounds (components/DarkBackdrop.astro): the two spots that reveal the grid.
 * Paths from the owner's prototype (dark-sections.html, variant C), in % of the section:
 *   spot 1: x = 30 + 22·sin(0.17 s), y = 42 + 20·sin(0.23 s + 1); follows the mouse while it is over the section;
 *   spot 2: x = 72 + 16·sin(0.13 s + 2), y = 66 + 18·cos(0.19 s).
 * Only transforms are written: the spot moves by (dx, dy), the grid inside it by (−dx, −dy).
 * A section much taller than the screen (the services page) is "tall": the y path runs over the visible part of
 * the section (a band one screen high) instead of the whole section, and the spots are sized by that band.
 * The loop runs only while a section is on screen and the tab is visible. Reduced motion: the spots stay at
 * their start; light version (html.lite): no spots (faded out in CSS), no loop — also when lite is switched on
 * while the page is open (scripts/perf-watch.ts fires 'perf:lite').
 */
const EASE = 0.06; // pointer follow per 60 Hz frame, as in the prototype

interface Spot {
  el: HTMLElement;
  grid: HTMLElement;
  bx: number;
  by: number;
}
interface Backdrop {
  root: HTMLElement;
  section: HTMLElement;
  phase: number;
  spots: Spot[];
  w: number;
  h: number;
  tall: boolean;
  /** tall: top of the visible band in the section and its height, px */
  bandTop: number;
  band: number;
  on: boolean;
  cx: number;
  cy: number;
  px: number | null;
  py: number | null;
}

export function initDarkBackdrops() {
  const html = document.documentElement;
  if (html.classList.contains('lite')) return;
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-dark-bg]')).filter((n) => !n.dataset.ready);
  if (!nodes.length) return;
  const motion = html.classList.contains('motion');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const items: Backdrop[] = nodes.map((root) => {
    root.dataset.ready = '1';
    const spots = Array.from(root.querySelectorAll<HTMLElement>('[data-spot]')).map((el) => ({
      el,
      grid: el.firstElementChild as HTMLElement,
      bx: parseFloat(el.style.getPropertyValue('--bx')),
      by: parseFloat(el.style.getPropertyValue('--by')),
    }));
    const phase = Number(root.dataset.phase) || 0;
    const b: Backdrop = { root, section: root.parentElement!, phase, spots, w: 0, h: 0, tall: false, bandTop: 0, band: 0, on: false, cx: 0, cy: 0, px: null, py: null };
    [b.cx, b.cy] = path1(phase);
    return b;
  });

  function path1(s: number) {
    return [30 + 22 * Math.sin(s * 0.17), 42 + 20 * Math.sin(s * 0.23 + 1)];
  }
  function path2(s: number) {
    return [72 + 16 * Math.sin(s * 0.13 + 2), 66 + 18 * Math.cos(s * 0.19)];
  }
  function place(spot: Spot, x: number, y: number, b: Backdrop) {
    const dx = ((x - spot.bx) / 100) * b.w;
    // tall: the spot box starts at the section top, its centre goes to the band (y % of the band)
    const dy = b.tall ? b.bandTop + (y / 100) * b.band - 0.4 * b.band : ((y - spot.by) / 100) * b.h;
    spot.el.style.transform = `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0)`;
    spot.grid.style.transform = `translate3d(${(-dx).toFixed(1)}px,${(-dy).toFixed(1)}px,0)`;
  }
  function measureBand(b: Backdrop) {
    if (!b.tall) return;
    b.band = window.innerHeight;
    b.bandTop = Math.min(Math.max(-b.root.getBoundingClientRect().top, 0), b.h - b.band);
  }
  function draw(b: Backdrop, s: number, k: number) {
    const [ax, ay] = path1(s + b.phase);
    b.cx += ((b.px ?? ax) - b.cx) * k;
    b.cy += ((b.py ?? ay) - b.cy) * k;
    place(b.spots[0], b.cx, b.cy, b);
    const [nx, ny] = path2(s + b.phase);
    place(b.spots[1], nx, ny, b);
  }

  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const b = items.find((i) => i.root === e.target);
      if (!b) continue;
      b.w = e.contentRect.width;
      b.h = e.contentRect.height;
      b.tall = b.h > window.innerHeight * 1.6;
      b.root.classList.toggle('db-tall', b.tall);
      b.root.style.setProperty('--band', `${window.innerHeight}px`);
      b.root.style.setProperty('--sec', `${b.h}px`);
      measureBand(b);
      if (!motion) draw(b, 0, 1);
    }
  });
  items.forEach((b) => ro.observe(b.root));
  if (!motion) return;

  // time runs only while something is on screen: a section comes back where it stopped
  let clock = 0;
  let last = 0;
  let raf = 0;
  const frame = (now: number) => {
    const dt = last ? Math.min(now - last, 100) : 16.7;
    last = now;
    clock += dt / 1000;
    const k = 1 - Math.pow(1 - EASE, dt / 16.7);
    let any = false;
    if (!html.classList.contains('lite')) {
      // read all positions first, then write: no forced style recalculation between sections
      for (const b of items) if (b.on) measureBand(b);
      for (const b of items) if (b.on) (draw(b, clock, k), (any = true));
    }
    raf = any && !document.hidden ? requestAnimationFrame(frame) : 0;
    if (!raf) last = 0;
  };
  const kick = () => {
    if (!raf && !document.hidden && items.some((b) => b.on)) raf = requestAnimationFrame(frame);
  };

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const b = items.find((i) => i.section === e.target);
      if (!b) continue;
      b.on = e.isIntersecting;
      b.root.classList.toggle('db-on', b.on);
    }
    kick();
  });
  items.forEach((b) => io.observe(b.section));
  document.addEventListener('visibilitychange', kick);

  if (fine)
    items.forEach((b) => {
      b.section.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = b.section.getBoundingClientRect();
        b.px = ((e.clientX - r.left) / r.width) * 100;
        // tall: y in % of the visible band (the screen), otherwise of the section
        b.py = b.tall ? ((e.clientY - Math.max(r.top, 0)) / b.band) * 100 : ((e.clientY - r.top) / r.height) * 100;
      });
      b.section.addEventListener('pointerleave', () => {
        b.px = b.py = null;
      });
    });
}

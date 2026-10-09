/**
 * Dark section backgrounds (components/DarkBackdrop.astro): what the CSS animations of the spots cannot do.
 * Paths from the owner's prototype (dark-sections.html, variant C), in % of the section:
 *   spot 1: x = 30 + 22·sin(0.17 s), y = 42 + 20·sin(0.23 s + 1); follows the mouse while it is over the section;
 *   spot 2: x = 72 + 16·sin(0.13 s + 2), y = 66 + 18·cos(0.19 s).
 * Normally the spots walk these paths with CSS animations on the compositor and this script does nothing per
 * frame. It runs a frame loop only
 *  - while the mouse is over a section (and until the spot is back on its path): the first spot is pulled towards
 *    the pointer by an offset on its box (the grid inside gets the opposite offset, so it stays put);
 *  - for a section much taller than the screen (the services page on a phone): "tall", the CSS paths are off and
 *    the spots walk the same paths over the visible part of the section (a band one screen high) from here.
 * Only transforms are written. The loop runs only while a section is on screen and the tab is visible. Reduced
 * motion: the spots stay at their start; light version (html.lite): no spots (faded out in CSS), no loop — also
 * when lite is switched on while the page is open (scripts/perf-watch.ts adds the class).
 */
const EASE = 0.06; // pointer follow per 60 Hz frame, as in the prototype

interface Spot {
  el: HTMLElement;
  grid: HTMLElement;
  /** the wrappers the CSS paths move (x, y) */
  sx: HTMLElement;
  sy: HTMLElement;
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
  /** tall: centre of spot 1 in % */
  cx: number;
  cy: number;
  /** pointer in % of the section (tall: y in % of the band), null when it is not over the section */
  px: number | null;
  py: number | null;
  /** not tall: pointer offset of spot 1 from its path, px */
  ox: number;
  oy: number;
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
      grid: el.querySelector<HTMLElement>('.db-lit')!,
      sx: el.querySelector<HTMLElement>('.db-sx')!,
      sy: el.querySelector<HTMLElement>('.db-sy')!,
      bx: parseFloat(el.style.getPropertyValue('--bx')),
      by: parseFloat(el.style.getPropertyValue('--by')),
    }));
    const phase = Number(root.dataset.phase) || 0;
    const b: Backdrop = { root, section: root.parentElement!, phase, spots, w: 0, h: 0, tall: false, bandTop: 0, band: 0, on: false, cx: 0, cy: 0, px: null, py: null, ox: 0, oy: 0 };
    [b.cx, b.cy] = path1(phase);
    return b;
  });

  function path1(s: number) {
    return [30 + 22 * Math.sin(s * 0.17), 42 + 20 * Math.sin(s * 0.23 + 1)];
  }
  function path2(s: number) {
    return [72 + 16 * Math.sin(s * 0.13 + 2), 66 + 18 * Math.cos(s * 0.19)];
  }
  const move = (spot: Spot, dx: number, dy: number) => {
    const t = dx || dy ? `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0)` : '';
    spot.el.style.transform = t;
    spot.grid.style.transform = t && `translate3d(${(-dx).toFixed(1)}px,${(-dy).toFixed(1)}px,0)`;
  };
  /* ---------- tall sections: the whole path from here ---------- */
  function place(spot: Spot, x: number, y: number, b: Backdrop) {
    const dx = ((x - spot.bx) / 100) * b.w;
    // the spot box starts at the section top, its centre goes to the band (y % of the band)
    const dy = b.bandTop + (y / 100) * b.band - 0.4 * b.band;
    move(spot, dx, dy);
  }
  function measureBand(b: Backdrop) {
    b.band = window.innerHeight;
    b.bandTop = Math.min(Math.max(-b.root.getBoundingClientRect().top, 0), b.h - b.band);
  }
  function drawTall(b: Backdrop, s: number, k: number) {
    const [ax, ay] = path1(s + b.phase);
    b.cx += ((b.px ?? ax) - b.cx) * k;
    b.cy += ((b.py ?? ay) - b.cy) * k;
    place(b.spots[0], b.cx, b.cy, b);
    const [nx, ny] = path2(s + b.phase);
    place(b.spots[1], nx, ny, b);
  }
  /* ---------- other sections: only the pointer offset of spot 1 ---------- */
  const shift = (el: HTMLElement) => new DOMMatrixReadOnly(getComputedStyle(el).transform);
  /** returns true while the offset still moves */
  function drawPointer(b: Backdrop, k: number) {
    const spot = b.spots[0];
    let tx = 0;
    let ty = 0;
    if (b.px !== null && b.py !== null) {
      // where the CSS path has the spot's centre now, px in the section
      const x = (spot.bx / 100) * b.w + shift(spot.sx).m41;
      const y = (spot.by / 100) * b.h + shift(spot.sy).m42;
      tx = (b.px / 100) * b.w - x;
      ty = (b.py / 100) * b.h - y;
    }
    b.ox += (tx - b.ox) * k;
    b.oy += (ty - b.oy) * k;
    const settled = b.px === null && Math.abs(b.ox) < 0.5 && Math.abs(b.oy) < 0.5;
    if (settled) b.ox = b.oy = 0;
    move(spot, b.ox, b.oy);
    return !settled;
  }

  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const b = items.find((i) => i.root === e.target);
      if (!b) continue;
      b.w = e.contentRect.width;
      b.h = e.contentRect.height;
      const tall = b.h > window.innerHeight * 1.6;
      if (b.tall && !tall) b.spots.forEach((s) => move(s, 0, 0));
      b.tall = tall;
      b.root.classList.toggle('db-tall', b.tall);
      b.root.style.setProperty('--band', `${window.innerHeight}px`);
      b.root.style.setProperty('--sec', `${b.h}px`);
      if (b.tall) {
        measureBand(b);
        drawTall(b, 0, 1);
      }
    }
    kick();
  });
  items.forEach((b) => ro.observe(b.root));

  // time of the tall paths runs only while something is on screen: a section comes back where it stopped
  let clock = 0;
  let last = 0;
  let raf = 0;
  const busy = (b: Backdrop) => b.on && (b.tall || b.px !== null || b.ox !== 0 || b.oy !== 0);
  const frame = (now: number) => {
    const dt = last ? Math.min(now - last, 100) : 16.7;
    last = now;
    clock += dt / 1000;
    const k = 1 - Math.pow(1 - EASE, dt / 16.7);
    let any = false;
    if (!html.classList.contains('lite')) {
      // read first, then write: no forced style recalculation between sections
      for (const b of items) if (b.on && b.tall) measureBand(b);
      for (const b of items) {
        if (!busy(b)) continue;
        if (b.tall) (drawTall(b, clock, k), (any = true));
        else if (drawPointer(b, k)) any = true;
      }
    }
    raf = any && !document.hidden ? requestAnimationFrame(frame) : 0;
    if (!raf) last = 0;
  };
  function kick() {
    if (!motion || raf || document.hidden || html.classList.contains('lite')) return;
    if (items.some(busy)) raf = requestAnimationFrame(frame);
  }

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

  if (fine && motion)
    items.forEach((b) => {
      b.section.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = b.section.getBoundingClientRect();
        b.px = ((e.clientX - r.left) / r.width) * 100;
        // tall: y in % of the visible band (the screen), otherwise of the section
        b.py = b.tall ? ((e.clientY - Math.max(r.top, 0)) / b.band) * 100 : ((e.clientY - r.top) / r.height) * 100;
        kick();
      });
      b.section.addEventListener('pointerleave', () => {
        b.px = b.py = null;
      });
    });
}

/**
 * Horizontal rails (components/Rail.astro). Native scrolling with scroll-snap does the work on touch;
 * this adds what a mouse and a keyboard need:
 *  - position indicator under the rail and two arrows (dimmed at the ends);
 *  - drag with the mouse: under 8 px it is a click, beyond that a drag; after a drag the click on the
 *    card is cancelled; on release the rail coasts (inertia) and settles on the nearest card;
 *  - touch and pen: a card opens only on a short tap; a press that moved 8 px or more (a swipe of the rail
 *    or of the page) does not click it;
 *  - ←/→ move by one card; a card that gets keyboard focus is brought fully into view.
 * Reduced motion: no inertia, no smooth scrolling.
 * The vertical mouse wheel is left alone (native: it scrolls the page, not the rail).
 */
const DRAG_THRESHOLD = 8; // px
const FRICTION = 0.92; // per 16 ms frame
const MIN_SPEED = 0.05; // px/ms

const motionOk = () => document.documentElement.classList.contains('motion');

function initRail(rail: HTMLElement) {
  const vp = rail.querySelector<HTMLElement>('[data-rail-viewport]')!;
  const thumb = rail.querySelector<HTMLElement>('[data-rail-thumb]');
  const prev = rail.querySelector<HTMLButtonElement>('[data-rail-prev]');
  const next = rail.querySelector<HTMLButtonElement>('[data-rail-next]');
  const items = () => Array.from(vp.querySelectorAll<HTMLElement>('.rail-item'));
  /** Scroll position at which an item sits at the snap line (the container's left edge). */
  const offset = () => parseFloat(getComputedStyle(vp).scrollPaddingLeft) || 0;
  const snapPos = (el: HTMLElement) => el.offsetLeft - offset();
  const max = () => vp.scrollWidth - vp.clientWidth;

  /* ---------- Indicator and arrows ---------- */
  let ticking = false;
  const update = () => {
    ticking = false;
    const m = max();
    const share = vp.scrollWidth > 0 ? vp.clientWidth / vp.scrollWidth : 1;
    const p = m > 0 ? vp.scrollLeft / m : 0;
    if (thumb) {
      thumb.style.width = `${(share * 100).toFixed(2)}%`;
      thumb.style.transform = `translateX(${((p * (1 - share)) / share) * 100}%)`;
    }
    prev?.setAttribute('aria-disabled', String(vp.scrollLeft <= 2));
    next?.setAttribute('aria-disabled', String(vp.scrollLeft >= m - 2));
  };
  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  vp.addEventListener('scroll', schedule, { passive: true });
  // the track changes width when cards are hidden (the filter on the examples page)
  const ro = new ResizeObserver(schedule);
  ro.observe(vp);
  ro.observe(vp.firstElementChild as Element);
  update();

  /** Move by one card. */
  const step = (dir: 1 | -1) => {
    const list = items();
    const x = vp.scrollLeft;
    const target =
      dir > 0
        ? list.find((el) => snapPos(el) > x + 4)
        : [...list].reverse().find((el) => snapPos(el) < x - 4);
    const left = target ? snapPos(target) : dir > 0 ? max() : 0;
    vp.scrollTo({ left, behavior: motionOk() ? 'smooth' : 'auto' });
  };
  prev?.addEventListener('click', () => step(-1));
  next?.addEventListener('click', () => step(1));

  /* ---------- Keyboard ---------- */
  vp.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if ((e.target as HTMLElement).closest('input, textarea, select')) return;
    e.preventDefault();
    step(e.key === 'ArrowRight' ? 1 : -1);
  });
  // A card reached with Tab comes fully into view (the browser alone may leave it half hidden).
  vp.addEventListener('focusin', (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>('.rail-item');
    if (!item || dragging) return;
    const from = vp.scrollLeft + offset();
    const to = vp.scrollLeft + vp.clientWidth - offset();
    if (item.offsetLeft >= from - 1 && item.offsetLeft + item.offsetWidth <= to + 1) return;
    vp.scrollTo({ left: Math.min(snapPos(item), max()), behavior: motionOk() ? 'smooth' : 'auto' });
  });

  /* ---------- Mouse drag ---------- */
  let down = false;
  let dragging = false;
  let startX = 0;
  let startScroll = 0;
  let lastX = 0;
  let lastT = 0;
  let speed = 0; // px/ms, positive = content moves left
  let raf = 0;

  const settle = () => {
    // nearest card to the snap line, then let snapping take over again
    const x = vp.scrollLeft;
    const list = items();
    let best = 0;
    let bestD = Infinity;
    for (const el of list) {
      const d = Math.abs(Math.min(snapPos(el), max()) - x);
      if (d < bestD) {
        bestD = d;
        best = Math.min(snapPos(el), max());
      }
    }
    const smooth = motionOk();
    vp.scrollTo({ left: best, behavior: smooth ? 'smooth' : 'auto' });
    window.setTimeout(() => vp.classList.remove('is-dragging'), smooth ? 450 : 0);
  };

  const coast = () => {
    cancelAnimationFrame(raf);
    if (!motionOk() || Math.abs(speed) < MIN_SPEED) return settle();
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const before = vp.scrollLeft;
      vp.scrollLeft = before + speed * dt;
      speed *= Math.pow(FRICTION, dt / 16);
      const stuck = Math.abs(vp.scrollLeft - before) < 0.5 && Math.abs(speed) > MIN_SPEED;
      if (Math.abs(speed) < MIN_SPEED || stuck) return settle();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  };

  vp.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    cancelAnimationFrame(raf);
    down = true;
    dragging = false;
    startX = lastX = e.clientX;
    startScroll = vp.scrollLeft;
    lastT = e.timeStamp;
    speed = 0;
  });
  vp.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      dragging = true;
      vp.classList.add('is-dragging');
      try {
        vp.setPointerCapture(e.pointerId);
      } catch {
        /* no capture: the drag still works while the pointer stays over the rail */
      }
    }
    vp.scrollLeft = startScroll - dx;
    const dt = e.timeStamp - lastT;
    if (dt > 0) speed = 0.8 * ((lastX - e.clientX) / dt) + 0.2 * speed;
    lastX = e.clientX;
    lastT = e.timeStamp;
  });
  const release = (e: PointerEvent) => {
    if (!down) return;
    down = false;
    if (!dragging) return;
    try {
      if (vp.hasPointerCapture(e.pointerId)) vp.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    // a drag is not a click: swallow the click that follows the release
    const swallow = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    window.addEventListener('click', swallow, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    if (e.timeStamp - lastT > 80) speed = 0; // held still before letting go
    dragging = false;
    coast();
  };
  vp.addEventListener('pointerup', release);
  vp.addEventListener('pointercancel', release);
  vp.addEventListener('dragstart', (e) => e.preventDefault());

  /* ---------- Tap vs swipe (touch, pen) ---------- */
  // Browsers usually drop the click after a pan, but not always (a short flick, a slow diagonal swipe):
  // a press that travelled DRAG_THRESHOLD or more, or was taken over by scrolling, is not a tap.
  let tapX = 0;
  let tapY = 0;
  let moved = false;
  vp.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    tapX = e.clientX;
    tapY = e.clientY;
    moved = false;
  }, { passive: true });
  vp.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || moved) return;
    if (Math.hypot(e.clientX - tapX, e.clientY - tapY) >= DRAG_THRESHOLD) moved = true;
  }, { passive: true });
  vp.addEventListener('pointercancel', (e) => {
    if (e.pointerType !== 'mouse') moved = true;
  });
  vp.addEventListener('click', (e) => {
    // keyboard activation (detail 0) is always a click
    if (!moved || e.detail === 0) return;
    moved = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);
}

export function initRails() {
  document.querySelectorAll<HTMLElement>('[data-rail]').forEach((rail) => {
    if (rail.dataset.railReady) return;
    rail.dataset.railReady = '1';
    initRail(rail);
  });
}

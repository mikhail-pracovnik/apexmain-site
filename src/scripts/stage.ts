/**
 * Intro + hero controller.
 *
 * The intro has three steps. The smallest input moves one step: one wheel notch, the first ~8px of a
 * swipe, or an arrow / PageDown / Space press. Input that arrives while a step is playing (or before
 * the animation library has loaded) is remembered — one step ahead. While the intro is active the page
 * does not scroll; after step 3 normal scrolling resumes.
 * Going back from the hero needs a deliberate push upward at the very top of the page.
 * Opening the page scrolled or with a #hash skips the intro.
 */
import { ParticleMark } from './particles';

type Gsap = typeof import('gsap').gsap;

const STEP_DUR = [0, 0.55, 0.5, 0.7]; // seconds to reach step n
const GESTURE_GAP = 120; // ms of wheel silence that starts a new gesture
const SWIPE_START = 8; // px of finger travel that triggers a step
const BACK_WHEEL = 360; // accumulated upward wheel delta (px) needed to bring the intro back
const BACK_SWIPE = 160; // downward finger travel (px) at the top needed to bring the intro back

export function initStage() {
  const root = document.documentElement;
  const stage = document.querySelector<HTMLElement>('[data-stage]');
  if (!stage) return;
  const motion = root.classList.contains('motion');
  const lite = root.classList.contains('lite');
  const canvas = stage.querySelector<HTMLCanvasElement>('[data-particles]');

  // Reduced motion / no canvas: the CSS shows the solid mark; nothing else to do.
  if (!motion || !canvas || !('getContext' in canvas)) {
    root.classList.add('intro-done');
    return;
  }

  const wide = window.matchMedia('(min-width: 64rem)').matches;
  const particles = new ParticleMark(canvas, { count: lite ? 650 : wide ? 2200 : 1200, maxDpr: lite ? 1.5 : 2 });

  const intro = stage.querySelector<HTMLElement>('[data-intro]')!;
  const anchor = intro.querySelector<HTMLElement>('[data-intro-anchor]')!;
  const fly = intro.querySelector<HTMLElement>('[data-intro-fly]')!;
  const bg = intro.querySelector<HTMLElement>('[data-intro-bg]')!;
  const hint = intro.querySelector<HTMLElement>('[data-intro-hint]')!;
  const dots = Array.from(intro.querySelectorAll<HTMLElement>('[data-step-dot]'));
  const glow = intro.querySelector<SVGElement>('[data-intro-glow]')!;
  const ghost = intro.querySelector<SVGElement>('.intro-ghost')!;
  const outline = Array.from(intro.querySelectorAll<SVGPolygonElement>('.intro-mark polygon'));
  const paper = outline.filter((p) => p.dataset.tone === 'paper');
  const peak = outline.filter((p) => p.dataset.tone === 'apex');
  const headerMark = document.getElementById('header-mark');
  const heroIn = Array.from(stage.querySelectorAll<HTMLElement>('.hero-in'));

  const finishInstantly = () => {
    root.classList.add('intro-done');
    root.classList.remove('intro-flying');
    particles.assemble();
  };

  // Deep link or restored scroll position: no intro.
  if (window.scrollY > 4 || location.hash.length > 1) {
    finishInstantly();
    return;
  }

  let gsap: Gsap | null = null;
  let step = 0;
  let busy = false;
  let queued: 1 | -1 | null = null; // one remembered step

  /** Where the big mark must land: the small mark in the header. */
  const target = () => {
    const a = anchor.getBoundingClientRect();
    const b = headerMark?.getBoundingClientRect();
    if (!b || !b.width) return { x: 0, y: -a.top - a.height, s: 0.1 };
    return {
      x: b.left + b.width / 2 - (a.left + a.width / 2),
      y: b.top + b.height / 2 - (a.top + a.height / 2),
      s: b.width / a.width,
    };
  };

  const setDots = (n: number) => dots.forEach((d, i) => d.classList.toggle('is-on', i < n));

  /** Ask for one step forward (+1) or back (-1). Remembered if a step is playing. */
  function request(dir: 1 | -1) {
    if (busy || !gsap) {
      queued = dir;
      return;
    }
    run(dir);
  }

  function run(dir: 1 | -1) {
    const next = step + dir;
    if (next < 0 || next > 3) return;
    animateTo(next);
  }

  function animateTo(next: number) {
    const g = gsap!;
    const forward = next > step;
    const dur = STEP_DUR[Math.max(next, step)];
    busy = true;
    window.setTimeout(() => {
      busy = false;
      if (queued !== null) {
        const q = queued;
        queued = null;
        run(q);
      }
    }, dur * 900);

    if (forward && next === 1) {
      // step 1: the full outline
      g.to(paper.concat(peak), { strokeDashoffset: 0, duration: dur, stagger: 0.03, ease: 'power2.inOut' });
      g.to(ghost, { opacity: 0.12, duration: dur });
    } else if (forward && next === 2) {
      // step 2: fill, then the turquoise peak lights up
      g.to(paper, { fillOpacity: 1, duration: dur * 0.6, stagger: 0.03, ease: 'power2.out' });
      g.to(peak, { fillOpacity: 1, duration: dur * 0.5, delay: dur * 0.3, ease: 'power2.out' });
      g.to(ghost, { opacity: 0, duration: dur * 0.5 });
      g.timeline()
        .to(glow, { opacity: 0.7, duration: dur * 0.4, delay: dur * 0.3 })
        .to(glow, { opacity: 0.22, duration: dur * 0.5 });
    } else if (forward && next === 3) {
      // step 3: the mark flies into the header, the hero opens
      const tg = target();
      root.classList.add('intro-done', 'intro-flying'); // header fades in while the mark flies
      if (headerMark) g.set(headerMark, { opacity: 0 });
      g.to(hint, { autoAlpha: 0, duration: 0.2 });
      g.to(glow, { opacity: 0, duration: 0.25 });
      g.to(bg, { opacity: 0, duration: dur * 0.7, delay: dur * 0.2, ease: 'power1.inOut' });
      g.fromTo(heroIn, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.05, delay: dur * 0.4, ease: 'power3.out' });
      particles.assemble();
      g.to(fly, {
        x: tg.x,
        y: tg.y,
        scale: tg.s,
        duration: dur,
        ease: 'power3.inOut',
        onComplete: () => {
          // Hand over to the real header mark at full brightness.
          if (headerMark) g.set(headerMark, { opacity: 1 });
          g.set(fly, { autoAlpha: 0 });
          root.classList.remove('intro-flying');
          unlock();
        },
      });
    } else if (next === 2) {
      // back from the hero: the mark returns from the header
      lock();
      root.classList.add('intro-flying');
      root.classList.remove('intro-done');
      g.set(fly, { autoAlpha: 1 });
      if (headerMark) g.set(headerMark, { opacity: 0 });
      g.to(bg, { opacity: 1, duration: dur * 0.6 });
      g.to(hint, { autoAlpha: 1, duration: 0.25, delay: dur * 0.6 });
      g.to(heroIn, { autoAlpha: 0, duration: 0.25 });
      g.to(glow, { opacity: 0.22, duration: 0.25, delay: dur * 0.7 });
      g.to(fly, {
        x: 0,
        y: 0,
        scale: 1,
        duration: dur,
        ease: 'power3.inOut',
        onComplete: () => root.classList.remove('intro-flying'),
      });
    } else if (next === 1) {
      g.to(paper.concat(peak), { fillOpacity: 0, duration: dur * 0.6 });
      g.to(glow, { opacity: 0, duration: dur * 0.4 });
      g.to(ghost, { opacity: 0.12, duration: dur * 0.6 });
    } else {
      g.to(paper.concat(peak), { strokeDashoffset: 1, duration: dur, stagger: 0.02, ease: 'power2.inOut' });
      g.to(ghost, { opacity: 0.26, duration: dur });
    }
    step = next;
    setDots(step);
  }

  /** The intro owns the input while it is not finished (or while the mark is in flight). */
  const active = () => step < 3 || root.classList.contains('intro-flying');

  /* ---------- Wheel ---------- */
  let lastWheel = 0;
  let lastAbs = 0;
  let backAcc = 0;
  const onWheel = (e: WheelEvent) => {
    const now = performance.now();
    const abs = Math.abs(e.deltaY);
    const gap = now - lastWheel;
    // A discrete mouse-wheel notch, a pause, or a fresh push inside trackpad inertia = new gesture.
    const notch = e.deltaMode !== 0 || (abs >= 50 && Number.isInteger(e.deltaY) && gap > 25);
    const fresh = gap > GESTURE_GAP || notch || (abs > lastAbs * 1.8 && abs > 6);
    lastWheel = now;
    lastAbs = abs;

    if (active()) {
      e.preventDefault();
      if (abs > 0 && fresh) request(e.deltaY > 0 ? 1 : -1);
      return;
    }
    // Finished: only a deliberate upward push at the very top brings the intro back.
    if (window.scrollY > 0 || e.deltaY >= 0) {
      backAcc = 0;
      return;
    }
    if (gap > 400) backAcc = 0;
    backAcc += abs * (e.deltaMode === 1 ? 33 : 1);
    if (backAcc >= BACK_WHEEL) {
      e.preventDefault();
      backAcc = 0;
      request(-1);
    }
  };

  /* ---------- Touch ---------- */
  let touchY: number | null = null;
  let touchFired = false;
  let touchAtTop = false;
  const onTouchStart = (e: TouchEvent) => {
    touchY = e.touches[0]?.clientY ?? null;
    touchFired = false;
    touchAtTop = window.scrollY <= 0;
    // While the intro owns the input, take the touch: browsers (Chrome) otherwise hold back the first
    // ~15px of touchmove, which made small swipes do nothing.
    if (active() && e.cancelable) e.preventDefault();
  };
  const onTouchEnd = (e: TouchEvent) => {
    // Fallback for a very short flick that ended before any touchmove arrived.
    if (touchY !== null && !touchFired && active()) {
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
      if (Math.abs(dy) >= SWIPE_START) request(dy > 0 ? 1 : -1);
    }
    touchY = null;
  };
  const onTouchMove = (e: TouchEvent) => {
    const y = e.touches[0]?.clientY;
    if (touchY === null || y === undefined) return;
    const dy = touchY - y; // > 0: finger moves up = forward
    if (active()) {
      e.preventDefault();
      if (!touchFired && Math.abs(dy) >= SWIPE_START) {
        touchFired = true;
        request(dy > 0 ? 1 : -1);
      }
    } else if (touchAtTop && !touchFired && dy <= -BACK_SWIPE && window.scrollY <= 0) {
      touchFired = true;
      request(-1);
    }
  };

  /* ---------- Keys ---------- */
  const onKey = (e: KeyboardEvent) => {
    const fwd = ['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(e.key);
    const back = ['ArrowUp', 'PageUp'].includes(e.key);
    if (!fwd && !back) return;
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]')) return;
    if (active()) {
      e.preventDefault();
      request(fwd ? 1 : -1);
    }
  };

  function setFinalState() {
    step = 3;
    queued = null;
    busy = false;
    setDots(3);
    if (gsap) {
      gsap.killTweensOf([outline, ghost, glow, bg, hint, fly, heroIn, headerMark].flat().filter(Boolean) as Element[]);
      gsap.set(outline, { strokeDashoffset: 0, fillOpacity: 1 });
      gsap.set([bg, hint, glow], { opacity: 0 });
      gsap.set(fly, { autoAlpha: 0 });
      gsap.set(heroIn, { autoAlpha: 1, y: 0 });
      if (headerMark) gsap.set(headerMark, { opacity: 1 });
    } else if (headerMark) headerMark.style.opacity = '1';
    finishInstantly();
    unlock();
  }

  // Keyboard users tabbing into the page get the finished state right away.
  document.addEventListener('focusin', (e) => {
    if (step < 3 && !(e.target as Element).closest?.('[data-intro]')) setFinalState();
  });
  // Dragging the scrollbar (or any other scroll) during the intro also finishes it.
  window.addEventListener(
    'scroll',
    () => {
      if (step < 3 && window.scrollY > 4) setFinalState();
    },
    { passive: true },
  );

  // The page is locked (no native scrolling) while the intro owns the input.
  let locked = false;
  const blockTouch = (e: TouchEvent) => {
    if (active()) e.preventDefault();
  };
  function lock() {
    if (locked) return;
    locked = true;
    window.addEventListener('touchmove', blockTouch, { passive: false });
  }
  function unlock() {
    if (!locked) return;
    locked = false;
    window.removeEventListener('touchmove', blockTouch);
  }

  // Input listeners stay for the page lifetime: they also handle bringing the intro back at the top.
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('keydown', onKey);
  lock();

  import('gsap')
    .then((m) => {
      gsap = m.gsap;
      // Input that arrived before the library loaded is not lost.
      if (queued !== null) {
        const q = queued;
        queued = null;
        run(q);
      }
    })
    .catch((err) => {
      // Animation library unavailable: show the finished hero.
      console.error(err);
      setFinalState();
    });
}

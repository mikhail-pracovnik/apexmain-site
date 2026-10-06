/**
 * Intro + hero controller.
 *
 * The intro has three steps; one wheel notch, one swipe or one arrow/PageDown/Space press moves
 * one step. While the intro is active the page does not scroll; after step 3 normal scrolling
 * resumes. Scrolling up at the very top of the page (wheel / swipe / keys) walks the steps back.
 * Opening the page scrolled or with a #hash skips the intro.
 */
import { ParticleMark } from './particles';

type Gsap = typeof import('gsap').gsap;

const STEP_DUR = [0, 0.9, 0.8, 0.95]; // seconds to reach step n
const GESTURE_GAP = 140; // ms of wheel silence that separates two gestures
const MIN_INTERVAL = 650; // ms between steps within one continuous gesture (trackpad inertia)

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
  let busyUntil = 0; // input is ignored until the current step has (almost) played
  const busy = () => performance.now() < busyUntil;
  let lastWheel = 0;
  let lastStep = 0;
  let touchY: number | null = null;

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

  function animateTo(next: number) {
    if (!gsap || next === step || next < 0 || next > 3) return;
    const g = gsap;
    const forward = next > step;
    const dur = STEP_DUR[Math.max(next, step)];
    lastStep = performance.now();
    busyUntil = lastStep + dur * 850;

    if (forward && next === 1) {
      // step 1: the full outline
      g.to(paper.concat(peak), { strokeDashoffset: 0, duration: dur, stagger: 0.05, ease: 'power2.inOut' });
      g.to(ghost, { opacity: 0.12, duration: dur });
    } else if (forward && next === 2) {
      // step 2: fill, then the turquoise peak lights up
      g.to(paper, { fillOpacity: 1, duration: dur * 0.6, stagger: 0.04, ease: 'power2.out' });
      g.to(peak, { fillOpacity: 1, duration: dur * 0.5, delay: dur * 0.35, ease: 'power2.out' });
      g.to(ghost, { opacity: 0, duration: dur * 0.5 });
      g.timeline()
        .to(glow, { opacity: 0.7, duration: dur * 0.45, delay: dur * 0.35 })
        .to(glow, { opacity: 0.22, duration: dur * 0.5 });
    } else if (forward && next === 3) {
      // step 3: the mark flies into the header, the hero opens
      const tg = target();
      root.classList.add('intro-done', 'intro-flying'); // header fades in while the mark flies
      if (headerMark) g.set(headerMark, { opacity: 0 });
      g.to(hint, { autoAlpha: 0, duration: 0.25 });
      g.to(glow, { opacity: 0, duration: 0.3 });
      g.to(bg, { opacity: 0, duration: dur * 0.7, delay: dur * 0.2, ease: 'power1.inOut' });
      g.fromTo(heroIn, { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06, delay: dur * 0.45, ease: 'power3.out' });
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
      g.to(hint, { autoAlpha: 1, duration: 0.3, delay: dur * 0.6 });
      g.to(heroIn, { autoAlpha: 0, duration: 0.3 });
      g.to(glow, { opacity: 0.22, duration: 0.3, delay: dur * 0.7 });
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
      g.to(paper.concat(peak), { strokeDashoffset: 1, duration: dur, stagger: 0.03, ease: 'power2.inOut' });
      g.to(ghost, { opacity: 0.26, duration: dur });
    }
    step = next;
    setDots(step);
  }

  /** The intro owns the input while it is not finished (or while the mark is in flight). */
  const active = () => step < 3 || root.classList.contains('intro-flying');

  const onWheel = (e: WheelEvent) => {
    const now = performance.now();
    const newGesture = now - lastWheel > GESTURE_GAP;
    lastWheel = now;
    if (active()) e.preventDefault();
    else if (!(window.scrollY <= 0 && e.deltaY < 0)) return; // normal page scrolling
    if (busy() || Math.abs(e.deltaY) < 2) return;
    if (!newGesture && now - lastStep < MIN_INTERVAL) return;
    animateTo(step + (e.deltaY > 0 ? 1 : -1));
  };

  const onTouchStart = (e: TouchEvent) => {
    touchY = e.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (active()) e.preventDefault();
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchY === null) return;
    const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
    touchY = null;
    if (Math.abs(dy) < 24 || busy()) return;
    if (active()) animateTo(step + (dy > 0 ? 1 : -1));
    else if (window.scrollY <= 0 && dy < 0) animateTo(2);
  };

  const onKey = (e: KeyboardEvent) => {
    const fwd = ['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(e.key);
    const back = ['ArrowUp', 'PageUp'].includes(e.key);
    if (!fwd && !back) return;
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]')) return;
    if (active()) {
      e.preventDefault();
      if (!busy()) animateTo(step + (fwd ? 1 : -1));
    } else if (back && window.scrollY <= 0 && !busy()) {
      e.preventDefault();
      animateTo(2);
    }
  };

  function setFinalState() {
    step = 3;
    setDots(3);
    if (gsap) {
      gsap.killTweensOf([outline, ghost, glow, bg, hint, fly, heroIn, headerMark].flat().filter(Boolean) as Element[]);
      gsap.set(outline, { strokeDashoffset: 0, fillOpacity: 1 });
      gsap.set([bg, hint, glow], { opacity: 0 });
      gsap.set(fly, { autoAlpha: 0 });
      gsap.set(heroIn, { autoAlpha: 1, y: 0 });
      if (headerMark) gsap.set(headerMark, { opacity: 1 });
    } else if (headerMark) headerMark.style.opacity = '1';
    busyUntil = 0;
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

  let locked = false;
  function lock() {
    if (locked) return;
    locked = true;
    window.addEventListener('touchmove', onTouchMove, { passive: false });
  }
  function unlock() {
    if (!locked) return;
    locked = false;
    window.removeEventListener('touchmove', onTouchMove);
  }

  // Wheel / touch / key listeners stay for the page lifetime: they also walk the intro back at the top.
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('keydown', onKey);
  lock();

  import('gsap')
    .then((m) => {
      gsap = m.gsap;
    })
    .catch((err) => {
      // Animation library unavailable: show the finished hero.
      console.error(err);
      setFinalState();
    });
}

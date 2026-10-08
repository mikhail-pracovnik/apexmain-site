/**
 * Intro + hero controller.
 *
 * The head script (BaseLayout) has already decided what this load shows (classes on <html>):
 *   intro-on + intro-pick — the language choice; a tap fills the button, the buttons leave, then either
 *                           the reel plays here or (another language) the page of that language opens and
 *                           plays the reel from the same frame;
 *   intro-on              — the reel plays right away;
 *   neither               — no intro.
 * The reel is one GSAP timeline: outline → fill with the turquoise peak → the mark flies into the header.
 * It plays once per visit and never comes back. Only transform and opacity change while it plays
 * (plus the stroke drawing of the outline); the dust wordmark, fonts and GSAP are ready before it starts.
 * Timing and the mark position: config/intro.ts.
 */
import { startDust, type DustSettings } from './dust-wordmark';
import { intro as timing, introKeys } from '../config/intro';

type Gsap = typeof import('gsap').gsap;

/** Dust wordmark behind the hero: brightness of each word (share of the text colour) and dot size. */
const DUST: DustSettings = { apex: 0.2875, main: 0.345, size: 1 };
/** The chosen button stays filled this long before the buttons leave (s). */
const CHOSEN_HOLD = 0.12;
/** Longest wait for the page to get ready before the reel starts anyway (ms). */
const READY_TIMEOUT = 2500;

const store = (kind: 'local' | 'session', key: string, value?: string | null) => {
  try {
    const st = kind === 'local' ? window.localStorage : window.sessionStorage;
    if (value === undefined) return st.getItem(key);
    if (value === null) st.removeItem(key);
    else st.setItem(key, value);
  } catch {
    /* storage blocked: the intro still works, it just is not remembered */
  }
  return null;
};

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export function initStage() {
  const root = document.documentElement;
  const stage = document.querySelector<HTMLElement>('[data-stage]');
  if (!stage) return;
  const motion = root.classList.contains('motion');

  let dust: Promise<unknown> | null = null;
  const ensureDust = () => (dust ??= startDust(stage, DUST, 'stacked-shift'));

  const intro = stage.querySelector<HTMLElement>('[data-intro]')!;
  if (!root.classList.contains('intro-on') || !intro) {
    root.classList.add('intro-done');
    ensureDust();
    return;
  }

  const locale = root.lang;
  const anchor = intro.querySelector<HTMLElement>('[data-intro-anchor]')!;
  const fly = intro.querySelector<HTMLElement>('[data-intro-fly]')!;
  const bg = intro.querySelector<HTMLElement>('[data-intro-bg]')!;
  const langs = intro.querySelector<HTMLElement>('[data-intro-langs]')!;
  const links = Array.from(intro.querySelectorAll<HTMLAnchorElement>('[data-intro-lang]'));
  const glow = intro.querySelector<SVGElement>('[data-intro-glow]')!;
  const ghost = intro.querySelector<SVGElement>('.intro-ghost')!;
  const outline = Array.from(intro.querySelectorAll<SVGPolygonElement>('.intro-mark polygon'));
  const fill = Array.from(intro.querySelectorAll<SVGPolygonElement>('.intro-fill polygon'));
  const fillPaper = fill.filter((p) => p.dataset.tone === 'paper');
  const fillPeak = fill.filter((p) => p.dataset.tone === 'apex');
  const headerMark = document.getElementById('header-mark');
  const heroIn = Array.from(stage.querySelectorAll<HTMLElement>('.hero-in'));

  /* ---------- While the intro is on: no page scrolling, the rest of the page is inert ---------- */
  const active = () => !root.classList.contains('intro-done') || root.classList.contains('intro-flying');
  const stop = (e: Event) => {
    if (active() && e.cancelable) e.preventDefault();
  };
  const SCROLL_KEYS = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar'];
  const onKey = (e: KeyboardEvent) => {
    if (SCROLL_KEYS.includes(e.key)) stop(e);
  };
  const onScroll = () => {
    if (active() && window.scrollY > 0) window.scrollTo(0, 0);
  };
  // touchstart is left alone: a tap on a language button must stay a plain click.
  window.addEventListener('wheel', stop, { passive: false });
  window.addEventListener('touchmove', stop, { passive: false });
  window.addEventListener('keydown', onKey);
  window.addEventListener('scroll', onScroll, { passive: true });

  const main = document.getElementById('main');
  const inertTargets = [
    ...Array.from(document.body.children).filter((el) => !el.contains(intro) && el.tagName !== 'SCRIPT'),
    ...Array.from(main?.children ?? []).filter((el) => !el.contains(intro) && el.tagName !== 'SCRIPT'),
    ...Array.from(stage.children).filter((el) => el !== intro && el.tagName !== 'SCRIPT'),
  ] as HTMLElement[];
  const setInert = (on: boolean) => inertTargets.forEach((el) => (el.inert = on));

  const setPickA11y = (on: boolean) => {
    if (on) {
      intro.removeAttribute('aria-hidden');
      intro.setAttribute('role', 'dialog');
      intro.setAttribute('aria-modal', 'true');
    } else {
      intro.setAttribute('aria-hidden', 'true');
      intro.removeAttribute('role');
      intro.removeAttribute('aria-modal');
    }
  };

  let finished = false;
  function finish() {
    finished = true;
    root.classList.add('intro-done');
    root.classList.remove('intro-flying', 'intro-pick');
    setInert(false);
    setPickA11y(false);
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    window.dispatchEvent(new Event('intro:end'));
  }
  const markSeen = () => {
    store('session', introKeys.seen, '1');
  };

  /* ---------- Preparation: GSAP, the dust wordmark, fonts ---------- */
  const gsapReady: Promise<Gsap | null> = motion
    ? import('gsap').then((m) => m.gsap).catch((err) => (console.error(err), null))
    : Promise.resolve(null);
  ensureDust();
  const pageReady = () =>
    Promise.race([
      Promise.all([gsapReady, dust, document.fonts?.ready]).then(frame),
      new Promise<void>((r) => setTimeout(r, READY_TIMEOUT)),
    ]);

  /** Where the big mark must land: the small mark in the header (measured before the reel). */
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

  /* ---------- The reel ---------- */
  async function playReel() {
    const gsap = await gsapReady;
    await pageReady();
    if (!gsap) {
      // Animation library unavailable: the finished hero.
      if (headerMark) headerMark.style.opacity = '1';
      finish();
      return;
    }
    markSeen();
    const T = timing;
    const tg = target();
    if (headerMark) gsap.set(headerMark, { opacity: 0 });
    const tl = gsap.timeline();
    // 1 — the full outline
    // (stagger amounts are inside the phase: every phase lasts exactly its duration)
    tl.to(outline, { strokeDashoffset: 0, duration: T.outline * 0.8, stagger: { amount: T.outline * 0.2 }, ease: 'power2.inOut' }, 0);
    tl.to(ghost, { opacity: 0.12, duration: T.outline }, 0);
    // 2 — fill, then the turquoise peak lights up
    const f = T.outline;
    tl.to(fillPaper, { opacity: 1, duration: T.fill * 0.5, stagger: { amount: T.fill * 0.1 }, ease: 'power2.out' }, f);
    tl.to(fillPeak, { opacity: 1, duration: T.fill * 0.5, ease: 'power2.out' }, f + T.fill * 0.3);
    tl.to(ghost, { opacity: 0, duration: T.fill * 0.5 }, f);
    tl.to(glow, { opacity: 0.7, duration: T.fill * 0.4 }, f + T.fill * 0.3);
    tl.to(glow, { opacity: 0.22, duration: T.fill * 0.3 }, f + T.fill * 0.7);
    // 3 — the mark flies into the header, the hero opens (header fades in by CSS on .intro-done)
    const l = T.outline + T.fill;
    tl.call(() => root.classList.add('intro-done', 'intro-flying'), [], l);
    tl.to(glow, { opacity: 0, duration: T.fly * 0.5 }, l);
    tl.to(bg, { opacity: 0, duration: T.fly * 0.7, ease: 'power1.inOut' }, l + T.fly * 0.2);
    tl.fromTo(heroIn, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.05, ease: 'power3.out' }, l + T.fly * 0.4);
    tl.to(fly, { x: tg.x, y: tg.y, scale: tg.s, duration: T.fly, ease: 'power3.inOut' }, l);
    tl.call(
      () => {
        // Hand over to the real header mark at full brightness.
        if (headerMark) gsap.set(headerMark, { opacity: 1 });
        gsap.set(fly, { autoAlpha: 0 });
        finish();
      },
      [],
      l + T.fly,
    );
  }

  /* ---------- Language choice ---------- */
  let choosing = false;
  async function choose(link: HTMLAnchorElement) {
    if (choosing || finished) return;
    choosing = true;
    const lang = link.dataset.introLang!;
    const leave = lang !== locale;
    store('local', introKeys.lang, lang);
    const go = () => {
      store('session', introKeys.switchTo, lang);
      window.location.href = link.href;
    };

    // Reduced motion: no reel; the hero (or the page of the chosen language) right away.
    if (!motion) {
      markSeen();
      if (leave) go();
      else finish();
      return;
    }
    link.classList.add('is-chosen');
    const gsap = await gsapReady;
    if (!gsap) {
      if (leave) go();
      else finish();
      return;
    }
    gsap.to(langs, {
      autoAlpha: 0,
      y: 8,
      duration: timing.buttonsOut,
      delay: CHOSEN_HOLD,
      ease: 'power2.in',
      onComplete: () => {
        if (leave) return go();
        root.classList.remove('intro-pick');
        setPickA11y(false);
        playReel();
      },
    });
  }

  if (root.classList.contains('intro-pick')) {
    setPickA11y(true);
    setInert(true);
    links.forEach((a) =>
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        choose(a);
      }),
    );
    // The two other home pages are loaded into the cache while the choice is on screen.
    links
      .filter((a) => a.dataset.introLang !== locale)
      .forEach((a) => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = a.href;
        document.head.append(link);
        fetch(a.href, { credentials: 'same-origin', priority: 'low' } as RequestInit).catch(() => {});
      });
  } else {
    setInert(true);
    if (window.scrollY > 4) {
      finish();
    } else playReel();
  }
}

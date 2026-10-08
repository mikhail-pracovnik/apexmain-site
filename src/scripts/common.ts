/**
 * Behaviour shared by every page: menu, scroll progress, current-section label,
 * scroll reveal, card spotlight, lazy looping videos, back-to-top, messenger popover, phone dock,
 * the frame-rate check that may switch to the light version (perf-watch.ts).
 */
import { watchPerformance } from './perf-watch';

watchPerformance();
const root = document.documentElement;
const motionOk = () => root.classList.contains('motion');
/** The full-screen menu is open: the page background stays dark (see "Page background" below). */
let menuOpen = false;
let refreshPageBg = () => {};

/* ---------- Menu (native modal <dialog> at body level) ---------- */
const menu = document.getElementById('site-menu') as HTMLDialogElement | null;
const menuOpener = document.querySelector<HTMLButtonElement>('[data-menu-open]');
if (menu && menuOpener) {
  menuOpener.addEventListener('click', () => {
    menu.showModal();
    root.style.overflow = 'hidden'; // no page scroll behind the menu
    menuOpen = true;
    refreshPageBg();
    menu.querySelector<HTMLElement>('[data-menu-close]')?.focus();
  });
  menu.querySelector('[data-menu-close]')?.addEventListener('click', () => menu.close());
  menu.querySelectorAll('[data-menu-link]').forEach((a) => a.addEventListener('click', () => menu.close()));
  // Esc is handled natively by <dialog>; 'close' fires for every way of closing.
  menu.addEventListener('close', () => {
    root.style.overflow = '';
    menuOpen = false;
    refreshPageBg();
    menuOpener.focus();
  });
}

/* ---------- Scroll progress + back-to-top ---------- */
const progress = document.querySelector<HTMLElement>('[data-progress]');
const toTops = document.querySelectorAll<HTMLElement>('[data-to-top]');
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    const max = root.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    progress?.style.setProperty('--progress', p.toFixed(4));
    // header back-to-top appears after 50% of the page (the phone dock keeps its button visible)
    toTops.forEach((b) => b.classList.toggle('is-visible', p >= 0.5));
    ticking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
onScroll();
[...toTops, ...document.querySelectorAll<HTMLElement>('[data-dock-top]')].forEach((b) =>
  b.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: motionOk() ? 'smooth' : 'auto' });
    document.getElementById('main')?.focus({ preventScroll: true });
  }),
);

/* ---------- Current section label in the header ---------- */
const labelBox = document.querySelector<HTMLElement>('[data-section-label]');
const labelText = labelBox?.querySelector<HTMLElement>('[data-label-text]');
const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-label]'));
let currentLabel = labelText?.textContent ?? '';
function setLabel(next: string) {
  if (!labelBox || !labelText || next === currentLabel) return;
  currentLabel = next;
  if (!motionOk()) {
    labelText.textContent = next;
    return;
  }
  labelBox.classList.add('is-switching');
  window.setTimeout(() => {
    labelText.textContent = next;
    labelBox.classList.remove('is-switching');
  }, 220);
}
if (sections.length && 'IntersectionObserver' in window) {
  const visible = new Map<HTMLElement, boolean>();
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => visible.set(e.target as HTMLElement, e.isIntersecting));
      // The last section (in document order) that crosses the 35% line wins.
      const active = sections.filter((s) => visible.get(s)).pop();
      if (active?.dataset.label) setLabel(active.dataset.label);
    },
    { rootMargin: '-35% 0px -64% 0px' },
  );
  sections.forEach((s) => io.observe(s));
}

/* ---------- Page background follows the section at the bottom edge of the screen ----------
   The new Safari tints the strip under its floating toolbar with the page (html/body) background;
   dark #030306 over a light section reads as a grey haze. Every section paints its own background,
   so switching the page one is invisible everywhere except the browser's own areas. */
const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
const darkBg = themeMeta?.content ?? '#030306';
const bands = Array.from(document.querySelectorAll<HTMLElement>('main > :not(script), body > footer'));
// what shows above the page when it is pulled down past the top: the colour of the first section
if (bands[0]) root.style.setProperty('--top-bg', getComputedStyle(bands[0]).backgroundColor);
// While the intro is on, everything stays dark (#030306): the intro covers the screen, but the
// section at the bottom edge under it may be light. stage.ts fires 'intro:end' when it is over.
// The same while the (dark glass) menu covers the page.
let introOn = root.classList.contains('intro-on') && !root.classList.contains('intro-done');
if (bands.length && 'IntersectionObserver' in window) {
  const atBottom = new Map<HTMLElement, boolean>();
  let pageLight: boolean | null = null;
  const apply = () => {
    const bottom = introOn || menuOpen ? undefined : bands.filter((b) => atBottom.get(b)).pop();
    const light = !!bottom?.classList.contains('theme-light');
    if (light === pageLight) return;
    pageLight = light;
    const bg = light ? getComputedStyle(bottom!).backgroundColor : darkBg;
    root.style.setProperty('--page-bg', bg);
    root.classList.toggle('page-light', light);
    themeMeta?.setAttribute('content', bg);
  };
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => atBottom.set(e.target as HTMLElement, e.isIntersecting));
      apply();
    },
    // a thin strip along the bottom edge of the viewport
    { rootMargin: '-98% 0px 0px 0px' },
  );
  bands.forEach((b) => io.observe(b));
  refreshPageBg = apply;
  window.addEventListener('intro:end', () => {
    introOn = false;
    apply();
  });
}

/* ---------- Section under the header: html.top-light for the header glass ----------
   The plate is light glass with dark text while a light section is under it (global.css .glass-top). */
if (bands.length && 'IntersectionObserver' in window) {
  const atTop = new Map<HTMLElement, boolean>();
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => atTop.set(e.target as HTMLElement, e.isIntersecting));
      const under = bands.filter((b) => atTop.get(b)).pop();
      root.classList.toggle('top-light', !!under?.classList.contains('theme-light'));
    },
    // a thin strip at the height of the middle of the header plate
    { rootMargin: '-4.5% 0px -94.5% 0px' },
  );
  bands.forEach((b) => io.observe(b));
}

/* ---------- Scroll reveal ---------- */
const reveals = document.querySelectorAll<HTMLElement>('.reveal');
if (motionOk() && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
  );
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('is-in'));
}

/* ---------- Cursor spotlight on cards (fine pointers only) ---------- */
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.addEventListener(
    'pointermove',
    (e) => {
      const card = (e.target as Element | null)?.closest?.<HTMLElement>('.spot');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    },
    { passive: true },
  );
}

/* ---------- Lazy looping videos: only the most visible one plays ---------- */
const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video[data-lazy]'));
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
const canAutoplay = motionOk() && !saveData;
if (videos.length && canAutoplay && 'IntersectionObserver' in window) {
  const ratios = new Map<HTMLVideoElement, number>();
  const load = (v: HTMLVideoElement) => {
    if (v.dataset.loaded) return;
    v.querySelectorAll<HTMLSourceElement>('source[data-src]').forEach((s) => (s.src = s.dataset.src!));
    v.load();
    v.dataset.loaded = '1';
  };
  const pickPlaying = () => {
    let best: HTMLVideoElement | null = null;
    let bestRatio = 0.35; // must be at least a third visible to play
    ratios.forEach((r, v) => {
      if (v.dataset.play !== 'visible' && r > bestRatio) {
        best = v;
        bestRatio = r;
      }
    });
    videos.forEach((v) => {
      if (v.dataset.play === 'visible') {
        // small loops (home service tiles) play whenever they are on screen
        if ((ratios.get(v) ?? 0) > 0.5) {
          load(v);
          if (v.paused) v.play().catch(() => {});
        } else if (!v.paused) v.pause();
        return;
      }
      if (v === best) {
        load(v);
        if (v.paused) v.play().catch(() => {});
      } else if (!v.paused) v.pause();
    });
  };
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        ratios.set(v, e.isIntersecting ? e.intersectionRatio : 0);
        if (e.isIntersecting) load(v); // preload posters' videos that are close to view
      });
      pickPlaying();
    },
    { rootMargin: '80px 0px', threshold: [0, 0.2, 0.35, 0.5, 0.65, 0.8, 1] },
  );
  videos.forEach((v) => io.observe(v));
  document.addEventListener('visibilitychange', () => (document.hidden ? videos.forEach((v) => v.pause()) : pickPlaying()));
}

/* ---------- Messenger popover in the header ---------- */
const fab = document.querySelector<HTMLElement>('[data-fab]');
const fabBtn = fab?.querySelector<HTMLButtonElement>('[data-fab-toggle]');
function setFab(open: boolean) {
  if (!fab || !fabBtn) return;
  fab.classList.toggle('is-open', open);
  fabBtn.setAttribute('aria-expanded', String(open));
}
fabBtn?.addEventListener('click', () => setFab(!fab!.classList.contains('is-open')));
document.addEventListener('click', (e) => {
  if (fab && !fab.contains(e.target as Node)) setFab(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && fab?.classList.contains('is-open')) {
    setFab(false);
    fabBtn?.focus();
  }
});

/* ---------- "I want one like this" → fill the lead form and scroll to it ---------- */
document.addEventListener('click', (e) => {
  const trigger = (e.target as Element | null)?.closest?.<HTMLElement>('[data-want]');
  if (!trigger) return;
  const form = document.getElementById('lead');
  if (!form) return; // no form on this page: let the link navigate to the contact page
  e.preventDefault();
  window.dispatchEvent(
    new CustomEvent('lead:prefill', {
      detail: { niche: trigger.dataset.niche, example: trigger.dataset.example, service: trigger.dataset.service },
    }),
  );
  form.scrollIntoView({ behavior: motionOk() ? 'smooth' : 'auto', block: 'start' });
});

/* ---------- Deep links: land exactly on #section after fonts settle the layout ---------- */
if (location.hash.length > 1) {
  const jump = () => {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target && Math.abs(target.getBoundingClientRect().top) > 120) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  };
  (document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(jump));
}

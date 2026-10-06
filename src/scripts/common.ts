/**
 * Behaviour shared by every page: menu, scroll progress, current-section label,
 * scroll reveal, card spotlight, lazy looping videos, back-to-top and messenger button.
 */
const root = document.documentElement;
const motionOk = () => root.classList.contains('motion');

/* ---------- Menu (native <dialog>) ---------- */
const menu = document.getElementById('site-menu') as HTMLDialogElement | null;
document.querySelector('[data-menu-open]')?.addEventListener('click', () => menu?.showModal());
menu?.querySelector('[data-menu-close]')?.addEventListener('click', () => menu.close());
menu?.querySelectorAll('[data-menu-link]').forEach((a) => a.addEventListener('click', () => menu.close()));

/* ---------- Scroll progress + back-to-top ---------- */
const progress = document.querySelector<HTMLElement>('[data-progress]');
const toTop = document.querySelector<HTMLElement>('[data-to-top]');
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const max = root.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progress?.style.setProperty('--progress', p.toFixed(4));
    toTop?.classList.toggle('is-visible', p >= 0.5);
    ticking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
onScroll();
toTop?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: motionOk() ? 'smooth' : 'auto' });
  document.getElementById('main')?.focus({ preventScroll: true });
});

/* ---------- Current section label in the header pill ---------- */
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

/* ---------- Lazy looping videos: load and play only while on screen ---------- */
const videos = document.querySelectorAll<HTMLVideoElement>('video[data-lazy]');
const canAutoplay = motionOk() && !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
if (videos.length && canAutoplay && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) {
          if (!v.dataset.loaded) {
            v.querySelectorAll<HTMLSourceElement>('source[data-src]').forEach((s) => (s.src = s.dataset.src!));
            v.load();
            v.dataset.loaded = '1';
          }
          v.play().catch(() => {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    },
    { rootMargin: '120px 0px', threshold: 0.2 },
  );
  videos.forEach((v) => io.observe(v));
}

/* ---------- Floating messenger popover ---------- */
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
  if (!form) return; // no form on this page: let the link navigate to the home page form
  e.preventDefault();
  window.dispatchEvent(
    new CustomEvent('lead:prefill', {
      detail: { niche: trigger.dataset.niche, example: trigger.dataset.example, service: trigger.dataset.service },
    }),
  );
  form.scrollIntoView({ behavior: motionOk() ? 'smooth' : 'auto', block: 'start' });
});

/* ---------- Floating buttons step aside while the lead form is on screen ---------- */
const leadSection = document.getElementById('lead');
if (leadSection && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => root.classList.toggle('lead-in-view', e.isIntersecting), {
    rootMargin: '-20% 0px -20% 0px',
  }).observe(leadSection);
}

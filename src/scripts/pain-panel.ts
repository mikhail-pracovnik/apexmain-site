/**
 * Pain panel (components/PainPanel.astro): a modal <dialog> opened from a pain card.
 * Closes with the close button, a click on the backdrop, Escape and (phones) a swipe down.
 * While open: page scroll locked, the rest of the page inert (native modal), the dock hidden
 * (html.panel-open); focus returns to the card. Short show/hide (≤ 0.3s), transform + opacity only;
 * with reduced motion it opens and closes instantly.
 */
const CLOSE_MS = 280;
const SWIPE_CLOSE = 90; // px down

export function initPainPanel() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-pain-dialog]');
  if (!dialog || dialog.dataset.ready) return;
  dialog.dataset.ready = '1';
  const root = document.documentElement;
  const sheet = dialog.querySelector<HTMLElement>('[data-pd-sheet]')!;
  const panels = Array.from(dialog.querySelectorAll<HTMLElement>('[data-pd-panel]'));
  const motionOk = () => root.classList.contains('motion');
  let opener: HTMLElement | null = null;
  let closing = false;

  function open(id: string, from: HTMLElement) {
    const panel = panels.find((p) => p.dataset.pdPanel === id);
    if (!panel) return;
    opener = from;
    panels.forEach((p) => (p.hidden = p !== panel));
    dialog!.setAttribute('aria-labelledby', `pd-q-${id}`);
    sheet.scrollTop = 0;
    sheet.style.transform = '';
    root.style.overflow = 'hidden';
    root.classList.add('panel-open');
    dialog!.showModal();
    dialog!.querySelector<HTMLElement>('[data-pd-close]')?.focus({ preventScroll: true });
    if (motionOk()) requestAnimationFrame(() => requestAnimationFrame(() => dialog!.classList.add('is-open')));
    else dialog!.classList.add('is-open');
  }

  function close(then?: () => void) {
    if (!dialog!.open || closing) return;
    closing = true;
    // from wherever a swipe left the sheet, slide it out
    sheet.classList.remove('is-swiping');
    sheet.style.transform = '';
    dialog!.classList.remove('is-open');
    const done = () => {
      dialog!.close();
      sheet.style.transform = '';
      sheet.classList.remove('is-swiping');
      root.style.overflow = '';
      root.classList.remove('panel-open');
      closing = false;
      opener?.focus({ preventScroll: true });
      then?.();
    };
    if (motionOk()) window.setTimeout(done, CLOSE_MS);
    else done();
  }

  document.addEventListener('click', (e) => {
    const card = (e.target as Element | null)?.closest?.<HTMLElement>('[data-pain-open]');
    if (card) open(card.dataset.painOpen!, card);
  });
  dialog.querySelector('[data-pd-close]')?.addEventListener('click', () => close());
  // click on the backdrop (the dialog box itself, outside the sheet)
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  // Escape: animate instead of the instant native close
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  // "Get an initial audit": close, then go to the form on this page
  dialog.querySelectorAll<HTMLAnchorElement>('[data-pd-cta]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const form = document.getElementById('lead');
      if (!form) return;
      e.preventDefault();
      opener = null;
      close(() => form.scrollIntoView({ behavior: motionOk() ? 'smooth' : 'auto', block: 'start' }));
    }),
  );

  /* ---------- Swipe down to close (touch) ---------- */
  let startY: number | null = null;
  let dy = 0;
  sheet.addEventListener(
    'touchstart',
    (e) => {
      // only when the sheet is scrolled to its top, so scrolling the content still works
      startY = sheet.scrollTop <= 0 ? e.touches[0].clientY : null;
      dy = 0;
    },
    { passive: true },
  );
  sheet.addEventListener(
    'touchmove',
    (e) => {
      if (startY === null) return;
      dy = e.touches[0].clientY - startY;
      if (dy <= 0) {
        sheet.classList.remove('is-swiping');
        sheet.style.transform = '';
        return;
      }
      if (e.cancelable) e.preventDefault();
      sheet.classList.add('is-swiping');
      sheet.style.transform = `translateY(${dy}px)`;
    },
    { passive: false },
  );
  sheet.addEventListener('touchend', () => {
    if (startY === null) return;
    startY = null;
    sheet.classList.remove('is-swiping');
    if (dy > SWIPE_CLOSE) close();
    else sheet.style.transform = '';
  });
}

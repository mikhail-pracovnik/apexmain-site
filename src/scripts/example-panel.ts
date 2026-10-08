/**
 * Mock-up panel (components/ExamplePanel.astro).
 *  - Opens from a card (its link is /examples/#<id>) or from the address on arrival; while open the
 *    address keeps #<id>, so Back closes the panel instead of leaving the page.
 *  - Closes with the close button, Escape, a click on the backdrop, a swipe down on the header (phones).
 *    Native modal: focus trapped, page inert; page scroll locked, the dock hidden (html.panel-open).
 *  - The page is built from pieces (≤ 2880×3000 / 1170×3000, see scripts/make-example-images.mjs): each
 *    piece repeats the first rows of the next one and is pulled up over them, so there is no seam at any zoom.
 *    Pieces load lazily as the panel scrolls; sizes = the real CSS width, so 1x–3x files are picked
 *    and nothing is ever stretched.
 */
interface Device {
  srcW: number;
  rows: number;
  overlap: number;
  widths: number[];
}
interface PanelData {
  base: string;
  device: Record<'desktop' | 'mobile', Device>;
  text: Record<string, string> & { deviceAlt: Record<string, string> };
  examples: Record<
    string,
    {
      title: string;
      tag: string;
      niche: string;
      catalog: 'prices' | 'menu';
      pages: Record<'desktop' | 'mobile', Record<'index' | 'catalog', { height: number; pieces: number[] }>>;
    }
  >;
}

const CLOSE_MS = 300;
const SWIPE_CLOSE = 90;

export function initExamplePanel() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-example-panel]');
  if (!dialog || dialog.dataset.ready) return;
  dialog.dataset.ready = '1';
  const root = document.documentElement;
  const data: PanelData = JSON.parse(dialog.querySelector('[data-xp-data]')!.textContent || '{}');
  const sheet = dialog.querySelector<HTMLElement>('[data-xp-sheet]')!;
  const head = dialog.querySelector<HTMLElement>('[data-xp-head]')!;
  const scroller = dialog.querySelector<HTMLElement>('[data-xp-scroll]')!;
  const view = dialog.querySelector<HTMLElement>('[data-xp-view]')!;
  const tagEl = dialog.querySelector<HTMLElement>('[data-xp-tag]')!;
  const titleEl = dialog.querySelector<HTMLElement>('[data-xp-title]')!;
  const catalogBtn = dialog.querySelector<HTMLButtonElement>('[data-xp-catalog]')!;
  const deviceBtns = Array.from(dialog.querySelectorAll<HTMLButtonElement>('[data-xp-device]'));
  const pageBtns = Array.from(dialog.querySelectorAll<HTMLButtonElement>('[data-xp-page]'));
  const motionOk = () => root.classList.contains('motion');
  const narrow = () => window.matchMedia('(max-width: 47.99rem)').matches;

  let current: string | null = null;
  let device: 'desktop' | 'mobile' = 'desktop';
  let page: 'index' | 'catalog' = 'index';
  let opener: HTMLElement | null = null;
  let closing = false;
  let afterClose: (() => void) | null = null;

  /* ---------- The page in pieces ---------- */
  function render() {
    if (!current) return;
    const ex = data.examples[current];
    const d = data.device[device];
    const p = ex.pages[device][page];
    view.classList.toggle('is-mobile', device === 'mobile');
    view.textContent = '';
    // the real CSS width of the page view → the browser picks the 1x/2x/3x file for it
    const cssW = Math.round(Math.min(view.parentElement!.clientWidth - parseFloat(getComputedStyle(scroller).paddingLeft) * 2, device === 'mobile' ? 390 : 1440));
    const sizes = `${Math.max(cssW, 1)}px`;
    const max = d.widths[d.widths.length - 1];
    const pageName = page === 'index' ? data.text.index : data.text[ex.catalog];
    p.pieces.forEach((rows, i) => {
      const name = `${data.base}/${current}/${device}-${page}-${String(i + 1).padStart(2, '0')}`;
      const list = (ext: string) => d.widths.map((w) => `${name}-${w}.${ext} ${w}w`).join(', ');
      const pic = document.createElement('picture');
      for (const [type, ext] of [
        ['image/avif', 'avif'],
        ['image/webp', 'webp'],
      ]) {
        const s = document.createElement('source');
        s.type = type;
        s.srcset = list(ext);
        s.sizes = sizes;
        pic.appendChild(s);
      }
      const img = document.createElement('img');
      img.src = `${name}-${d.widths[0]}.jpg`;
      img.srcset = list('jpg');
      img.sizes = sizes;
      img.width = max;
      img.height = Math.round((rows * max) / d.srcW);
      img.loading = i === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      img.alt =
        i === 0
          ? data.text.imageAlt.replace('{title}', ex.title).replace('{page}', pageName.toLowerCase()).replace('{device}', data.text.deviceAlt[device])
          : '';
      pic.appendChild(img);
      // pull the next piece up over the rows this one repeats (percent of the page width)
      if (i < p.pieces.length - 1) pic.style.marginBottom = `${(-100 * d.overlap) / d.srcW}%`;
      pic.style.position = 'relative';
      pic.style.zIndex = String(i + 1);
      view.appendChild(pic);
    });
    scroller.scrollTop = 0;
  }
  function setDevice(next: 'desktop' | 'mobile') {
    device = next;
    deviceBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.xpDevice === next)));
    render();
  }
  function setPage(next: 'index' | 'catalog') {
    page = next;
    pageBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.xpPage === next)));
    render();
  }
  deviceBtns.forEach((b) => b.addEventListener('click', () => setDevice(b.dataset.xpDevice as 'desktop' | 'mobile')));
  pageBtns.forEach((b) => b.addEventListener('click', () => setPage(b.dataset.xpPage as 'index' | 'catalog')));

  /* ---------- Open / close ---------- */
  function open(id: string) {
    const ex = data.examples[id];
    if (!ex) return;
    if (current === id && dialog!.open) return;
    current = id;
    opener = (document.activeElement as HTMLElement | null) ?? null;
    tagEl.textContent = ex.tag;
    titleEl.textContent = ex.title;
    catalogBtn.textContent = data.text[ex.catalog];
    device = narrow() ? 'mobile' : 'desktop';
    page = 'index';
    deviceBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.xpDevice === device)));
    pageBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.xpPage === page)));
    sheet.style.transform = '';
    root.style.overflow = 'hidden';
    root.classList.add('panel-open');
    if (!dialog!.open) dialog!.showModal();
    render();
    dialog!.querySelector<HTMLElement>('[data-xp-close]')?.focus({ preventScroll: true });
    if (motionOk()) requestAnimationFrame(() => requestAnimationFrame(() => dialog!.classList.add('is-open')));
    else dialog!.classList.add('is-open');
  }

  /** Animate out and close the dialog (the address is handled by the caller). */
  function hide() {
    if (!dialog!.open || closing) return;
    closing = true;
    sheet.classList.remove('is-swiping');
    sheet.style.transform = '';
    dialog!.classList.remove('is-open');
    const done = () => {
      dialog!.close();
      view.textContent = '';
      current = null;
      closing = false;
      root.style.overflow = '';
      root.classList.remove('panel-open');
      opener?.focus({ preventScroll: true });
      const then = afterClose;
      afterClose = null;
      then?.();
    };
    if (motionOk()) window.setTimeout(done, CLOSE_MS);
    else done();
  }

  /** Close from inside the panel: step back in history (removes #id, which closes it). */
  function requestClose(then?: () => void) {
    afterClose = then ?? null;
    if (location.hash.length > 1 && history.state?.examplePanel) history.back();
    else {
      history.replaceState(null, '', location.pathname + location.search);
      hide();
    }
  }

  const idFromHash = () => decodeURIComponent(location.hash.slice(1));
  window.addEventListener('hashchange', () => {
    const id = idFromHash();
    if (data.examples[id]) {
      // a card link changed the address: remember that this history entry is ours
      if (!history.state?.examplePanel) history.replaceState({ examplePanel: true }, '', location.href);
      open(id);
    } else hide();
  });
  // arrived with #id (e.g. from a card on the home page): make Back close the panel, not leave the page
  const first = idFromHash();
  if (data.examples[first]) {
    history.replaceState(null, '', location.pathname + location.search);
    history.pushState({ examplePanel: true }, '', `#${first}`);
    open(first);
  }

  dialog.querySelector('[data-xp-close]')?.addEventListener('click', () => requestClose());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) requestClose();
  });
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    requestClose();
  });
  dialog.querySelector<HTMLAnchorElement>('[data-xp-want]')?.addEventListener('click', (e) => {
    e.preventDefault();
    const ex = current ? data.examples[current] : null;
    opener = null;
    requestClose(() => {
      if (ex) window.dispatchEvent(new CustomEvent('lead:prefill', { detail: { niche: ex.niche, example: ex.title } }));
      document.getElementById('lead')?.scrollIntoView({ behavior: motionOk() ? 'smooth' : 'auto', block: 'start' });
    });
  });
  // re-fit the pieces' sizes when the panel width changes (rotation, window resize)
  let lastW = 0;
  new ResizeObserver(() => {
    const w = scroller.clientWidth;
    if (dialog!.open && Math.abs(w - lastW) > 40) render();
    lastW = w;
  }).observe(scroller);

  /* ---------- Swipe down on the header (touch) ---------- */
  let startY: number | null = null;
  let dy = 0;
  head.addEventListener(
    'touchstart',
    (e) => {
      if ((e.target as Element).closest('button')) return;
      startY = e.touches[0].clientY;
      dy = 0;
    },
    { passive: true },
  );
  head.addEventListener(
    'touchmove',
    (e) => {
      if (startY === null) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      if (e.cancelable) e.preventDefault();
      sheet.classList.add('is-swiping');
      sheet.style.transform = `translateY(${dy}px)`;
    },
    { passive: false },
  );
  head.addEventListener('touchend', () => {
    if (startY === null) return;
    startY = null;
    sheet.classList.remove('is-swiping');
    if (dy > SWIPE_CLOSE) requestClose();
    else sheet.style.transform = '';
  });
}

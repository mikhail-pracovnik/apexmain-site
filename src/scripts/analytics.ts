/**
 * Analytics loader. Nothing is loaded until the visitor gives consent.
 * IDs come from src/config/site.ts (analytics.googleAnalyticsId / analytics.metaPixelId).
 */
const KEY = 'apexmain-consent';
type Choice = 'granted' | 'denied';

function read(): Choice | null {
  try {
    return localStorage.getItem(KEY) as Choice | null;
  } catch {
    return null;
  }
}

function write(choice: Choice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* storage unavailable: the banner will ask again next time */
  }
}

function loadGA(id: string) {
  const w = window as unknown as { dataLayer: unknown[]; gtag: (...args: unknown[]) => void };
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.append(s);
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () {
    // gtag expects the arguments object itself
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments);
  };
  w.gtag('js', new Date());
  w.gtag('config', id, { anonymize_ip: true });
}

function loadPixel(id: string) {
  // Standard Meta Pixel bootstrap, run only after consent.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.fbq) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const n: any = (w.fbq = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue.push(args);
  });
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.append(s);
  w.fbq('init', id);
  w.fbq('track', 'PageView');
}

export function initConsent() {
  const box = document.querySelector<HTMLElement>('[data-consent]');
  if (!box) return;
  const ids = JSON.parse(box.dataset.ids || '{}') as { ga: string | null; pixel: string | null };
  const start = () => {
    if (ids.ga) loadGA(ids.ga);
    if (ids.pixel) loadPixel(ids.pixel);
  };
  const choice = read();
  if (choice === 'granted') return start();
  if (choice === 'denied') return;
  box.hidden = false;
  box.querySelector('[data-consent-accept]')?.addEventListener('click', () => {
    write('granted');
    box.hidden = true;
    start();
  });
  box.querySelector('[data-consent-decline]')?.addEventListener('click', () => {
    write('denied');
    box.hidden = true;
  });
}

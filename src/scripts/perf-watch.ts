/**
 * Smoothness watchdog: the light version (html.lite) only when this device is really slow here.
 * The head script in BaseLayout sets lite at once for reduced motion, Save-Data, a forced ?perf=, or a switch
 * that already happened during this visit. Otherwise frames are counted with requestAnimationFrame for the whole
 * visit while the tab is visible (the handler only stores a time):
 *  - sliding window of 2 s: a median below 45 fps, or more than 15% of frames longer than 50 ms → lite;
 *    single hitches do not count;
 *  - strict check on the heavy places: when "Services" or another dark section with the moving light and grid
 *    comes on screen, its first 1.5 s are judged on their own with a 50 fps threshold;
 *  - no measuring while the numbers lie: during the intro; 1.5 s after a mock-up or pain panel opens (images
 *    decode); 1 s after the tab comes back or the screen turns; 300 ms after a touch on a rail (inertia);
 *    the window starts over after each of these;
 *  - one way only: once lite, it stays for the rest of the visit (sessionStorage), the watchdog stops.
 * The switch is gentle: what the light version removes fades out or stops where it is (see the html.lite rules),
 * then 'perf:lite' is fired for scripts that run loops. The last verdict is kept in sessionStorage
 * 'apex-perf-check' for checks.
 */
const WINDOW_MS = 2000;
const MIN_FPS = 45;
const STRICT_MS = 1500;
const STRICT_FPS = 50;
const SLOW_FRAME = 50;
const MAX_SLOW_SHARE = 0.15;
const EVERY_MS = 500;
const HEAVY = '#services, .dark-lit';

export function watchPerformance() {
  const html = document.documentElement;
  if (html.classList.contains('lite') || html.dataset.perf || !html.classList.contains('motion')) return;

  let times: number[] = []; // frame timestamps since the last reset
  let quietUntil = 0; // no measuring before this time
  let strictFrom = 0; // a heavy place came on screen: judge [strictFrom, strictFrom + 1.5 s] on its own
  let strictName = '';
  let lastCheck = 0;
  let raf = 0;
  let done = false;
  const introOn = () => html.classList.contains('intro-on') && !html.classList.contains('intro-done');

  const quiet = (ms: number) => {
    quietUntil = Math.max(quietUntil, performance.now() + ms);
    times = [];
    if (strictFrom) strictFrom = quietUntil; // the strict check starts again after the pause
  };
  const verdict = (from: number, to: number, minFps: number) => {
    const t = times.filter((x) => x >= from && x <= to);
    if (t.length < 10) return null;
    const d = t.slice(1).map((x, i) => x - t[i]);
    const sorted = [...d].sort((a, b) => a - b);
    const fps = 1000 / sorted[Math.floor(sorted.length / 2)];
    const slow = d.filter((x) => x > SLOW_FRAME).length / d.length;
    return { ok: fps >= minFps && slow <= MAX_SLOW_SHARE, text: `${Math.round(fps)} fps, ${Math.round(slow * 100)}% > ${SLOW_FRAME} ms` };
  };
  const switchToLite = (why: string) => {
    done = true;
    try {
      sessionStorage.setItem('apex-perf', 'lite');
      sessionStorage.setItem('apex-perf-check', `lite: ${why}`);
    } catch {}
    html.classList.add('lite');
    window.dispatchEvent(new CustomEvent('perf:lite', { detail: why }));
  };

  const tick = (now: number) => {
    raf = 0;
    if (done || document.hidden) return;
    raf = requestAnimationFrame(tick);
    if (introOn() || now < quietUntil) return;
    times.push(now);
    // keep a little more than a window
    while (times.length && times[0] < now - WINDOW_MS - 600) times.shift();
    if (now - lastCheck < EVERY_MS) return;
    lastCheck = now;
    if (strictFrom && now >= strictFrom + STRICT_MS) {
      const v = verdict(strictFrom, strictFrom + STRICT_MS, STRICT_FPS);
      strictFrom = 0;
      if (v && !v.ok) return switchToLite(`${strictName}, ${v.text}`);
      if (v) try { sessionStorage.setItem('apex-perf-check', `full: ${strictName} ${v.text}`); } catch {}
    }
    if (times[0] <= now - WINDOW_MS + 50) {
      const v = verdict(now - WINDOW_MS, now, MIN_FPS);
      if (v && !v.ok) return switchToLite(`window, ${v.text}`);
    }
  };
  const run = () => {
    if (!raf && !done && !document.hidden) raf = requestAnimationFrame(tick);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    quiet(1000);
    run();
  });
  window.addEventListener('intro:end', () => quiet(300));
  window.addEventListener('orientationchange', () => quiet(1000));
  window.matchMedia('(orientation: portrait)').addEventListener('change', () => quiet(1000));
  // a mock-up or pain panel opens: its images decode for a while
  new MutationObserver(() => {
    if (html.classList.contains('panel-open')) quiet(1500);
  }).observe(html, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener(
    'touchstart',
    (e) => {
      if ((e.target as Element | null)?.closest?.('[data-rail]')) quiet(300);
    },
    { passive: true, capture: true },
  );
  // heavy places: their first 1.5 s on screen are judged with a stricter threshold
  const heavy = Array.from(document.querySelectorAll<HTMLElement>(HEAVY));
  if (heavy.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries.find((x) => x.isIntersecting);
        if (!e) return;
        strictFrom = Math.max(performance.now(), quietUntil);
        strictName = e.target.id || e.target.className.split(' ')[0];
      },
      { threshold: 0.25 },
    );
    heavy.forEach((h) => io.observe(h));
  }
  run();
}

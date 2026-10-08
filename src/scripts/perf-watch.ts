/**
 * Frame-rate check: the light version (html.lite) only when this device is really slow here.
 * The head script in BaseLayout sets lite at once for reduced motion, Save-Data, a forced ?perf=lite, or a check
 * that already failed during this visit. Otherwise, shortly after the page has loaded, frames are timed with
 * requestAnimationFrame for about 2 s while the page animates: a median below 45 fps, or more than 15% of frames
 * longer than 50 ms, switches to the light version for the rest of the visit (sessionStorage). The switch is
 * gentle: what the light version removes fades out or stops where it is (see the html.lite rules), then
 * 'perf:lite' is fired for scripts that run loops.
 */
const MEASURE_MS = 2000;
const START_DELAY = 600;
const MIN_FPS = 45;
const SLOW_FRAME = 50;
const MAX_SLOW_SHARE = 0.15;

export function watchPerformance() {
  const html = document.documentElement;
  if (html.classList.contains('lite') || html.dataset.perf || !html.classList.contains('motion')) return;

  const measure = () => {
    const deltas: number[] = [];
    let last = 0;
    let t0 = 0;
    const tick = (now: number) => {
      if (document.hidden) return void document.addEventListener('visibilitychange', start, { once: true }); // try again when it is back
      if (last) deltas.push(now - last);
      else t0 = now;
      last = now;
      if (now - t0 < MEASURE_MS) requestAnimationFrame(tick);
      else decide(deltas);
    };
    requestAnimationFrame(tick);
  };
  const decide = (d: number[]) => {
    if (d.length < 10) return;
    const sorted = [...d].sort((a, b) => a - b);
    const fps = 1000 / sorted[Math.floor(sorted.length / 2)];
    const slow = d.filter((x) => x > SLOW_FRAME).length / d.length;
    const ok = fps >= MIN_FPS && slow <= MAX_SLOW_SHARE;
    try {
      // the last result, for checks: median fps / share of slow frames
      sessionStorage.setItem('apex-perf-check', `${Math.round(fps)} fps, ${Math.round(slow * 100)}% > ${SLOW_FRAME} ms`);
      if (!ok) sessionStorage.setItem('apex-perf', 'lite');
    } catch {}
    if (ok) return;
    html.classList.add('lite');
    window.dispatchEvent(new CustomEvent('perf:lite', { detail: { fps: Math.round(fps), slow: Math.round(slow * 100) } }));
  };
  const start = () => window.setTimeout(() => (document.hidden ? document.addEventListener('visibilitychange', start, { once: true }) : measure()), START_DELAY);
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

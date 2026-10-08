/**
 * "How we work" scene (components/Process.astro): a 12-second loop, four steps of 3 seconds.
 * The timeline is the owner's approved prototype ported one-to-one: every time, value and ease in
 * build() is the prototype's.
 *
 * Running: built (GSAP + fonts) when the section comes near; until it first plays, it shows the
 * assembled frame of step 1 (1.3s). Plays while the section is on screen, pauses when it leaves or the
 * tab is hidden, resumes from the same place. The route (65 points) is recomputed only while playing and
 * only when its shape changes; the dot only when it moves. Rings and the trail stay on every device
 * (html.lite is set on iPhones too: Safari reports few CPU cores, and without the trail the rhombus
 * rose over nothing).
 * Reduced motion / no JS: the scene is not shown at all (CSS), the plain list of steps is.
 */
type Gsap = typeof import('gsap').gsap;

const STEP = 3;
const FIRST_FRAME = 1.3;
const X0 = 8,
  X1 = 92,
  HOLE = 62;
const yAt = (x: number, amp: number) =>
  50 + amp * (-6 * Math.sin(((x - X0) / (X1 - X0)) * Math.PI * 2.2) + 9 * Math.exp(-((x - HOLE) ** 2) / 30) - 4 * Math.exp(-((x - 30) ** 2) / 60));

/** Title: words (masks) of letters; description: words. Spaces stay text nodes, as in the prototype. */
function split(el: HTMLElement, mode: 'letters' | 'words') {
  const words = (el.textContent ?? '').trim().split(/\s+/);
  el.textContent = '';
  words.forEach((word, i) => {
    const w = document.createElement('span');
    if (mode === 'letters') {
      w.className = 'w';
      [...word].forEach((ch) => {
        const l = document.createElement('span');
        l.className = 'l';
        l.textContent = ch;
        w.appendChild(l);
      });
    } else {
      w.className = 'dw';
      w.textContent = word;
    }
    el.appendChild(w);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
  el.classList.add('is-split');
}

export function initProcessMotion() {
  const root = document.documentElement;
  const found = document.querySelector<HTMLElement>('[data-pm]');
  if (!found || !root.classList.contains('motion') || !('IntersectionObserver' in window)) return;
  const stage: HTMLElement = found;
  const section = stage.closest('section') ?? stage;

  const q = <T extends Element>(sel: string) => stage.querySelector<T>(sel)!;
  const copy = q<HTMLElement>('[data-pm-copy]');
  const slides = Array.from(copy.children) as HTMLElement[];
  const bars = Array.from(q<HTMLElement>('[data-pm-bars]').children) as HTMLElement[];
  const counter = q<HTMLElement>('[data-pm-counter]');
  const counterTpl = stage.dataset.counter ?? '{n} / {total}';
  const pad = (n: number) => String(n).padStart(2, '0');
  const route = q<SVGPathElement>('[data-pm-route]');
  const dot = q<SVGCircleElement>('[data-pm-dot]');
  const pulse = q<SVGCircleElement>('[data-pm-pulse]');
  const trail = q<SVGLineElement>('[data-pm-trail]');
  const numcol = q<HTMLElement>('[data-pm-numcol]');
  const rows = [q<SVGLineElement>('.pm-r0'), q<SVGLineElement>('.pm-r1'), q<SVGLineElement>('.pm-r2')];
  const sq = [q<SVGRectElement>('.pm-s0'), q<SVGRectElement>('.pm-s1'), q<SVGRectElement>('.pm-s2')];

  const state = { amp: 1, u: 0 };
  let tl: ReturnType<Gsap['timeline']> | null = null;
  let lastStep = -1;

  // Same drawing as the prototype's renderRoute(), but the DOM is touched only when something changed:
  // most of the loop the route is hidden and still, and rewriting the path every frame costs on phones.
  let drawnAmp = NaN;
  let drawnU = NaN;
  function renderRoute() {
    if (state.amp !== drawnAmp) {
      let d = '';
      for (let i = 0; i <= 64; i++) {
        const x = X0 + ((X1 - X0) * i) / 64;
        d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + yAt(x, state.amp).toFixed(2);
      }
      route.setAttribute('d', d);
    }
    if (state.amp !== drawnAmp || state.u !== drawnU) {
      const x = X0 + (X1 - X0) * state.u;
      dot.setAttribute('cx', String(x));
      dot.setAttribute('cy', String(yAt(x, state.amp)));
    }
    drawnAmp = state.amp;
    drawnU = state.u;
  }
  function sync() {
    if (!tl) return;
    renderRoute();
    const k = Math.min(slides.length - 1, Math.floor(tl.time() / STEP));
    if (k !== lastStep) {
      lastStep = k;
      counter.textContent = counterTpl.replace('{n}', pad(k + 1)).replace('{total}', pad(slides.length));
    }
  }

  function build(gsap: Gsap) {
    slides.forEach((s) => {
      split(s.querySelector<HTMLElement>('[data-pm-letters]')!, 'letters');
      split(s.querySelector<HTMLElement>('[data-pm-words]')!, 'words');
    });
    const ROW_Y = [26, 50, 74],
      ROW_X2 = [92, 80, 68];
    const POS = [
      [50, 50],
      [30, 63],
      [70, 37],
    ];
    const HOLE_U = (HOLE - X0) / (X1 - X0);

    gsap.set(route, { strokeDasharray: 1, strokeDashoffset: 1, opacity: 1 });
    gsap.set(pulse, { opacity: 0, attr: { cx: HOLE, cy: yAt(HOLE, 1) } });
    gsap.set(rows, { opacity: 0, attr: { x1: X0, x2: X1, y1: 50, y2: 50 } });
    gsap.set(sq, { svgOrigin: '0 0', x: 15, y: (i: number) => ROW_Y[i], scale: 0, rotation: 0, opacity: 0 });
    gsap.set(trail, { opacity: 0 });
    gsap.set(numcol, { yPercent: 0 });

    const t = gsap.timeline({ repeat: -1, paused: true, onUpdate: sync });

    slides.forEach((slide, k) => {
      const t0 = k * STEP;
      const L = slide.querySelectorAll('.l'),
        W = slide.querySelectorAll('.dw');
      const rule = slide.querySelector('.pm-rule');
      // letters roll up out of their masks as a wave, the next title rolls in right behind it
      t.fromTo(L, { yPercent: 115 }, { yPercent: 0, duration: 0.8, ease: 'expo.out', stagger: 0.02 }, t0)
        .fromTo(rule, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.9, ease: 'expo.out' }, t0 + 0.2)
        .fromTo(W, { opacity: 0, y: '.7em' }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.028 }, t0 + 0.35)
        .to(W, { opacity: 0, y: '-.5em', duration: 0.3, ease: 'power2.in', stagger: 0.01 }, t0 + 2.3)
        .set(rule, { transformOrigin: '100% 50%' }, t0 + 2.3)
        .to(rule, { scaleX: 0, duration: 0.45, ease: 'power3.inOut' }, t0 + 2.3)
        .to(L, { yPercent: -115, duration: 0.42, ease: 'power3.in', stagger: 0.014 }, t0 + 2.36);
      t.fromTo(bars[k], { '--p': 0 }, { '--p': 1, duration: STEP, ease: 'none' }, t0);
      t.to(numcol, { yPercent: -20 * (k + 1), duration: 0.8, ease: 'expo.inOut' }, t0 + 2.2);
    });

    // 01 the client's bumpy route: the line draws, a point walks it and stops at the pothole
    t.to(route, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' }, 0.05).to(state, { u: HOLE_U, duration: 1, ease: 'power1.inOut' }, 0.45);
    t.fromTo(pulse, { attr: { r: 1.7 }, opacity: 0.9 }, { attr: { r: 9 }, opacity: 0, duration: 0.55, ease: 'power2.out', immediateRender: false }, 1.45).fromTo(
      pulse,
      { attr: { r: 1.7 }, opacity: 0.9 },
      { attr: { r: 9 }, opacity: 0, duration: 0.55, ease: 'power2.out', immediateRender: false },
      1.75,
    );
    t.to(state, { u: 1, duration: 0.45, ease: 'power2.in' }, 2.0)
      .to(dot, { opacity: 0, duration: 0.15 }, 2.45)
      .to(state, { amp: 0, duration: 0.55, ease: 'expo.inOut' }, 2.2);
    // 01 → 02 the straightened route splits into three plan items
    t.set(route, { opacity: 0 }, 2.75)
      .set(rows, { opacity: 1 }, 2.75)
      .to(rows, { attr: { y1: (i: number) => ROW_Y[i], y2: (i: number) => ROW_Y[i], x1: 30, x2: (i: number) => ROW_X2[i] }, duration: 0.65, ease: 'expo.inOut' }, 2.75)
      .set(sq, { opacity: 1 }, 3.0)
      .to(sq, { scale: 14, duration: 0.5, ease: 'expo.out', stagger: 0.08 }, 3.0)
      // 02 the first item is marked as the priority, the others settle their length
      .to(sq[0], { fillOpacity: 1, duration: 0.3, ease: 'power2.out' }, 3.9)
      .to(rows[1], { attr: { x2: 70 }, duration: 0.6, ease: 'power3.inOut' }, 4.2)
      .to(rows[2], { attr: { x2: 84 }, duration: 0.6, ease: 'power3.inOut' }, 4.35);
    // 02 → 03 lines fold into their squares, the squares become three blocks
    t.to(rows, { attr: { x1: 22, x2: 22 }, duration: 0.4, ease: 'power3.in', stagger: 0.04 }, 5.15)
      .set(rows, { opacity: 0 }, 5.65)
      .to(sq[0], { fillOpacity: 0, duration: 0.3 }, 5.3)
      .to(sq, { x: (i: number) => POS[i][0], y: (i: number) => POS[i][1], scale: 32, duration: 0.7, ease: 'expo.inOut', stagger: 0.05 }, 5.5);
    // 03 blocks trade places, stack into one, and the one turns into a rhombus
    t.to(sq, { x: (i: number) => POS[(i + 1) % 3][0], y: (i: number) => POS[(i + 1) % 3][1], duration: 0.65, ease: 'power3.inOut' }, 6.7)
      .to(sq, { x: 50, y: 50, duration: 0.5, ease: 'power3.inOut' }, 7.5)
      .set([sq[1], sq[2]], { opacity: 0 }, 8.02)
      .to(sq[0], { rotation: 45, scale: 28, y: 60, duration: 0.8, ease: 'expo.inOut' }, 8.15);
    // 04 the rhombus rises as a peak, a trail grows under it
    t.to(sq[0], { y: 36, duration: 1.7, ease: 'power2.inOut' }, 9.25);
    t.set(trail, { opacity: 1 }, 9.3)
      .to(trail, { attr: { y1: 56 }, duration: 1.65, ease: 'power2.inOut' }, 9.3)
      .to(trail, { opacity: 0, duration: 0.25 }, 10.95);
    // 04 → 01 the peak shrinks into the point that starts the route again
    t.to(sq[0], { x: X0, y: yAt(X0, 1), scale: 3.4, rotation: 0, fillOpacity: 1, attr: { rx: 0.5 }, duration: 0.8, ease: 'expo.inOut' }, 11.2);

    tl = t;
    t.time(0);
    t.time(FIRST_FRAME); // the assembled frame of step 1 until it first plays
    sync();
    stage.classList.add('is-built');
    // dev only: lets a check seek the timeline frame by frame and compare with the prototype
    if (import.meta.env.DEV) Object.assign(stage, { pmTimeline: t, pmSync: sync });
  }

  /* ---------- Build near the screen, play only while visible ---------- */
  let visible = false;
  let building: Promise<void> | null = null;
  const update = () => {
    if (!tl) return;
    if (visible && !document.hidden) tl.play();
    else tl.pause();
  };
  const ensureBuilt = () =>
    (building ??= Promise.all([import('gsap'), document.fonts?.ready]).then(([m]) => {
      build(m.gsap);
      update();
    }));

  new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && ensureBuilt(), { rootMargin: '100% 0px' }).observe(section);
  new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) ensureBuilt();
      update();
    },
    { threshold: 0 },
  ).observe(stage);
  document.addEventListener('visibilitychange', update);
}

/**
 * Live service scenes (components/ServiceScene.astro), timelines ported from the owner's prototype
 * (assets/design-src/services-motion.html): same times, durations and eases. Changes for transform-only
 * animation: positions that the prototype moved with top/left move with xPercent/yPercent (percent of the
 * element's own size, values converted from the prototype's cqw); the receipt prints with two opposite
 * translations instead of a clip-path. Class changes go through classList (Astro's scope class stays).
 *
 * Playback: each scene loops on its own timeline; it plays while at least 35% of it is on screen, and at most
 * two scenes play at once (the most visible); the rest pause with their lights. A hidden tab stops GSAP's ticker.
 * Reduced motion: the assembled frame (62% of the loop, as in the prototype), lights still.
 */
import gsap from 'gsap';

type Build = (r: HTMLElement) => gsap.core.Timeline;
const q = <T extends Element = HTMLElement>(s: string, r: ParentNode) => r.querySelector<T>(s)!;
const qa = <T extends Element = HTMLElement>(s: string, r: ParentNode) => Array.from(r.querySelectorAll<T>(s));
const MAX_PLAYING = 2;
const THRESHOLD = 0.35;

/* 01 site: the page assembles, a tap on the button, a lead arrives */
const site: Build = (r) => {
  const ph = q('.phone', r);
  const parts = ['.bar', '.hero', '.l1', '.l2', '.l3', '.book', '.row'].map((s) => q(s, ph));
  const btn = q('.book', ph);
  const toast = q('.toast', r);
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
  tl.set(parts, { opacity: 0, y: 14 })
    .set(toast, { opacity: 0, x: 30 })
    .set(btn, { backgroundColor: '#fff', color: '#0b0d13' })
    .to(parts, { opacity: 1, y: 0, duration: 0.55, ease: 'expo.out', stagger: 0.14 }, 0.2)
    .fromTo(q('.tap', r), { opacity: 0.9, scale: 0.3 }, { opacity: 0, scale: 1.4, duration: 0.6, ease: 'power2.out' }, 1.9)
    .to(btn, { backgroundColor: '#46c8d9', color: '#030306', duration: 0.2 }, 1.95)
    .to(btn, { scale: 0.94, yoyo: true, repeat: 1, duration: 0.1 }, 1.95)
    .to(toast, { opacity: 1, x: 0, duration: 0.7, ease: 'expo.out' }, 2.3)
    .to(q('.dot', r), { scale: 1.6, yoyo: true, repeat: 3, duration: 0.25, ease: 'sine.inOut' }, 2.6)
    .to([...parts, toast], { opacity: 0, duration: 0.4 }, 5.2);
  return tl;
};

/* 02 brand: the feed fills with one consistent palette, a like, then a message */
const brand: Build = (r) => {
  const tiles = qa('.tile', r);
  const marks = qa('.tile i', r);
  const heart = q<SVGPathElement>('[data-heart]', r);
  const cnt = q('.cnt', r);
  const post = q('.post', r);
  const msg = q('.msg', r);
  const num = { v: 828 };
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
  tl.set(tiles, { backgroundColor: 'rgba(255,255,255,.07)', scale: 1 })
    .set(post, { opacity: 0, y: 20, scale: 0.96 })
    .set(msg, { opacity: 0, y: 10 })
    .set(heart, { attr: { fill: 'none', stroke: '#0b0d13' } })
    .set(num, { v: 828 })
    .call(() => (cnt.textContent = '828'))
    .set(marks, { opacity: 0 })
    .to(tiles, { backgroundColor: (_i: number, el: HTMLElement) => el.dataset.c!, duration: 0.45, ease: 'power2.out', stagger: { each: 0.12, from: 'start' } }, 0.2)
    .to(marks, { opacity: 1, duration: 0.3, stagger: 0.03 }, 0.5)
    .to(post, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out' }, 1.5)
    .to(heart, { attr: { fill: '#46c8d9', stroke: '#46c8d9' }, duration: 0.15 }, 2.5)
    .fromTo(q('.heart', r), { scale: 1 }, { scale: 1.35, yoyo: true, repeat: 1, duration: 0.16, ease: 'power2.out' }, 2.5)
    .to(num, { v: 829, duration: 0.3, onUpdate: () => (cnt.textContent = String(Math.round(num.v))) }, 2.55)
    .to(msg, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, 3.1)
    .to([post, msg, ...tiles], { opacity: 0, duration: 0.4 }, 5.6)
    .set(tiles, { opacity: 1 });
  return tl;
};

/* 03 search: a query is typed, results appear, yours rises to the top, requests grow */
const search: Build = (r) => {
  const bar = q('.bar', r);
  const qEl = q('.q', bar);
  const text = bar.dataset.query ?? '';
  const st = { n: 0 };
  const rows = qa('.res', r);
  const me = q('.res.me', r);
  const others = rows.filter((e) => e !== me);
  const line = q<SVGPathElement>('[data-line]', r);
  const chart = q('.chart', r);
  // place i: 23 + 13·i cqw; a row is 10.4cqw tall → 125% of its height per place
  const at = (i: number) => i * 125;
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
  tl.set(st, { n: 0 })
    .call(() => (qEl.textContent = ''))
    .set(rows, { opacity: 0, x: -14, yPercent: (i: number) => at(i) })
    .set(line, { attr: { 'stroke-dasharray': 1, 'stroke-dashoffset': 1 } })
    .set(chart, { opacity: 0 })
    .to(st, { n: text.length, duration: 1.1, ease: 'none', onUpdate: () => (qEl.textContent = text.slice(0, Math.round(st.n))) }, 0.2)
    .to(rows, { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out', stagger: 0.12 }, 1.45)
    .to(me, { yPercent: at(0), duration: 0.8, ease: 'expo.inOut' }, 2.4)
    .to(others, { yPercent: (i: number) => at(i + 1), duration: 0.8, ease: 'expo.inOut' }, 2.4)
    .to(chart, { opacity: 1, duration: 0.4 }, 2.9)
    .to(line, { attr: { 'stroke-dashoffset': 0 }, duration: 1.4, ease: 'power2.inOut' }, 3.0)
    .to([...rows, chart], { opacity: 0, duration: 0.4 }, 5.6);
  return tl;
};

/* 04 crm: leads drop in from different channels and move across the pipeline */
const crm: Build = (r) => {
  const A = q('[data-lead="a"]', r);
  const B = q('[data-lead="b"]', r);
  const C = q('[data-lead="c"]', r);
  const bell = q('.bell', r);
  // prototype slots: left 7 / 38.5 / 70 cqw, top 15 / 28.5 / 42 cqw, entering from top −14cqw;
  // a lead is 23 × 11.4 cqw and stands at (7, 15) → percent of its own size
  const X = [0, (31.5 / 23) * 100, (63 / 23) * 100];
  const Y = [0, (13.5 / 11.4) * 100, (27 / 11.4) * 100];
  const TOP = (-29 / 11.4) * 100;
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5, paused: true });
  tl.set([A, B, C], { opacity: 0, xPercent: X[0], yPercent: TOP, rotation: 0 })
    .call(() => A.classList.remove('paid'))
    .set(bell, { opacity: 0, y: 10 })
    .to(A, { opacity: 1, yPercent: Y[0], duration: 0.6, ease: 'back.out(1.4)' }, 0.2)
    .to(B, { opacity: 1, yPercent: Y[1], duration: 0.6, ease: 'back.out(1.4)' }, 0.5)
    .to(C, { opacity: 1, yPercent: Y[2], duration: 0.6, ease: 'back.out(1.4)' }, 0.8)
    .to(A, { xPercent: X[1], rotation: -3, duration: 0.7, ease: 'expo.inOut' }, 1.7)
    .to(A, { rotation: 0, duration: 0.3 }, 2.35)
    .to([B, C], { yPercent: (i: number) => Y[i], duration: 0.5, ease: 'power3.inOut' }, 1.9)
    .to(B, { xPercent: X[1], yPercent: Y[1], duration: 0.7, ease: 'expo.inOut' }, 2.5)
    .to(A, { xPercent: X[2], duration: 0.7, ease: 'expo.inOut' }, 3.1)
    .call(() => A.classList.add('paid'), [], 3.75)
    .to(bell, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 3.9)
    .to([A, B, C, bell], { opacity: 0, duration: 0.4 }, 5.8);
  return tl;
};

/* 05 payment: QR is scanned, check mark, receipt prints, money lands in accounting */
const pay: Build = (r) => {
  const qr = q('.qr', r);
  const ok = q('.ok', r);
  const ck = q<SVGPathElement>('[data-check]', r);
  const scan = q('.scan', r);
  const receipt = q('.receipt', r);
  const paper = q('.rc-box', r);
  const tag = q('.tag', r);
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
  tl.set(qr, { opacity: 1, scale: 1 })
    .set(ok, { opacity: 0, scale: 0.4 })
    .set(ck, { attr: { 'stroke-dasharray': 1, 'stroke-dashoffset': 1 } })
    .set(receipt, { opacity: 0, y: -20, yPercent: -100 })
    .set(paper, { yPercent: 100 })
    .set(tag, { opacity: 0, y: 10 })
    // 9cqw → 33cqw: 24cqw = 4000% of the 0.6cqw line
    .fromTo(scan, { opacity: 1, yPercent: 0 }, { yPercent: 4000, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.3)
    .set(scan, { opacity: 0 }, 1.75)
    .to(qr, { opacity: 0, scale: 0.9, duration: 0.25 }, 1.75)
    .to(ok, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' }, 1.85)
    .to(ck, { attr: { 'stroke-dashoffset': 0 }, duration: 0.35, ease: 'power2.out' }, 2.05)
    .to(receipt, { opacity: 1, y: 0, yPercent: 0, duration: 0.9, ease: 'power2.out' }, 2.4)
    .to(paper, { yPercent: 0, duration: 0.9, ease: 'power2.out' }, 2.4)
    .to(tag, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 3.4)
    .to([ok, receipt, tag], { opacity: 0, duration: 0.4 }, 5.6);
  return tl;
};

const BUILD: Record<string, Build> = { site, brand, search, crm, pay };

interface Item {
  el: HTMLElement;
  tl: gsap.core.Timeline;
  extra: gsap.core.Tween[];
  ratio: number;
  playing: boolean;
}

export function initServiceScenes() {
  const nodes = qa('[data-scene]', document).filter((n) => !n.dataset.ready && BUILD[n.dataset.scene!]);
  if (!nodes.length) return;
  const motion = document.documentElement.classList.contains('motion');

  const items: Item[] = nodes.map((el) => {
    el.dataset.ready = '1';
    const tl = BUILD[el.dataset.scene!](el);
    (el as HTMLElement & { sceneTimeline?: gsap.core.Timeline }).sceneTimeline = tl; // for checks in the browser
    if (!motion) {
      // the assembled frame; events on, so typed text, the counter and the "paid" frame are drawn too
      tl.progress(0.62, false).pause();
      return { el, tl, extra: [], ratio: 0, playing: false };
    }
    // lights drift slowly (prototype: ±10cqw / ±8cqw on a 60cqw light = 16.67% / 13.33%)
    const extra = qa('.orb', el).map((o) => {
      const i = Number(o.dataset.i);
      return gsap.to(o, {
        xPercent: (i % 2 ? -1 : 1) * 16.667,
        yPercent: ((i % 3) - 1) * 13.333,
        duration: 9 + (i % 4),
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        paused: true,
      });
    });
    const cur = el.querySelector('.cur');
    if (cur) extra.push(gsap.to(cur, { opacity: 0, repeat: -1, yoyo: true, duration: 0.5, ease: 'steps(1)', paused: true }));
    return { el, tl, extra, ratio: 0, playing: false };
  });
  if (!motion) return;

  const set = (it: Item, on: boolean) => {
    if (it.playing === on) return;
    it.playing = on;
    it.el.classList.toggle('is-playing', on);
    if (on) {
      it.tl.play();
      it.extra.forEach((t) => t.play());
    } else {
      it.tl.pause();
      it.extra.forEach((t) => t.pause());
    }
  };
  const pick = () => {
    const on = items
      .filter((i) => i.ratio >= THRESHOLD)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, MAX_PLAYING);
    items.forEach((i) => set(i, on.includes(i)));
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const it = items.find((i) => i.el === e.target);
        if (it) it.ratio = e.isIntersecting ? e.intersectionRatio : 0;
      }
      pick();
    },
    { threshold: [0, 0.2, THRESHOLD, 0.5, 0.65, 0.8, 0.95, 1] },
  );
  items.forEach((i) => io.observe(i.el));
}

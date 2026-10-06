/**
 * Intro + hero controller.
 * The first screen is held by CSS `position: sticky` inside a taller stage (see Stage.astro),
 * so the scroll length (1.25 × viewport) is reserved before any JS runs; GSAP only scrubs the timeline.
 */
import { ParticleMark } from './particles';

export function initStage() {
  const root = document.documentElement;
  const stage = document.querySelector<HTMLElement>('[data-stage]');
  if (!stage) return;
  const canvas = stage.querySelector<HTMLCanvasElement>('[data-particles]');
  const header = document.getElementById('site-header');
  const motion = root.classList.contains('motion');
  const lite = root.classList.contains('lite');

  let particles: ParticleMark | null = null;
  if (canvas && 'getContext' in canvas) {
    const wide = window.matchMedia('(min-width: 64rem)').matches;
    particles = new ParticleMark(canvas, {
      count: lite ? 520 : wide ? 2300 : 1100,
      still: !motion,
      maxDpr: lite ? 1.25 : 2,
    });
  }

  const showHeader = (on: boolean) => header?.classList.toggle('is-shown', on);

  if (!motion) {
    particles?.assemble();
    showHeader(true);
    return;
  }

  const startIntro = async () => {
    try {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });
      buildTimeline(gsap, ScrollTrigger);
    } catch (err) {
      // If the animation library fails to load, show the finished state.
      console.error(err);
      root.classList.add('intro-off');
      showHeader(true);
      particles?.assemble();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildTimeline(gsap: any, ScrollTrigger: any) {
    const intro = stage!.querySelector<HTMLElement>('[data-intro]')!;
    const bg = intro.querySelector<HTMLElement>('[data-intro-bg]');
    const anchor = intro.querySelector<HTMLElement>('[data-intro-anchor]')!;
    const fly = intro.querySelector<HTMLElement>('[data-intro-fly]')!;
    const hint = intro.querySelector<HTMLElement>('[data-intro-hint]');
    const glow = intro.querySelector<SVGElement>('[data-intro-glow]');
    const outline = intro.querySelectorAll<SVGPolygonElement>('.intro-mark polygon');
    const paper = Array.from(outline).filter((p) => p.dataset.tone === 'paper');
    const peak = Array.from(outline).filter((p) => p.dataset.tone === 'apex');
    const headerMark = document.getElementById('header-mark');
    const heroIn = stage!.querySelectorAll<HTMLElement>('.hero-in');

    // Where the big mark must land: the small mark in the header (both measured untransformed).
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

    gsap.set(heroIn, { autoAlpha: 0, y: 32 });
    if (headerMark) gsap.set(headerMark, { autoAlpha: 0 });

    let assembled = false;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate(self: { progress: number }) {
          const p = self.progress;
          showHeader(p > 0.86);
          if (!assembled && p > 0.72) {
            assembled = true;
            particles?.assemble();
          }
        },
      },
    });

    // 0 → 0.45: white lines of the mark are drawn
    tl.to(hint, { autoAlpha: 0, y: 10, duration: 0.08 }, 0)
      .to(paper, { strokeDashoffset: 0, duration: 0.34, stagger: 0.03 }, 0.02)
      .to(paper, { fillOpacity: 1, duration: 0.1, stagger: 0.02 }, 0.36)
      // 0.48 → 0.66: the turquoise peak lights up last
      .to(peak, { strokeDashoffset: 0, duration: 0.12 }, 0.48)
      .to(peak, { fillOpacity: 1, duration: 0.05 }, 0.6)
      .fromTo(glow, { opacity: 0 }, { opacity: 0.55, duration: 0.05 }, 0.6)
      .to(glow, { opacity: 0, duration: 0.08 }, 0.68)
      // 0.68 → 0.9: the mark flies into the header, the hero opens up
      .to(fly, { x: () => target().x, y: () => target().y, scale: () => target().s, duration: 0.22, ease: 'power2.inOut' }, 0.68)
      .to(bg, { opacity: 0, duration: 0.16 }, 0.72)
      .to(heroIn, { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.025, ease: 'power2.out' }, 0.78)
      .set(fly, { autoAlpha: 0 }, 0.9)
      .set(headerMark, { autoAlpha: 1 }, 0.9)
      .to({}, { duration: 0.1 }, 0.9); // short hold so the end state settles before the stage scrolls on

    // Recalculate after fonts load (header width may change), then honour a #hash in the URL:
    // ScrollTrigger's refresh cancels the browser's own jump to the anchor.
    const jumpToHash = () => {
      const target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
      if (target && window.scrollY < 10) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    };
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      ScrollTrigger.refresh();
      jumpToHash();
    });
  }

  // Load GSAP right away when the page was opened scrolled (anchor link, reload), otherwise when idle.
  if (window.scrollY > 0 || location.hash.length > 1) startIntro();
  else if ('requestIdleCallback' in window) requestIdleCallback(() => startIntro(), { timeout: 1200 });
  else setTimeout(startIntro, 300);
}

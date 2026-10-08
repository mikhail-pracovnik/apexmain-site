/**
 * Example cards (components/ExampleCard.astro, NextCard.astro): the slow scroll in the window and the
 * phone, and the drifting grid of the "your business" card, run only while the card is on screen
 * (class is-playing). The animation itself is CSS (transform only); with reduced motion there is none.
 */
export function initExampleCards() {
  const root = document.documentElement;
  if (!root.classList.contains('motion') || !('IntersectionObserver' in window)) return;
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-example-card]:not([data-ec-ready])'));
  if (!cards.length) return;
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('is-playing', e.isIntersecting && e.intersectionRatio >= 0.3)),
    { threshold: [0, 0.3] },
  );
  cards.forEach((c) => {
    c.dataset.ecReady = '1';
    io.observe(c);
  });
}

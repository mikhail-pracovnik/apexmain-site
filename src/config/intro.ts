/**
 * Intro on the home page (Stage.astro + scripts/stage.ts): the mark position and timing, chosen by the owner
 * on 2026-10-08. Reset the remembered choice and the visit mark: ?intro=reset.
 */
export const intro = {
  /** Vertical centre of the mark, share of the screen height from the top. Same on every screen of the intro. */
  markY: 0.4,
  /** Language buttons: gap between the mark and the buttons block, rem (moves the block up / down). */
  langsGap: 3,
  /** Seconds. */
  buttonsOut: 0.2,
  outline: 0.4,
  fill: 0.5,
  fly: 0.6,
};


/** Storage keys shared by the head script (BaseLayout) and scripts/stage.ts. */
export const introKeys = {
  /** localStorage: the language the visitor chose (or arrived with on /kk/ or /en/). */
  lang: 'apexmain-lang',
  /** sessionStorage: the reel has been shown during this visit. */
  seen: 'apexmain-intro-seen',
  /** sessionStorage: a language was picked on another language's page; its value is the target locale. */
  switchTo: 'apexmain-intro-switch',
};

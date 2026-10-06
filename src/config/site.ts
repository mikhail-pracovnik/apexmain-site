/**
 * Global site settings. Everything that may change after launch lives here.
 */
export const site = {
  name: 'ApexMain',
  /** Production origin (GitHub Pages). Change together with `base` when a custom domain is connected. */
  origin: 'https://mikhail-pracovnik.github.io',
  /** Path prefix of the GitHub Pages project site. Use '/' for a custom domain. */
  base: '/apexmain-site',

  /**
   * Demo mode: while true, every page gets `noindex, nofollow` and robots.txt disallows crawling.
   * Set to false when the site is ready to be indexed.
   */
  demo: true,

  /** Services catalog page is a stub until the final list of services is ready. */
  servicesCatalogReady: false,

  contacts: {
    telegram: 'apexxmain',
    whatsapp: '77077712075',
    whatsappDisplay: '+7 707 771 20 75',
    email: null as string | null,
  },

  /**
   * Analytics stay off until IDs are filled in. Even then, scripts load only after the visitor
   * accepts cookies in the consent banner.
   */
  analytics: {
    googleAnalyticsId: null as string | null, // e.g. 'G-XXXXXXXXXX'
    metaPixelId: null as string | null, // e.g. '1234567890'
  },

  /** Legal details for the privacy policy. Placeholders are shown while null. */
  legal: {
    entity: null as string | null, // ИП / ТОО name
    bin: null as string | null,
    email: null as string | null,
    address: null as string | null,
  },
} as const;

export type Site = typeof site;

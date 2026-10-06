import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { site } from './src/config/site';

export default defineConfig({
  site: site.origin,
  base: site.base,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'ru', locales: { ru: 'ru-KZ', kk: 'kk-KZ', en: 'en' } },
      // Stub and noindex pages stay out of the sitemap.
      filter: (page) => !/\/(services|privacy|palette|404)\/?$/.test(page),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});

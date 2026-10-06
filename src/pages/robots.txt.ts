import type { APIRoute } from 'astro';
import { site } from '../config/site';

/**
 * robots.txt follows the `demo` flag in src/config/site.ts.
 * Note: on a GitHub Pages project site this file lives under the base path, where crawlers do not
 * look for it; the <meta name="robots"> tag on every page is what actually keeps the demo out of search.
 * With a custom domain this file becomes effective at the root.
 */
export const GET: APIRoute = () => {
  const sitemap = new URL(`${site.base.replace(/\/$/, '')}/sitemap-index.xml`, site.origin).href;
  const body = site.demo
    ? ['User-agent: *', 'Disallow: /', ''].join('\n')
    : ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemap}`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

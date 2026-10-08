import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

/** Text in all three site languages. */
const localized = <T extends z.ZodType>(schema: T) => z.object({ ru: schema, kk: schema, en: schema });

/** One service = one YAML file in src/content/services/. */
const services = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: './src/content/services' }),
  schema: z.object({
    order: z.number().default(100),
    /** Data-only flag: draft services are still shown, the flag marks them for review. */
    draft: z.boolean().default(false),
    /** Hide from the site entirely without deleting the file. */
    hidden: z.boolean().default(false),
    /** Starting price in tenge; null shows "price after the audit". */
    priceFrom: z.number().nullable().default(null),
    /** Live scene drawn in code (components/ServiceScene.astro), in the home card and on the services page; null: a placeholder. */
    scene: z.enum(['site', 'brand', 'search', 'crm', 'pay']).nullable().default(null),
    title: localized(z.string()),
    /** One sentence for the home-page card. */
    short: localized(z.string()).optional(),
    description: localized(z.string()),
    /** "Who it is for" on the services page. */
    audience: localized(z.string()).optional(),
    /** "What is included" on the services page. */
    includes: localized(z.array(z.string())).optional(),
  }),
});

/**
 * One example = one YAML file in src/content/examples/, named by its id (barber.yaml…).
 * Pictures: public/media/examples/<id>/, made by `npm run images:examples` (see src/data/example-media.json).
 */
const examples = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: './src/content/examples' }),
  schema: z.object({
    order: z.number().default(100),
    hidden: z.boolean().default(false),
    /** General category from niches.yaml (the tag on the card, the filter, the lead form). */
    niche: z.string(),
    /** The second page of the mock-up: a price list or a menu (tab name in the panel). */
    catalog: z.enum(['prices', 'menu']).default('prices'),
    /** Name of the business type: "Барбершоп". */
    title: localized(z.string()),
    /** One line under the name. */
    summary: localized(z.string()),
  }),
});

const niches = defineCollection({
  loader: file('./src/content/niches.yaml'),
  schema: z.object({ order: z.number(), label: localized(z.string()) }),
});

const pains = defineCollection({
  loader: file('./src/content/pains.yaml'),
  schema: z.object({
    order: z.number(),
    /** id of the service file this pain leads to */
    service: z.string(),
    /** Illustration in /public without width and extension: media/pains/pain-01 → pain-01-480.avif … */
    image: z.string(),
    /** Background tone of the illustration; the card under it is filled with it. */
    tone: z.string().regex(/^#[0-9a-f]{6}$/i),
    quote: localized(z.string()),
    answer: localized(z.string()),
  }),
});

/** Every quote must be verified against a reliable source before it is added. */
const quotes = defineCollection({
  loader: file('./src/content/quotes.yaml'),
  schema: z.object({
    order: z.number(),
    /** Exact original line in English. */
    original: z.string(),
    /** Original film title in English. */
    film: z.string(),
    year: z.number(),
    sources: z.array(z.url()).min(1),
  }),
});

/** Systems we connect sites to (home page block). Names are shown as text until an official logo file is added. */
const integrations = defineCollection({
  loader: file('./src/content/integrations.yaml'),
  schema: z.object({
    order: z.number(),
    group: z.enum(['bank', 'crm', 'pos']),
    name: localized(z.string()),
    logo: z.string().nullable().default(null),
  }),
});

export const collections = { services, examples, niches, pains, quotes, integrations };

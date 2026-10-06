import { getCollection } from 'astro:content';

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export async function getServices() {
  return (await getCollection('services', ({ data }) => !data.hidden)).sort(byOrder);
}

export async function getExamples() {
  return (await getCollection('examples', ({ data }) => !data.hidden)).sort(byOrder);
}

export async function getNiches() {
  return (await getCollection('niches')).sort(byOrder);
}

export async function getPains() {
  return (await getCollection('pains')).sort(byOrder);
}

export async function getQuotes() {
  return (await getCollection('quotes')).sort(byOrder);
}

/** Format a price in tenge with thin spaces: 250000 → "250 000 ₸". */
export function formatPrice(value: number, currency: string): string {
  return `${new Intl.NumberFormat('ru-RU').format(value).replace(/\s/g, ' ')} ${currency}`;
}

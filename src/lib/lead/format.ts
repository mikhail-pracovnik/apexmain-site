import type { Lead } from './types';

export interface MessageLabels {
  greeting: string;
  name: string;
  contact: string;
  niche: string;
  comment: string;
  example: string;
  service: string;
}

/** Plain-text message that lands in the messenger chat. */
export function formatLead(lead: Lead, l: MessageLabels): string {
  const lines = [l.greeting, '', `${l.name}: ${lead.name}`, `${l.contact}: ${lead.contact}`];
  if (lead.niche) lines.push(`${l.niche}: ${lead.niche}`);
  if (lead.service) lines.push(`${l.service}: ${lead.service}`);
  if (lead.example) lines.push(`${l.example}: ${lead.example}`);
  if (lead.comment) lines.push(`${l.comment}: ${lead.comment}`);
  return lines.join('\n');
}

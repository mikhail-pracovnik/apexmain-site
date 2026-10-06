/**
 * Lead sending entry point. To switch to a server-side bot later, implement LeadSender
 * (e.g. POST to a serverless function that holds the bot token) and return it from getSender().
 * Never put a bot token into this repository: the site is public static files.
 */
import { site } from '../../config/site';
import { createMessengerSender } from './messenger';
import type { LeadSender } from './types';

export * from './types';
export { formatLead, type MessageLabels } from './format';

export function getSender(): LeadSender {
  return createMessengerSender({ telegram: site.contacts.telegram, whatsapp: site.contacts.whatsapp });
}

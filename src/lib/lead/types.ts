/** A request from the lead form. */
export interface Lead {
  name: string;
  contact: string;
  niche?: string; // human-readable niche label
  comment?: string;
  service?: string; // service title, when the form was opened from a service card
  example?: string; // example title, when the form was opened from "I want one like this"
  locale: string;
  page: string;
}

export type Channel = 'telegram' | 'whatsapp';

export interface SendResult {
  ok: boolean;
  /** For messenger links: the URL that was opened. */
  url?: string;
  /** Whether the message text was put on the clipboard as a fallback. */
  copied?: boolean;
  error?: string;
}

/**
 * Transport for leads. Today: open a messenger with a pre-filled message (no server on GitHub Pages).
 * Later: replace with a sender that POSTs to a serverless function holding the bot token.
 */
export interface LeadSender {
  send(lead: Lead, channel: Channel, text: string): Promise<SendResult>;
}

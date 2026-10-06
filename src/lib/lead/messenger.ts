import type { Channel, LeadSender, SendResult } from './types';

export interface MessengerContacts {
  telegram: string; // username without @
  whatsapp: string; // digits only, with country code
}

export function messengerUrl(channel: Channel, contacts: MessengerContacts, text: string): string {
  const q = encodeURIComponent(text);
  return channel === 'telegram'
    ? `https://t.me/${contacts.telegram}?text=${q}`
    : `https://wa.me/${contacts.whatsapp}?text=${q}`;
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens Telegram or WhatsApp with the request text pre-filled.
 * Telegram does not prefill text for user chats in every client, so the text is also copied
 * to the clipboard and the visitor is told they can paste it.
 */
export function createMessengerSender(contacts: MessengerContacts): LeadSender {
  return {
    async send(_lead, channel, text): Promise<SendResult> {
      const url = messengerUrl(channel, contacts, text);
      // Start copying while the page still has focus and user activation.
      const copying = channel === 'telegram' ? copy(text) : Promise.resolve(false);
      // Open first, synchronously inside the click handler, so pop-up blockers allow it.
      // ('noopener' would make window.open return null, so detach the opener manually.)
      const win = window.open(url, '_blank');
      if (win) win.opener = null;
      else window.location.href = url;
      const copied = await copying;
      return { ok: true, url, copied };
    },
  };
}

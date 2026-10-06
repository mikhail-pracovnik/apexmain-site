import { getSender, formatLead, type Channel, type MessageLabels } from '../lib/lead';

interface FormConfig {
  locale: string;
  labels: MessageLabels;
  errors: { name: string; contact: string; consent: string };
  copied: string;
  opened: string;
  picked: string;
}

const PHONE_DIGITS = 10;
const USERNAME = /^@?[A-Za-z][A-Za-z0-9_]{3,31}$/;

export function initLeadForm() {
  const form = document.querySelector<HTMLFormElement>('[data-lead-form]');
  if (!form) return;
  const cfg = JSON.parse(form.dataset.config || '{}') as FormConfig;
  const status = form.querySelector<HTMLElement>('[data-status]')!;
  const picked = form.querySelector<HTMLElement>('[data-picked]')!;
  const el = <T extends Element>(name: string) => form.elements.namedItem(name) as unknown as T;
  const name = el<HTMLInputElement>('name');
  const contact = el<HTMLInputElement>('contact');
  const niche = el<HTMLSelectElement>('niche');
  const comment = el<HTMLTextAreaElement>('comment');
  const example = el<HTMLInputElement>('example');
  const service = el<HTMLInputElement>('service');
  const consent = el<HTMLInputElement>('consent');

  /* ---------- Prefill from "I want one like this" / service cards / URL ---------- */
  const prefill = (detail: { niche?: string; example?: string; service?: string }) => {
    if (detail.niche && Array.from(niche.options).some((o) => o.value === detail.niche)) niche.value = detail.niche;
    example.value = detail.example ?? '';
    service.value = detail.service ?? '';
    const what = detail.example || detail.service;
    picked.hidden = !what;
    picked.textContent = what ? `${cfg.picked}: ${what}` : '';
    // Focus the first empty field without scrolling (the page already scrolls to the form).
    window.setTimeout(() => (name.value ? contact : name).focus({ preventScroll: true }), 500);
  };
  window.addEventListener('lead:prefill', (e) => prefill((e as CustomEvent).detail ?? {}));
  const params = new URLSearchParams(location.search);
  if (params.has('niche') || params.has('example')) {
    prefill({ niche: params.get('niche') ?? undefined, example: params.get('example') ?? undefined });
  }

  /* ---------- Validation ---------- */
  const setError = (input: HTMLInputElement, message: string | null) => {
    const box = document.getElementById(`${input.id}-err`);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (box) {
      box.hidden = !message;
      box.textContent = message ?? '';
    }
  };
  const validContact = (v: string) => v.replace(/\D/g, '').length >= PHONE_DIGITS || USERNAME.test(v.trim());
  const validate = () => {
    const checks: [HTMLInputElement, boolean, string][] = [
      [name, name.value.trim().length >= 2, cfg.errors.name],
      [contact, validContact(contact.value), cfg.errors.contact],
      [consent, consent.checked, cfg.errors.consent],
    ];
    let first: HTMLInputElement | null = null;
    for (const [input, ok, msg] of checks) {
      setError(input, ok ? null : msg);
      if (!ok && !first) first = input;
    }
    first?.focus();
    return !first;
  };
  // Clear an error as soon as the field becomes valid.
  name.addEventListener('input', () => name.getAttribute('aria-invalid') === 'true' && name.value.trim().length >= 2 && setError(name, null));
  contact.addEventListener('input', () => contact.getAttribute('aria-invalid') === 'true' && validContact(contact.value) && setError(contact, null));
  consent.addEventListener('change', () => consent.checked && setError(consent, null));

  /* ---------- Submit ---------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.textContent = '';
    if (!validate()) return;
    const submitter = (e as SubmitEvent).submitter as HTMLButtonElement | null;
    const channel = (submitter?.value === 'whatsapp' ? 'whatsapp' : 'telegram') as Channel;
    const lead = {
      name: name.value.trim(),
      contact: contact.value.trim(),
      niche: niche.value ? niche.selectedOptions[0].textContent?.trim() : undefined,
      comment: comment.value.trim() || undefined,
      example: example.value || undefined,
      service: service.value || undefined,
      locale: cfg.locale,
      page: location.pathname,
    };
    const text = formatLead(lead, cfg.labels);
    // send() opens the messenger synchronously, inside this click, so pop-up blockers allow it.
    getSender()
      .send(lead, channel, text)
      .then((res) => {
        status.textContent = res.copied ? cfg.copied : cfg.opened;
      })
      .catch(() => {
        status.textContent = cfg.opened;
      });
  });
}

import { useSetting } from '../stores/settingsStore.js';

// The digits a wa.me link needs. A Ghana number typed the local way in
// Admin → Settings ("024 123 4567") becomes 233241234567; wa.me rejects the
// leading 0. Mirrors backend/src/utils/phone.js.
export function whatsappDigits(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (/^0\d{9}$/.test(d)) return `233${d.slice(1)}`;
  if (/^\d{9}$/.test(d)) return `233${d}`;
  return d;
}

// The store's WhatsApp chat link with a message filled in, or null when no
// number is set (then nothing WhatsApp-related should show).
export function useWhatsAppLink(text) {
  return useWhatsApp(text)?.href ?? null;
}

// { href, number } for showing the number itself ("+233 24 123 4567"), or
// null when none is set in Admin → Settings.
export function useWhatsApp(text) {
  const digits = whatsappDigits(useSetting('support_whatsapp', ''));
  if (digits.length < 9) return null;
  const number = /^233\d{9}$/.test(digits)
    ? `+233 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
    : `+${digits}`;
  return { href: `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`, number };
}

const KEY = 'urbanpulse-cookie-consent';
const DEFAULTS = { essential: true, functional: false, analytics: false, marketing: false, granted_at: null };

export const COOKIE_CONSENT_KEY = KEY;

// null = not yet responded (banner should show)
export function readConsent() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

export function writeConsent(partial) {
  const next = {
    ...DEFAULTS,
    ...(readConsent() ?? {}),
    ...partial,
    essential: true,
    granted_at: new Date().toISOString(),
  };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}

const KEY = 'urbanpulse-cookie-consent';
const DEFAULTS = { essential: true, functional: false, analytics: false, marketing: false, granted_at: null, user_id: null };

export const COOKIE_CONSENT_KEY = KEY;

// null = this browser has no answer on record
export function readConsent() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

// `userId` records whose answer this is, so on a shared computer one person's
// answer isn't taken as the next person's. `grantedAt` lets an answer adopted
// from the account keep its original date.
export function writeConsent(partial, { userId, grantedAt } = {}) {
  const prev = readConsent() ?? {};
  const next = {
    ...DEFAULTS,
    ...prev,
    ...partial,
    essential: true,
    granted_at: grantedAt ?? new Date().toISOString(),
    user_id: userId !== undefined ? userId : (prev.user_id ?? null),
  };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}

// Whether this browser's saved answer can stand for `userId`. An answer with no
// owner predates per-account consent (or was made signed out on this browser),
// so it's adopted by whoever signs in next rather than asking them again.
export function answerBelongsTo(local, userId) {
  return !!local && (local.user_id == null || local.user_id === userId);
}

const LS_KEY = 'urbanpulse-ref-code';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function storeRefCode(code) {
  if (!code) return;
  localStorage.setItem(LS_KEY, JSON.stringify({
    code: code.toUpperCase().trim(),
    expires: Date.now() + TTL_MS,
  }));
}

export function getStoredRefCode() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const { code, expires } = JSON.parse(raw);
    if (Date.now() > expires) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

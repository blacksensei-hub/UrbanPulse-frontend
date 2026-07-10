const KEY = 'urbanpulse-has-session';

// Pure client-side hint for whether it's worth checking auth on boot — never a
// security decision, the httpOnly cookies remain the sole source of truth.
export const hasSessionHint = () => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};

export const setSessionHint = () => {
  try { localStorage.setItem(KEY, '1'); } catch {}
};

export const clearSessionHint = () => {
  try { localStorage.removeItem(KEY); } catch {}
};

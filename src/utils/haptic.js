export function vibrate(pattern) {
  try {
    if (!navigator.vibrate) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    navigator.vibrate(pattern);
  } catch {}
}

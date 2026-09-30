// Anonymous page-view counting. The server keeps a daily count per page,
// traffic source and device type, and nothing about the visitor: no cookies,
// nothing stored on the device, no IP address, no user id. It exists so you
// can see which posts and links bring people to the store.
//
// Signed-in shoppers who rejected analytics cookies are not counted at all.

const ENDPOINT = `${import.meta.env.VITE_API_URL || '/api'}/stats/hit`;
let landed = false;   // the first page of this visit (per page load, not stored)

function deviceType() {
  const w = window.innerWidth;
  return w < 640 ? 'phone' : w < 1024 ? 'tablet' : 'desktop';
}

export function recordPageView(pathname, { optedOut = false } = {}) {
  if (optedOut || pathname.startsWith('/admin')) return;
  const landing = !landed;
  landed = true;
  const q = landing ? new URLSearchParams(window.location.search) : null;
  const body = JSON.stringify({
    path: pathname,
    landing,
    ref: landing ? document.referrer : '',
    utm_source: q?.get('utm_source') || undefined,
    utm_medium: q?.get('utm_medium') || undefined,
    utm_campaign: q?.get('utm_campaign') || undefined,
    device: deviceType(),
  });
  try {
    const sent = navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }));
    if (!sent) fetch(ENDPOINT, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
  } catch {
    // Counting is best-effort; it must never affect the page.
  }
}

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORAGE_KEY = 'urbanpulse-scroll-positions';
const RESTORE_WINDOW_MS = 1500;

function readPositions() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function persist(key, y) {
  try {
    const positions = readPositions();
    positions[key] = y;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // sessionStorage unavailable (private mode etc) · restoration just no-ops
  }
}

let restoreRaf = null;
// Last offset seen by a scroll event. Read instead of window.scrollY at swap
// time, when the new (possibly shorter) page may already have clamped it.
let lastY = 0;

function cancelRestore() {
  if (restoreRaf != null) cancelAnimationFrame(restoreRaf);
  restoreRaf = null;
}

function scrollToTarget(target) {
  cancelRestore();

  // Instant, always. A smooth scroll across a page swap reads as the new page
  // sliding in from somewhere it never was.
  window.scrollTo({ top: target, behavior: 'instant' });
  if (target === 0) return;

  const started = performance.now();
  const step = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (Math.abs(window.scrollY - target) <= 1 || performance.now() - started > RESTORE_WINDOW_MS) {
      restoreRaf = null;
      return;
    }
    if (max >= target || max > window.scrollY) window.scrollTo({ top: Math.min(target, max), behavior: 'instant' });
    restoreRaf = requestAnimationFrame(step);
  };
  restoreRaf = requestAnimationFrame(step);
}

// React Router gives every fresh page load the same key, "default", so keying
// on it alone let a reload restore a different page's offset (shop opening at
// its footer because the homepage had been scrolled). Scope it by path.
function entryKey(location) {
  return location.key === 'default' ? `default:${location.pathname}` : location.key;
}

function isReloadOrHistoryLoad() {
  try {
    const type = performance.getEntriesByType('navigation')[0]?.type;
    return type === 'reload' || type === 'back_forward';
  } catch {
    return false;
  }
}

// Scrolls to top on forward navigation, restores the prior position on
// browser back/forward, matching native browser scroll-restoration behavior.
export default function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    // The user taking over wins over an in-progress restore.
    const stop = () => cancelRestore();
    const track = () => { lastY = window.scrollY; };
    lastY = window.scrollY;
    window.addEventListener('scroll', track, { passive: true });
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop);
    return () => {
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
      window.removeEventListener('scroll', track);
    };
  }, []);

  // Save the outgoing entry's offset on tab close/refresh too.
  useEffect(() => {
    const key = entryKey(location);
    const onHide = () => persist(key, window.scrollY);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [location.key, location.pathname]);

  // Before paint, so the new page never flashes at the old page's offset.
  const prevKey = useRef(null);
  useLayoutEffect(() => {
    const key = entryKey(location);
    const isFirstRender = prevKey.current === null;
    if (!isFirstRender && prevKey.current !== key) persist(prevKey.current, lastY);
    prevKey.current = key;

    // The first render is also a POP. Only a reload or a browser back/forward
    // into the site restores; a typed or followed link starts at the top.
    const mayRestore = navigationType === 'POP' && (!isFirstRender || isReloadOrHistoryLoad());
    const saved = readPositions()[key];
    scrollToTarget(mayRestore && saved != null ? saved : 0);
  }, [location.key, location.pathname, navigationType]);

  return null;
}

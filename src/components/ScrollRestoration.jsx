import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

import { prefersReducedMotion } from '../utils/motion.js';

const STORAGE_KEY = 'urbanpulse-scroll-positions';

function readPositions() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function savePosition(key, y) {
  try {
    const positions = readPositions();
    positions[key] = y;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // sessionStorage unavailable (private mode etc) — scroll restoration just no-ops
  }
}

// Scrolls to top on forward navigation, restores the prior position on
// browser back/forward, matching native browser scroll-restoration behavior.
export default function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const key = location.key;
    const onScroll = () => savePosition(key, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.key]);

  useEffect(() => {
    const saved = readPositions()[location.key];
    if (navigationType === 'POP' && saved != null) {
      window.scrollTo({ top: saved, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }, [location.key, navigationType]);

  return null;
}

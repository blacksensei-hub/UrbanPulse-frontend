import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLoadingStore } from '../../stores/loadingStore.js';

// Below this, scrollY > this is required before the bar can show — never any
// bar while sitting at the top, which alone eliminates the frozen-on-load symptom.
const HIDE_THRESHOLD_PX = 64;
// Below this range, the page isn't meaningfully scrollable — progress stays 0
// instead of dividing by a near-zero/negative max (NaN or a stale fraction).
const MIN_SCROLLABLE_PX = 60;

export default function ScrollProgress() {
  const prefersReduced = useReducedMotion();
  const routeBarActive = useLoadingStore((s) => s.active);
  const [{ progress, scrollY, scrollable }, setMeasurement] = useState({
    progress: 0,
    scrollY: 0,
    scrollable: false,
  });
  const rafRef = useRef(null);

  useEffect(() => {
    function update() {
      rafRef.current = null;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const isScrollable = max > MIN_SCROLLABLE_PX;
      setMeasurement({
        progress: isScrollable ? Math.min(1, Math.max(0, window.scrollY / max)) : 0,
        scrollY: window.scrollY,
        scrollable: isScrollable,
      });
    }

    function onScrollOrResize() {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(update);
    }

    update(); // initial measurement — correct before any listener fires

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    const ro = new ResizeObserver(onScrollOrResize);
    ro.observe(document.body);

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      ro.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const shown = scrollable && progress > 0 && scrollY > HIDE_THRESHOLD_PX && !routeBarActive;

  return (
    <motion.div
      aria-hidden="true"
      animate={{ opacity: shown ? 1 : 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.15 }}
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: 0,
        right: 0,
        height: 3,
        background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-hover))',
        borderRadius: '0 2px 2px 0',
        // Glow implies motion energy — skipped under reduced motion.
        ...(prefersReduced ? {} : {
          boxShadow: '0 0 8px color-mix(in srgb, var(--color-accent) var(--progress-glow), transparent)',
        }),
        zIndex: 149,
        transformOrigin: '0%',
        scaleX: progress,
        pointerEvents: 'none',
      }}
    />
  );
}

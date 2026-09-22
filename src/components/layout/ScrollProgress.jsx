import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { useLoadingStore } from '../../stores/loadingStore.js';

// Never any bar while sitting at the top, which alone eliminates the
// frozen-on-load symptom.
const HIDE_THRESHOLD_PX = 64;
// Below this range the page isn't meaningfully scrollable · progress stays 0
// instead of dividing by a near-zero/negative max.
const MIN_SCROLLABLE_PX = 60;

// Driven entirely by motion values: scrolling never re-renders React, and the
// bar is a single composited transform. The spring smooths wheel steps so the
// fill glides instead of jumping in 100px notches.
export default function ScrollProgress() {
  const prefersReduced = useReducedMotion();
  const routeBarActive = useLoadingStore((s) => s.active);
  const routeRef = useRef(routeBarActive);
  const raw = useMotionValue(0);
  const visible = useMotionValue(0);
  const smooth = useSpring(raw, { stiffness: 260, damping: 40, restDelta: 0.0005 });
  const scaleX = prefersReduced ? raw : smooth;
  const opacity = useSpring(visible, { stiffness: 400, damping: 40 });

  useEffect(() => {
    let frame = null;
    function update() {
      frame = null;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      const scrollable = max > MIN_SCROLLABLE_PX;
      raw.set(scrollable ? Math.min(1, Math.max(0, y / max)) : 0);
      visible.set(scrollable && y > HIDE_THRESHOLD_PX && !routeRef.current ? 1 : 0);
    }
    const schedule = () => { if (frame == null) frame = requestAnimationFrame(update); };

    update();
    // A new page starts empty: jump rather than spring back down from 100%.
    raw.jump?.(raw.get()); smooth.jump?.(raw.get());

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro.disconnect();
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, [raw, smooth, visible]);

  // The route bar owns the top edge while a navigation is in flight.
  useEffect(() => {
    routeRef.current = routeBarActive;
    if (routeBarActive) visible.set(0);
    else window.dispatchEvent(new Event('scroll'));
  }, [routeBarActive, visible]);

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: 0,
        right: 0,
        height: 3,
        background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-hover))',
        ...(prefersReduced ? {} : {
          boxShadow: '0 0 8px color-mix(in srgb, var(--color-accent) var(--progress-glow), transparent)',
        }),
        zIndex: 149,
        transformOrigin: '0% 50%',
        scaleX,
        opacity,
        willChange: 'transform',
        pointerEvents: 'none',
      }}
    />
  );
}

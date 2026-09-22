import { useEffect, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { useLoadingStore } from '../../stores/loadingStore.js';

const COMPLETE_MS = 200;
const FADE_MS = 220;
const GLOW = '0 0 8px color-mix(in srgb, var(--color-accent) var(--progress-glow), transparent)';
const FILL_GRADIENT = 'linear-gradient(90deg, var(--color-accent), var(--color-accent-hover))';

// A trickle, not a loop: the fill only ever moves forward. It races to ~30%,
// then creeps toward 90% without reaching it, and on completion fills the
// rest and fades. The old sweep jumped backwards to 0% before filling, which
// read as a glitch on every navigation.
export default function LoadingBar() {
  const visible = useLoadingStore((s) => s.visible);
  const prefersReduced = useReducedMotion();
  const [phase, setPhase] = useState('idle'); // idle | active | completing
  const scaleX = useMotionValue(0);
  const opacity = useMotionValue(0);

  useEffect(() => {
    if (visible) { setPhase('active'); return; }
    setPhase((p) => (p === 'active' ? 'completing' : p));
  }, [visible]);

  useEffect(() => {
    const controls = [];
    if (phase === 'active') {
      scaleX.jump(0);
      opacity.jump(1);
      if (prefersReduced) { scaleX.jump(0.9); return; }
      controls.push(animate(scaleX, [0, 0.3], { duration: 0.35, ease: [0.16, 1, 0.3, 1] }));
      const creep = setTimeout(() => {
        controls.push(animate(scaleX, 0.9, { duration: 8, ease: [0.05, 0.7, 0.1, 1] }));
      }, 350);
      return () => { clearTimeout(creep); controls.forEach((c) => c.stop()); };
    }
    if (phase === 'completing') {
      const fill = prefersReduced ? 0 : COMPLETE_MS / 1000;
      const fade = prefersReduced ? 0 : FADE_MS / 1000;
      controls.push(animate(scaleX, 1, { duration: fill, ease: 'easeOut' }));
      controls.push(animate(opacity, 0, { duration: fade, delay: fill, ease: 'easeOut',
        onComplete: () => setPhase('idle') }));
      return () => controls.forEach((c) => c.stop());
    }
  }, [phase, prefersReduced, scaleX, opacity]);

  if (phase === 'idle') return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: 0,
        right: 0,
        height: 3,
        zIndex: 200,
        pointerEvents: 'none',
        opacity,
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background: FILL_GRADIENT,
          boxShadow: prefersReduced ? 'none' : GLOW,
          transformOrigin: '0% 50%',
          scaleX,
          willChange: 'transform',
        }}
      />
    </motion.div>
  );
}

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLoadingStore } from '../../stores/loadingStore.js';

const COMPLETE_MS = 150;
const FADE_MS = 250;

// Soft-faded segment edges — a comet, not a brick. Applied only during the
// active sweep; the completion flash needs solid edges to read as a whole line.
const COMET_MASK = 'linear-gradient(90deg, transparent, black 15%, black 85%, transparent)';
const GLOW = '0 0 8px color-mix(in srgb, var(--color-accent) var(--progress-glow), transparent)';
const FILL_GRADIENT = 'linear-gradient(90deg, var(--color-accent), var(--color-accent-hover))';

export default function LoadingBar() {
  const visible = useLoadingStore((s) => s.visible);
  const prefersReduced = useReducedMotion();
  const [phase, setPhase] = useState('idle'); // idle | active | completing

  useEffect(() => {
    if (visible) {
      setPhase('active');
      return;
    }
    // visible just went false — only run the completion step if the bar was showing.
    setPhase((p) => (p === 'active' ? 'completing' : 'idle'));
  }, [visible]);

  useEffect(() => {
    if (phase !== 'completing') return;
    const t = setTimeout(() => setPhase('idle'), prefersReduced ? 0 : COMPLETE_MS);
    return () => clearTimeout(t);
  }, [phase, prefersReduced]);

  const show = phase === 'active' || phase === 'completing';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="loading-bar"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: prefersReduced ? 0 : FADE_MS / 1000 } }}
          style={{
            position: 'fixed',
            top: 'env(safe-area-inset-top, 0px)',
            left: 0,
            right: 0,
            height: 3,
            background: 'color-mix(in srgb, var(--color-accent) 20%, transparent)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          {prefersReduced ? (
            // Static bar, no glow/mask — glow implies motion energy.
            <div style={{ position: 'absolute', inset: 0, background: FILL_GRADIENT }} />
          ) : (
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '25%',
                background: FILL_GRADIENT,
                borderRadius: '0 2px 2px 0',
                boxShadow: GLOW,
                ...(phase === 'active'
                  ? { maskImage: COMET_MASK, WebkitMaskImage: COMET_MASK }
                  : {}),
              }}
              animate={
                phase === 'completing'
                  ? { x: '0%', width: '100%', transition: { duration: COMPLETE_MS / 1000, ease: 'easeOut' } }
                  : {
                      // Fixed-width segment translating across the track (not a width
                      // oscillation) — percentages are relative to the segment's own
                      // width, so -100%/400% sweeps the 25%-wide segment from fully
                      // off-screen left to fully past the right edge of the container.
                      x: ['-100%', '400%'],
                      transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
                    }
              }
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

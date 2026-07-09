import { useScroll, useSpring, motion, useReducedMotion } from 'framer-motion';

export default function ScrollProgress() {
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: prefersReduced ? 1000 : 120,
    damping: prefersReduced ? 100 : 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{
        scaleX,
        transformOrigin: '0%',
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: 0,
        right: 0,
        height: 2,
        background: 'var(--color-accent)',
        zIndex: 149,
      }}
    />
  );
}

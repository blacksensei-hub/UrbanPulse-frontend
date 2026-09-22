import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useLoadingStore } from '../../stores/loadingStore.js';

const ENTER_S = 0.28;

// Enter-only. The previous AnimatePresence mode="wait" swap could stall after
// the old page faded out: the new page never mounted, the screen stayed blank
// and the route bar hung until its 15s safety timeout. Nothing is ever held
// back waiting on an exit animation now.
//
// Opacity only, never transform: a transformed <main> becomes the containing
// block for every position:fixed descendant, which breaks sticky and fixed UI.
export default function PageTransition({ className, id, children }) {
  const { pathname } = useLocation();
  const done = useLoadingStore((s) => s.done);
  const reduced = useReducedMotion();

  // The route bar completes when the new page has faded in. A timer rather than
  // onAnimationComplete, which does not fire when an animation is skipped.
  useEffect(() => {
    const t = setTimeout(done, reduced ? 0 : ENTER_S * 1000);
    return () => clearTimeout(t);
  }, [pathname, done, reduced]);

  return (
    <motion.main
      key={pathname}
      id={id}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: ENTER_S, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.main>
  );
}

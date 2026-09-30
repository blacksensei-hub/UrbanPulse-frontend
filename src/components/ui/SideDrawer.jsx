import { useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useSwipe } from '../../hooks/useSwipe.js';
import { decide } from '../../lib/gesture.js';
import { spring, springFlick } from '../../lib/motion.js';
import { cn } from '../../utils/format.js';

/**
 * A panel that slides in from the right edge (cart, menu). It leaves the way
 * it came, including when it's thrown: swipe it right and it follows the
 * finger 1:1, the page behind brightens with it, and on release it either
 * carries the throw's speed out or springs back. Pulling it left past open
 * rubber-bands. A thick material, since it's a large surface.
 */
function Panel({ x, widthRef, reduced, onClose, label, className, zIndex, children }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const w = ref.current?.offsetWidth || window.innerWidth;
    widthRef.current = w;
    // jump(), not set(): placing it with set() right before animating would
    // hand the spring a huge phantom velocity.
    if (reduced) { x.jump(0); return undefined; }
    x.jump(w);
    const a = animate(x, 0, spring);
    return () => a.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const swipe = useSwipe({
    axis: 'x',
    value: x,
    min: 0,
    dimension: 240,
    enabled: !reduced,
    commitDirection: 1,
    onRelease: ({ projected, velocity }) => {
      const w = widthRef.current;
      if (decide({ projected, velocity, threshold: w / 2, direction: 1 })) {
        animate(x, w, { ...springFlick, velocity }).then(onClose);
      } else {
        animate(x, 0, { ...springFlick, velocity });
      }
    },
  });

  return (
    <motion.aside
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      {...swipe}
      style={{ ...swipe.style, x, zIndex }}
      initial={reduced ? { opacity: 0 } : false}
      animate={reduced ? { opacity: 1 } : undefined}
      exit={reduced ? { opacity: 0 } : { x: widthRef.current, transition: spring }}
      className={cn('material-thick fixed right-0 top-0 flex h-full flex-col border-l border-border/60', className)}
    >
      {children}
    </motion.aside>
  );
}

export default function SideDrawer({ open, onClose, label, className, zIndex = 100, children }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const widthRef = useRef(480);
  const scrim = useTransform(x, (v) => {
    const px = typeof v === 'number' ? v : (parseFloat(v) / 100) * widthRef.current;
    return Math.max(0, Math.min(1, 1 - px / widthRef.current));
  });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          className="fixed inset-0"
          style={{ zIndex: zIndex - 10 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div className="sheet-scrim absolute inset-0 backdrop-blur-sm" style={{ opacity: scrim }} />
        </motion.div>
      )}
      {open && (
        <Panel key="panel" x={x} widthRef={widthRef} reduced={reduced} onClose={onClose}
          label={label} className={className} zIndex={zIndex}>
          {children}
        </Panel>
      )}
    </AnimatePresence>
  );
}

import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { cn } from './format.js';
import { prefersReducedMotion } from './motion.js';

// Shows a brief "X. Undo" toast instead of a confirm dialog for reversible
// destructive actions (remove from cart, remove from wishlist, etc).
export function showUndoToast({ message, onUndo }) {
  const reducedMotion = prefersReducedMotion();

  toast.custom(
    (t) => (
      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { y: 16, opacity: 0 }}
        className={cn(
          'glass-strong flex items-center gap-3 border border-border rounded-xl shadow-elevated px-4 py-3',
          !t.visible && 'opacity-0',
        )}
      >
        <p className="text-xs text-text">{message}</p>
        <button
          type="button"
          onClick={() => {
            toast.dismiss(t.id);
            onUndo?.();
          }}
          className="text-xs font-semibold text-accent shrink-0 hover:text-accent-hover"
        >
          Undo
        </button>
      </motion.div>
    ),
    { duration: 4000, position: 'bottom-center' },
  );
}

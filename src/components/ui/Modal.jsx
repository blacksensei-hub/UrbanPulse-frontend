import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { scalePop } from '../../lib/motion.js';

export default function Modal({ open, onClose, title, children, maxWidth = '480px' }) {
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 glass-strong"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog" aria-modal="true"
        >
          <motion.div
            variants={scalePop}
            initial="initial" animate="animate" exit="exit"
            drag={prefersReduced ? false : 'y'}
            dragConstraints={{ top: 0 }}
            dragElastic={0.35}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80) onClose?.();
            }}
            className="relative bg-surface border border-border rounded-xl p-6 w-full shadow-elevated"
            style={{ maxWidth }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 font-display">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full hover:bg-border flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

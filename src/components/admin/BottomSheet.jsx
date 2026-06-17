import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { bottomSheetVariants, spring } from '../../lib/motion.js';

export default function BottomSheet({ open, onClose, title, children }) {
  const prefersReduced = useReducedMotion();

  const sheetVariants = prefersReduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : bottomSheetVariants;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40"
          />
          <motion.div
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            drag={prefersReduced ? false : 'y'}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80) onClose();
            }}
            className="fixed bottom-0 inset-x-0 z-50 glass-strong border-t border-border rounded-t-2xl"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            {title && (
              <div className="px-5 pb-3 pt-1 border-b border-border">
                <h3 className="font-display text-base font-semibold">{title}</h3>
              </div>
            )}

            <div className="max-h-[65vh] overflow-y-auto p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

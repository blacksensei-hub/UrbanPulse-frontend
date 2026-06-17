import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

export default function BulkSelectionBar({ count, actions = [], onClear }) {
  const prefersReduced = useReducedMotion();

  const desktopVariants = prefersReduced
    ? {}
    : { initial: { y: -12, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -12, opacity: 0 } };

  const mobileVariants = prefersReduced
    ? {}
    : { initial: { y: 64, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 64, opacity: 0 } };

  const transition = { type: 'spring', stiffness: 380, damping: 32 };

  return (
    <AnimatePresence>
      {count > 0 && (
        <>
          {/* Desktop bar — sticky inside content flow */}
          <motion.div
            key="bulk-bar-desktop"
            {...desktopVariants}
            transition={transition}
            role="toolbar"
            aria-label={`Bulk actions for ${count} selected item${count !== 1 ? 's' : ''}`}
            className="hidden md:flex items-center gap-3 sticky top-0 z-20 bg-surface border-b border-border px-5 py-2.5 -mx-1 mb-2"
          >
            <span className="text-sm font-semibold tabular-nums shrink-0">
              {count} selected
            </span>
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  aria-label={a.label}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    a.destructive
                      ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                      : 'text-text hover:bg-highlight'
                  }`}
                >
                  {a.icon && <a.icon size={14} />}
                  {a.label}
                </button>
              ))}
            </div>
            <button
              onClick={onClear}
              aria-label="Clear selection"
              className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-text transition-colors"
            >
              <X size={14} />
              Clear
            </button>
          </motion.div>

          {/* Mobile bar — fixed bottom */}
          <motion.div
            key="bulk-bar-mobile"
            {...mobileVariants}
            transition={transition}
            role="toolbar"
            aria-label={`Bulk actions for ${count} selected item${count !== 1 ? 's' : ''}`}
            className="md:hidden fixed bottom-0 inset-x-0 z-30 glass-strong border-t border-border px-4 pt-3 flex items-center gap-3"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <span className="text-sm font-semibold tabular-nums shrink-0">{count}</span>
            <div className="flex items-center gap-1 flex-1 flex-wrap">
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  aria-label={a.label}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    a.destructive
                      ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                      : 'text-text hover:bg-highlight'
                  }`}
                >
                  {a.icon && <a.icon size={14} />}
                  <span className="hidden sm:inline">{a.label}</span>
                </button>
              ))}
            </div>
            <button onClick={onClear} aria-label="Clear selection" className="text-muted hover:text-text">
              <X size={18} />
            </button>
          </motion.div>

          {/* Mobile spacer so table content isn't hidden behind fixed bar */}
          <div className="md:hidden h-14" aria-hidden="true" />
        </>
      )}
    </AnimatePresence>
  );
}

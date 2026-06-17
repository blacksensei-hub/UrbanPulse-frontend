import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useAdminTheme } from '../../lib/AdminThemeContext.jsx';

export default function AdminThemeToggle({ className = '' }) {
  const { adminTheme, toggleAdminTheme, isAdminDark } = useAdminTheme();
  const prefersReduced = useReducedMotion();

  const iconVariants = prefersReduced
    ? {}
    : {
        initial: (dir) => ({ rotate: dir * -180, opacity: 0, scale: 0.6 }),
        animate: { rotate: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
        exit:    (dir) => ({ rotate: dir * 180, opacity: 0, scale: 0.6, transition: { duration: 0.15 } }),
      };

  return (
    <motion.button
      type="button"
      onClick={toggleAdminTheme}
      whileHover={prefersReduced ? {} : { scale: 1.06 }}
      whileTap={prefersReduced ? {} : { scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      aria-label={`Switch to ${isAdminDark ? 'light' : 'dark'} admin theme`}
      title={`Switch to ${isAdminDark ? 'light' : 'dark'} mode`}
      className={`relative inline-flex items-center justify-center w-10 h-10 rounded-md border border-border bg-surface text-text overflow-hidden transition-colors hover:bg-highlight ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isAdminDark ? (
          <motion.span
            key="moon"
            custom={1}
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex"
          >
            <Moon size={16} strokeWidth={2} />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            custom={-1}
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex"
          >
            <Sun size={16} strokeWidth={2} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

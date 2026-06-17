import { AnimatePresence, motion } from 'framer-motion';
import { useLoadingStore } from '../../stores/loadingStore.js';

export default function LoadingBar() {
  const active = useLoadingStore(s => s.active);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="loading-bar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.1 } }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'color-mix(in srgb, var(--color-accent) 20%, transparent)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '30%',
              background: 'var(--color-accent)',
              borderRadius: '0 2px 2px 0',
            }}
            animate={{ x: ['-100%', '433%'] }}
            transition={{ repeat: Infinity, duration: 1.3, ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

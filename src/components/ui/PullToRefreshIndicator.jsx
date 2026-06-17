import { motion, useReducedMotion } from 'framer-motion';

const R = 16;
const C = 2 * Math.PI * R;

export default function PullToRefreshIndicator({ pulling, pullProgress, refreshing }) {
  const prefersReduced = useReducedMotion();
  if (!pulling && !refreshing) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center pt-3 pointer-events-none">
      <div className="h-10 w-10 rounded-full glass-strong border border-border flex items-center justify-center shadow-float">
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
          <circle cx="17" cy="17" r={R} stroke="var(--color-border)" strokeWidth="2" />
          <motion.circle
            cx="17" cy="17" r={R}
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={refreshing ? 0 : C * (1 - pullProgress)}
            transform="rotate(-90 17 17)"
            animate={refreshing && !prefersReduced ? { rotate: [0, 360] } : {}}
            transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : {}}
            style={{ transformOrigin: '17px 17px' }}
          />
          {refreshing && prefersReduced && (
            <circle cx="17" cy="17" r="3" fill="var(--color-accent)" />
          )}
        </svg>
      </div>
    </div>
  );
}

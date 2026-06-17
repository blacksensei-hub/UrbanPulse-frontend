import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { FREE_SHIPPING_THRESHOLD } from '../../utils/constants.js';
import { formatCurrency } from '../../utils/format.js';

export default function FreeShippingBar({ subtotal }) {
  const prefersReduced = useReducedMotion();
  const pct = Math.min(100, (Number(subtotal) / FREE_SHIPPING_THRESHOLD) * 100);
  const unlocked = Number(subtotal) >= FREE_SHIPPING_THRESHOLD;
  const remaining = FREE_SHIPPING_THRESHOLD - Number(subtotal);

  return (
    <div className="mb-3">
      {unlocked ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-success mb-1.5">
          <Check className="h-3.5 w-3.5 flex-shrink-0" />
          You&apos;ve unlocked free shipping
        </p>
      ) : (
        <p className="text-xs text-muted mb-1.5">
          Add <span className="font-semibold text-text">{formatCurrency(remaining)}</span> more for free shipping
        </p>
      )}
      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={prefersReduced ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 26 }}
        />
      </div>
    </div>
  );
}

import { useId, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { springSnappy } from '../../lib/motion.js';
import { cn } from '../../utils/format.js';

/**
 * An iOS-style segmented control: a recessed track with a raised thumb that
 * slides to the chosen segment (critically damped, no overshoot). It is a
 * real tablist: arrow keys move between segments, Home/End jump to the ends.
 *
 * items: [{ id, label }]   value: id   onChange(id)
 * itemRef(id): optional ref callback per segment (e.g. to scroll to one).
 */
export default function SegmentedControl({ items, value, onChange, ariaLabel, itemRef, className }) {
  const reduced = useReducedMotion();
  const thumbId = useId();
  const refs = useRef({});

  function onKeyDown(e) {
    const i = items.findIndex((it) => it.id === value);
    const next = {
      ArrowRight: (i + 1) % items.length,
      ArrowLeft: (i - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(items[next].id);
    refs.current[items[next].id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn('segmented relative inline-flex w-full max-w-md rounded-full p-1 sm:w-auto', className)}
    >
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            ref={(el) => { refs.current[it.id] = el; itemRef?.(it.id)?.(el); }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(it.id)}
            className={cn(
              'press relative flex-1 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold tracking-[0.005em] transition-colors sm:flex-none',
              active ? 'text-text' : 'text-muted hover:text-text',
            )}
          >
            {active && (
              <motion.span
                layoutId={reduced ? undefined : thumbId}
                transition={springSnappy}
                className="segmented-thumb absolute inset-0 rounded-full"
                aria-hidden="true"
              />
            )}
            <span className="relative">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

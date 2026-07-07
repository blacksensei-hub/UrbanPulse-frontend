import { forwardRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/format.js';

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  ...rest
}) {
  const prefersReduced = useReducedMotion();

  const variants = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    outline:   'btn-outline',
    ghost:     'btn-ghost',
    danger:    'btn-danger',
  };

  /* lg keeps the pill radius from .btn; md/sm/sm-dense override with rounded-md */
  const sizes = {
    'sm-dense': 'px-2.5 py-1.5 text-xs min-h-[30px] rounded-md',
    sm: 'px-3 py-2 text-sm min-h-[36px] rounded-md',
    md: 'rounded-md',
    lg: 'px-6 py-3.5 text-base',
  };

  const isDisabled = loading || rest.disabled;
  const isSolid = ['primary', 'secondary', 'danger'].includes(variant);

  return (
    <motion.button
      whileHover={prefersReduced || isDisabled ? {} : {
        scale: 1.02,
        ...(isSolid ? { boxShadow: '0 6px 16px rgba(0,0,0,0.12)' } : {}),
      }}
      whileTap={prefersReduced || isDisabled ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      disabled={isDisabled}
      className={cn(
        'btn',
        variants[variant],
        sizes[size],
        className,
        isDisabled && 'opacity-50 cursor-not-allowed',
      )}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </motion.button>
  );
}

const FloatingInput = forwardRef(function FloatingInput({ label, error, hint, className = '', ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  const filled = rest.value !== undefined ? String(rest.value).length > 0 : false;
  const lifted = focused || filled;

  return (
    <label className="relative block">
      <input
        ref={ref}
        {...rest}
        placeholder=""
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e)  => { setFocused(false); rest.onBlur?.(e); }}
        className={cn(
          'input w-full',
          label && 'pt-6 pb-2',
          focused && 'ring-2 ring-accent ring-offset-2',
          error && 'border-error',
          className,
        )}
      />
      {label && (
        <span
          className={cn(
            'absolute left-[13px] pointer-events-none transition-all duration-150 origin-top-left z-10',
            lifted
              ? 'top-2 text-[10px] font-semibold text-muted'
              : 'top-1/2 -translate-y-1/2 text-small text-muted',
          )}
          style={lifted ? { transform: 'scale(0.85)' } : {}}
        >
          {label}
        </span>
      )}
      {error && <span className="block text-small text-error mt-1">{error}</span>}
      {!error && hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
});

export const Input = forwardRef(function Input({ label, error, hint, className = '', floating = false, ...rest }, ref) {
  if (floating) {
    return <FloatingInput ref={ref} label={label} error={error} hint={hint} className={className} {...rest} />;
  }
  return (
    <label className="block">
      {label && <span className="block text-small font-medium mb-1.5">{label}</span>}
      <input ref={ref} className={cn('input', error && 'border-error', className)} {...rest} />
      {error && <span className="block text-small text-error mt-1">{error}</span>}
      {!error && hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
});

export function Card({ className = '', children, ...rest }) {
  return <div className={cn('card p-5 md:p-6', className)} {...rest}>{children}</div>;
}

export function Badge({ variant = 'soft', children, className = '' }) {
  const v = variant === 'accent' ? 'badge-accent' : 'badge-soft';
  return <span className={cn('badge', v, className)}>{children}</span>;
}

export function Spinner({ size = 20 }) {
  return <Loader2 size={size} className="animate-spin text-muted" />;
}

export function Skeleton({ className = '' }) {
  return <div className={cn('skeleton', className)} />;
}

import { forwardRef } from 'react';
import { ArrowUpRight, ArrowRight, ArrowDown } from 'lucide-react';
import useReveal from '../../hooks/useReveal.js';

/**
 * The instrument layer.
 *
 * One vocabulary every page draws from, so the whole site reads as a
 * single object study rather than a set of templates: mono micro
 * labels, numbered indices, slash separators, hairline meta rows,
 * circular arrow actions, corner tags on imagery.
 *
 * Nothing here is page-specific. If a page needs a variation, it
 * passes className, it does not fork the component.
 */

/** A mono, uppercase, wide-tracked micro label. The system's smallest unit. */
export function Label({ as: As = 'span', className = '', children, ...rest }) {
  return (
    <As className={`label-mono ${className}`} {...rest}>
      {children}
    </As>
  );
}

/** A zero-padded index: 01, 02, 03. */
export function Index({ n, className = '' }) {
  const v = typeof n === 'number' ? String(n).padStart(2, '0') : n;
  return (
    <span aria-hidden className={`label-mono tabular-nums text-muted/80 ${className}`}>
      {v}
    </span>
  );
}

/** Slash-separated mono meta: OVER-EAR / WIRELESS. */
export function Slashes({ items = [], className = '' }) {
  return (
    <Label className={className}>
      {items.filter(Boolean).map((item, i) => (
        <span key={`${item}-${i}`}>
          {i > 0 && <span className="mx-1.5 text-muted/50">/</span>}
          {item}
        </span>
      ))}
    </Label>
  );
}

/**
 * The hairline meta row that opens a page or a chapter:
 * a dot, a label on the left, a label on the right, a rule beneath.
 */
export function MetaRow({ left, right, dot = true, rule = true, className = '' }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal ${className}`}>
      <div className="rv flex items-baseline justify-between gap-4 py-3">
        <Label className="flex items-center gap-2.5">
          {dot && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
          {left}
        </Label>
        {right && <Label className="hidden text-right text-muted/80 sm:block">{right}</Label>}
      </div>
      {rule && <span aria-hidden className="draw-rule block h-px w-full bg-border-strong/60" />}
    </div>
  );
}

/** The boxed index chip that sits in the corner of a hero image: M / 01. */
export function IndexChip({ mark = 'UP', n = '01', className = '' }) {
  return (
    <span
      aria-hidden
      className={`chip-plate grid place-items-center gap-0.5 px-3 py-2.5 text-center ${className}`}
    >
      <span className="label-mono leading-none">{mark}</span>
      <span aria-hidden className="my-0.5 block h-px w-4 bg-current opacity-40" />
      <span className="label-mono leading-none">{n}</span>
    </span>
  );
}

/** A small tag pinned to the corner of an image: ↗ OSU / ACCRA. */
export function CornerTag({ children, className = '' }) {
  return (
    <span className={`chip-plate inline-flex items-center gap-1.5 px-2.5 py-1.5 ${className}`}>
      <ArrowUpRight aria-hidden className="h-3 w-3" />
      <Label>{children}</Label>
    </span>
  );
}

/**
 * The circular arrow action. `dir` picks the arrow; `tone` picks fill
 * or outline. It is a span by default so it can sit inside a Link.
 */
export const CircleAction = forwardRef(function CircleAction(
  { dir = 'up-right', tone = 'outline', size = 'md', className = '', as: As = 'span', ...rest },
  ref
) {
  const Icon = dir === 'down' ? ArrowDown : dir === 'right' ? ArrowRight : ArrowUpRight;
  const sizes = { sm: 'h-9 w-9', md: 'h-12 w-12', lg: 'h-16 w-16' };
  const tones = {
    outline: 'border border-border-strong text-text hover:border-accent hover:text-accent-text',
    fill: 'bg-accent text-on-accent hover:bg-accent-hover',
    bone: 'bg-bone text-ink hover:bg-bone/90',
  };
  return (
    <As
      ref={ref}
      aria-hidden={As === 'span' ? 'true' : undefined}
      className={`circle-action grid shrink-0 place-items-center rounded-full transition-colors ${sizes[size]} ${tones[tone]} ${className}`}
      {...rest}
    >
      <Icon className="h-4 w-4 transition-transform duration-300" />
    </As>
  );
});

/**
 * A full-width mono statement band. The references use these as
 * breathing room between chapters, and they double as the rule that
 * stops two content sections sitting flush against each other.
 */
export function Statement({ children, className = '' }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal border-y border-border/70 py-8 md:py-12 ${className}`}>
      <p className="rv container-site label-mono text-center !text-[clamp(0.7rem,1.6vw,0.875rem)] leading-relaxed text-muted">
        {children}
      </p>
    </div>
  );
}

/**
 * The chapter head: a numbered mono kicker over a display headline.
 * `break` renders the second line, which the references always set on
 * its own line rather than letting it wrap.
 */
export function Chapter({ n, kicker, title, lead, className = '', align = 'left' }) {
  const ref = useReveal();
  const lines = Array.isArray(title) ? title : [title];
  return (
    <div
      ref={ref}
      className={`reveal ${align === 'center' ? 'mx-auto max-w-[52ch] text-center' : ''} ${className}`}
    >
      <Label className="rv block">
        {n != null && (
          <>
            <span className="tabular-nums">{String(n).padStart(2, '0')}</span>
            <span className="mx-2 text-muted/50">/</span>
          </>
        )}
        {kicker}
      </Label>
      <h2 className="rv mt-4 font-display text-h1 font-bold leading-[1.02] tracking-tight">
        {/* The visual break is a design choice; the sentence a screen
            reader hears must not carry it. */}
        <span className="sr-only">{lines.join(' ')}</span>
        <span aria-hidden="true">
          {lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
      </h2>
      {lead && <p className="rv mt-4 max-w-[46ch] text-sm leading-relaxed text-muted">{lead}</p>}
    </div>
  );
}

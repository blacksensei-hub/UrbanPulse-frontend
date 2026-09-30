import { useEffect, useLayoutEffect, useRef, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useSwipe } from '../../hooks/useSwipe.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { decide } from '../../lib/gesture.js';
import { spring, springFlick } from '../../lib/motion.js';
import { cn } from '../../utils/format.js';

const WIDTHS = { sm: '24rem', md: '28rem', lg: '32rem', xl: '36rem', 'max-w-lg': '32rem' };

/**
 * The site's one modal surface, presented the way Apple would on each device.
 *
 *  Phone  → a sheet that rises from the bottom edge, with a grabber. It
 *           follows the finger 1:1, rubber-bands if pulled up, and on
 *           release projects the throw: a flick or a drag past halfway
 *           closes it downward at the finger's speed, anything less springs
 *           it back. It leaves the way it came.
 *  Larger → a centred dialog that materializes (blur, scale and opacity
 *           arriving together) over a dimmed, blurred page. Not draggable:
 *           nobody expects to drag a dialog with a mouse.
 *
 * Reduced motion: a plain cross-fade, no swiping (the close button and
 * Escape still work).
 *
 * Same props as the old Modal, so every existing call site keeps working.
 */
export default function Sheet({
  open,
  onClose,
  title,
  children,
  maxWidth = '480px',
  presentation = 'auto',       // 'auto' | 'sheet' | 'dialog'
  bodyClassName,
}) {
  const reduced = useReducedMotion();
  const phone = useMediaQuery('(max-width: 639px)');
  const mode = presentation === 'auto' ? (phone ? 'sheet' : 'dialog') : presentation;
  const [mounted, setMounted] = useState(open);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const closedByGesture = useRef(false);
  const onScreen = useRef(false);   // true from first frame of entering to the end of leaving
  const titleId = useId();

  // Rendered into <body>, so it layers above the fixed navbar instead of being
  // trapped inside the page's stacking context (where the navbar covered the
  // grabber and took the touches). Admin screens scope their theme to a
  // wrapper, so the sheet carries that wrapper's theme class with it.
  const anchorRef = useRef(null);
  const [themeClass, setThemeClass] = useState('');
  useLayoutEffect(() => {
    const scoped = anchorRef.current?.closest('.admin-theme-light, .admin-theme-dark');
    setThemeClass(scoped ? (scoped.classList.contains('admin-theme-dark') ? 'admin-theme-dark' : 'admin-theme-light') : '');
  }, [mounted]);

  // Sheet: y is the panel's offset from fully open (0) down to its height.
  // Dialog/reduced motion: t runs 0 → 1 as it materializes.
  const y = useMotionValue(0);
  const t = useMotionValue(0);
  const height = useRef(600);
  const sheetScrim = useTransform(y, (v) => Math.max(0, Math.min(1, 1 - v / height.current)));
  const dialogScale = useTransform(t, [0, 1], [0.96, 1]);
  const dialogBlur = useTransform(t, (v) => `blur(${(1 - v) * 6}px)`);
  const scrimBlur = useTransform(t, (v) => `blur(${v * 16}px) saturate(${100 + v * 40}%)`);

  if (open && !mounted) setMounted(true);

  // Enter
  useLayoutEffect(() => {
    if (!open || !mounted) return;
    closedByGesture.current = false;
    // Reopened while still leaving: reverse from where it is on screen now,
    // never jump back to the start (Apple: animate from the presentation value).
    const resuming = onScreen.current;
    onScreen.current = true;
    if (!resuming) triggerRef.current = document.activeElement;
    if (mode === 'sheet' && !reduced) {
      height.current = panelRef.current?.offsetHeight || window.innerHeight * 0.8;
      // jump(), not set(): set() in the same frame as the animation reads as
      // an enormous velocity, which the spring then inherits and flings the
      // sheet the wrong way. jump() places it with no velocity at all.
      if (!resuming) y.jump(height.current);
      t.jump(1);
      const a = animate(y, 0, spring);
      return () => a.stop();
    }
    y.jump(0);
    if (!resuming) t.jump(0);
    const a = animate(t, 1, reduced ? { duration: 0.18 } : spring);
    return () => a.stop();
  }, [open, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Exit (from the close button, the scrim, Escape or the parent)
  useEffect(() => {
    if (open || !mounted) return;
    const done = () => {
      onScreen.current = false;
      setMounted(false);
      triggerRef.current?.focus?.();
      triggerRef.current = null;
    };
    if (closedByGesture.current) { done(); return; }
    let cancelled = false;
    const a = mode === 'sheet' && !reduced
      ? animate(y, height.current, spring)
      : animate(t, 0, reduced ? { duration: 0.15 } : { ...spring, visualDuration: 0.25 });
    // Stopping an animation can resolve its promise; only unmount if this
    // exit actually ran to the end (not interrupted by a reopen).
    a.then(() => { if (!cancelled) done(); });
    return () => { cancelled = true; a.stop(); };
  }, [open, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // A sheet covers the page on a phone: keep the page behind it still.
  useEffect(() => {
    if (!mounted || mode !== 'sheet') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mounted, mode]);

  useEffect(() => {
    if (open && mounted) panelRef.current?.focus({ preventScroll: true });
  }, [open, mounted]);

  const swipe = useSwipe({
    axis: 'y',
    value: y,
    min: 0,                     // fully open; pulling further up rubber-bands
    dimension: height.current,
    enabled: mode === 'sheet' && !reduced && open,
    onRelease: ({ projected, velocity }) => {
      const dismiss = decide({ projected, velocity, threshold: height.current / 2, direction: 1 });
      if (dismiss) {
        closedByGesture.current = true;
        animate(y, height.current, { ...springFlick, velocity }).then(() => onClose?.());
      } else {
        animate(y, 0, { ...springFlick, velocity });
      }
    },
  });

  const anchor = <span ref={anchorRef} hidden />;
  if (!mounted) return anchor;
  const portal = (node) => (
    <>
      {anchor}
      {createPortal(<div className={themeClass}>{node}</div>, document.body)}
    </>
  );

  const width = WIDTHS[maxWidth] || maxWidth;
  const header = (title || onClose) && (
    <div className={cn('flex items-center justify-between gap-4', title ? 'mb-4' : 'mb-1')}>
      {title ? <h3 id={titleId} className="text-h3 font-display">{title}</h3> : <span />}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="press grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-highlight"
      >
        <X size={18} className="pointer-events-none" />
      </button>
    </div>
  );

  if (mode === 'sheet') {
    return portal(
      <div className="fixed inset-0 z-[100]" role="presentation">
        <motion.div
          className="sheet-scrim absolute inset-0"
          style={{ opacity: reduced ? t : sheetScrim }}
          onClick={onClose}
        />
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          tabIndex={-1}
          style={reduced ? { opacity: t } : { y }}
          className="material-thick sheet-panel absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col outline-none"
        >
          {/* The grab zone: grabber and header. The body scrolls normally. */}
          <div {...swipe} style={{ ...swipe.style, touchAction: 'none' }} className="shrink-0 px-5 pt-2">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-text/25" aria-hidden="true" />
            {header}
          </div>
          <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]', bodyClassName)}>
            {children}
          </div>
        </motion.div>
      </div>
    );
  }

  return portal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <motion.div
        className="sheet-scrim absolute inset-0"
        style={{ opacity: t, backdropFilter: reduced ? undefined : scrimBlur, WebkitBackdropFilter: reduced ? undefined : scrimBlur }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        style={{ maxWidth: width, opacity: t, ...(reduced ? {} : { scale: dialogScale, filter: dialogBlur }) }}
        className="dialog-panel relative w-full rounded-2xl p-6 outline-none"
      >
        {header}
        <div className={bodyClassName}>{children}</div>
      </motion.div>
    </div>
  );
}

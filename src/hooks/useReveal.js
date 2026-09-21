import { useEffect, useRef } from 'react';

/**
 * Entrance choreography.
 *
 * Put the ref on a container, give its direct children the `rv` class,
 * and they arrive in sequence when the container scrolls into view.
 *
 *   const ref = useReveal();
 *   <div ref={ref} className="reveal">
 *     <h2 className="rv">…</h2>
 *     <p className="rv">…</p>
 *   </div>
 *
 * Once the last child has landed, `done` is added, which zeroes the
 * stagger delays. Without that retirement every later hover on the
 * second and third children lags by its entrance delay forever.
 */
export default function useReveal({ threshold = 0.18, once = true } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced motion gets the finished state with no observer at all.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('in', 'done');
      return;
    }

    let retire;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in');
          // Longest transition (620ms) plus the deepest delay (460ms).
          retire = setTimeout(() => el.classList.add('done'), 1120);
          if (once) obs.disconnect();
        } else if (!once) {
          clearTimeout(retire);
          el.classList.remove('in', 'done');
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' }
    );

    obs.observe(el);
    return () => {
      clearTimeout(retire);
      obs.disconnect();
    };
  }, [threshold, once]);

  return ref;
}

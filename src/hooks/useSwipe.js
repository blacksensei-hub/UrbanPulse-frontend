import { useEffect, useRef } from 'react';
import { project, rubberband } from '../lib/gesture.js';

const HYSTERESIS_PX = 10;    // movement before we commit to a direction
const VELOCITY_WINDOW = 100; // ms of history used for release velocity

/**
 * One-axis swipe with Apple's fluid-interface behaviour, driving a Framer
 * MotionValue directly (no React re-render per frame):
 *
 *  - Picks the gesture up where the value currently is, so grabbing
 *    something mid-animation stops it where it is and follows the finger.
 *  - 10px of hysteresis before committing; if the finger moves along the
 *    other axis first, the swipe steps aside and the page scrolls instead.
 *  - Tracks 1:1 with the finger from where it was grabbed.
 *  - Rubber-bands past `min`/`max` instead of stopping dead.
 *  - On release, hands `onRelease` the finger's velocity (from the last
 *    100ms of movement) and the projected resting point, so the follow-up
 *    spring can carry the throw on without a seam.
 *
 * Touch and pen only by default: nobody expects to drag a sheet with a mouse.
 *
 * Returns props to spread on the element that receives the gesture.
 */
export function useSwipe({
  axis = 'x',
  value,
  min = -Infinity,
  max = Infinity,
  dimension,            // size used to scale rubber-banding (e.g. sheet height)
  enabled = true,
  pointerTypes = ['touch', 'pen'],
  // Only claim gestures that start in this direction (1 or -1; 0 = either;
  // or a function returning one). Lets two swipes share a surface: the cart
  // drawer takes rightward swipes, the item inside it takes leftward ones.
  commitDirection = 0,
  onStart,
  onMove,
  onRelease,
}) {
  const state = useRef(null);
  const opts = useRef();
  opts.current = { axis, value, min, max, dimension, enabled, pointerTypes, commitDirection, onStart, onMove, onRelease };

  useEffect(() => () => { state.current = null; }, []);

  function onPointerDown(e) {
    const o = opts.current;
    if (!o.enabled || !o.pointerTypes.includes(e.pointerType)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    state.current = {
      id: e.pointerId,
      el: e.currentTarget,
      x0: e.clientX,
      y0: e.clientY,
      committed: false,
      start: 0,
      samples: [],
    };
  }

  function onPointerMove(e) {
    const s = state.current;
    if (!s || e.pointerId !== s.id) return;
    const o = opts.current;
    const along = o.axis === 'x' ? e.clientX - s.x0 : e.clientY - s.y0;
    const across = o.axis === 'x' ? e.clientY - s.y0 : e.clientX - s.x0;

    if (!s.committed) {
      if (Math.abs(along) < HYSTERESIS_PX && Math.abs(across) < HYSTERESIS_PX) return;
      if (Math.abs(across) > Math.abs(along)) { state.current = null; return; } // it's a scroll
      const dir = typeof o.commitDirection === 'function' ? o.commitDirection() : o.commitDirection;
      if (dir && Math.sign(along) !== dir) { state.current = null; return; }   // someone else's swipe
      s.committed = true;
      o.value.stop?.();               // interrupt: start from where it is on screen now
      s.start = o.value.get();
      s.grab = along;                 // respect the grab offset, no jump on commit
      try { s.el.setPointerCapture(s.id); } catch {}
      o.onStart?.();
    }

    const raw = s.start + (along - s.grab);
    let v = raw;
    if (raw > o.max) v = o.max + rubberband(raw - o.max, o.dimension);
    else if (raw < o.min) v = o.min - rubberband(o.min - raw, o.dimension);
    o.value.set(v);

    const now = performance.now();
    s.samples.push({ t: now, p: along });
    while (s.samples.length > 2 && now - s.samples[0].t > VELOCITY_WINDOW) s.samples.shift();
    o.onMove?.(v);
    e.preventDefault?.();
    e.stopPropagation?.();
  }

  function finish(e, cancelled) {
    const s = state.current;
    if (!s || e.pointerId !== s.id) return;
    state.current = null;
    if (!s.committed) return;
    try { s.el.releasePointerCapture(s.id); } catch {}
    const first = s.samples[0];
    const last = s.samples[s.samples.length - 1];
    const dt = last && first ? (last.t - first.t) / 1000 : 0;
    const velocity = cancelled || dt <= 0 ? 0 : (last.p - first.p) / dt;
    const o = opts.current;
    const current = o.value.get();
    o.onRelease?.({ value: current, velocity, projected: current + project(velocity), cancelled });
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (e) => finish(e, false),
    onPointerCancel: (e) => finish(e, true),
    // Let the browser keep the other axis: vertical page scroll still works
    // under a horizontal swipe, and vice versa.
    style: { touchAction: axis === 'x' ? 'pan-y' : 'pan-x' },
  };
}

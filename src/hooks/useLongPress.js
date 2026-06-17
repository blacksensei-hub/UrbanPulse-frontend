import { useRef, useCallback } from 'react';

export function useLongPress(onLongPress, delay = 500) {
  const timerRef = useRef(null);
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;

  const start = useCallback((e) => {
    // Only activate on touch — not mouse (desktop)
    if (e?.pointerType === 'mouse') return;
    timerRef.current = setTimeout(() => {
      onLongPressRef.current();
      timerRef.current = null;
    }, delay);
  }, [delay]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  };
}

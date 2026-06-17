import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 80;

export function usePullToRefresh(onRefresh, { disabled = false } = {}) {
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onRefreshRef = useRef(onRefresh);
  const startY = useRef(0);
  const canPull = useRef(false);
  const triggered = useRef(false);
  const isRefreshingRef = useRef(false);

  useEffect(() => { onRefreshRef.current = onRefresh; });

  useEffect(() => {
    if (disabled) return;

    function onTouchStart(e) {
      canPull.current = window.scrollY <= 2;
      if (!canPull.current) return;
      startY.current = e.touches[0].clientY;
      triggered.current = false;
    }

    function onTouchMove(e) {
      if (!canPull.current || window.scrollY > 2) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) { setPulling(false); setPullProgress(0); return; }
      if (delta > 10) e.preventDefault();
      setPulling(true);
      setPullProgress(Math.min(delta / THRESHOLD, 1));
      if (delta >= THRESHOLD && !triggered.current) {
        triggered.current = true;
        try {
          if (navigator.vibrate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            navigator.vibrate(20);
          }
        } catch {}
      }
    }

    function onTouchEnd() {
      if (!canPull.current) return;
      canPull.current = false;
      if (triggered.current && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        setRefreshing(true);
        setPulling(false);
        setPullProgress(1);
        Promise.resolve(onRefreshRef.current()).finally(() => {
          isRefreshingRef.current = false;
          setRefreshing(false);
          setPullProgress(0);
        });
      } else {
        setPulling(false);
        setPullProgress(0);
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [disabled]);

  return {
    pulling,
    pullProgress,
    refreshing,
    // backward-compat aliases used by admin pages
    isPulling: pulling,
    isRefreshing: refreshing,
    pullY: Math.round(pullProgress * THRESHOLD),
  };
}

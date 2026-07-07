import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { debounce } from '../utils/debounce.js';
import { getErrorMessage } from '../utils/errors.js';

// Optimistically updates a cart line-item's quantity on every click, but only
// sends the network request ~`wait`ms after the last click — so holding +/-
// fires one request instead of one per click. Rolls back on failure, unless a
// newer request has since superseded the failed one.
export function useDebouncedCartQuantity(update, { wait = 400 } = {}) {
  const [optimistic, setOptimistic] = useState({});
  const debouncers = useRef({});
  const pending = useRef({});

  const commit = useCallback((id, qty) => {
    if (!debouncers.current[id]) {
      debouncers.current[id] = debounce((q) => {
        const token = {};
        pending.current[id] = token;
        update(id, q).catch((err) => {
          if (pending.current[id] !== token) return; // superseded by a newer click
          toast.error(getErrorMessage(err, 'Could not update cart'));
          setOptimistic((o) => {
            const next = { ...o };
            delete next[id];
            return next;
          });
        });
      }, wait);
    }
    debouncers.current[id](qty);
  }, [update, wait]);

  const setQuantity = useCallback((item, nextQty, floor = 1) => {
    const clamped = Math.max(floor, Math.min(nextQty, item.stock));
    setOptimistic((o) => ({ ...o, [item.id]: clamped }));
    commit(item.id, clamped);
  }, [commit]);

  const getQuantity = useCallback((item) => optimistic[item.id] ?? item.quantity, [optimistic]);

  return { getQuantity, setQuantity };
}

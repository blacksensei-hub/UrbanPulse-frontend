import { useState, useCallback } from 'react';

export function useTableSelection() {
  const [selected, setSelected] = useState(new Set());

  const toggle = useCallback((id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const toggleAll = useCallback((ids) => {
    setSelected(prev => ids.every(id => prev.has(id)) ? new Set() : new Set(ids));
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  return {
    selected,
    selectedArray: [...selected],
    count: selected.size,
    toggle,
    toggleAll,
    clear,
    isSelected: (id) => selected.has(id),
    isAllSelected: (ids) => ids.length > 0 && ids.every(id => selected.has(id)),
  };
}

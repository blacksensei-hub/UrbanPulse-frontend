import { create } from 'zustand';

const SHOW_DELAY_MS = 300;
const SAFETY_TIMEOUT_MS = 15000;

// Timer handles are module-scoped, not part of reactive state — they're pure
// bookkeeping for the show-delay/safety-timeout mechanics below.
let showTimer = null;
let safetyTimer = null;

export const useLoadingStore = create((set) => ({
  active: false,  // raw intent: a navigation is in flight
  visible: false, // true only once the show-delay has elapsed without done() firing

  start: () => {
    clearTimeout(showTimer);
    clearTimeout(safetyTimer);
    set({ active: true });

    showTimer = setTimeout(() => {
      set({ visible: true });
    }, SHOW_DELAY_MS);

    // A stuck bar is worse than no bar — force-clear if a navigation never settles
    // (e.g. a chunk-load failure means the component that'd call done() never mounts).
    safetyTimer = setTimeout(() => {
      set({ active: false, visible: false });
    }, SAFETY_TIMEOUT_MS);
  },

  done: () => {
    clearTimeout(showTimer);
    clearTimeout(safetyTimer);
    set({ active: false, visible: false });
  },
}));

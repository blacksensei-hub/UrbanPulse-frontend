import { create } from 'zustand';

export const useLoadingStore = create((set) => ({
  active: false,
  start: () => set({ active: true }),
  done:  () => set({ active: false }),
}));

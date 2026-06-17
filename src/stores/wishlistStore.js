import { create } from 'zustand';
import { wishlistService } from '../services/index.js';

export const useWishlistStore = create((set, get) => ({
  items: [],
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const items = await wishlistService.list();
      set({ items });
    } catch {
      // Not logged in or network error — silently reset
      set({ items: [] });
    } finally {
      set({ loading: false });
    }
  },

  add: async (product_id) => {
    await wishlistService.add(product_id);
    await get().refresh();
  },

  remove: async (id) => {
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    try {
      await wishlistService.remove(id);
    } catch {
      await get().refresh();
    }
  },

  isWishlisted: (product_id) => get().items.some((i) => i.product_id === product_id),
  getItem: (product_id) => get().items.find((i) => i.product_id === product_id),
}));

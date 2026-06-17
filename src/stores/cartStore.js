import { create } from 'zustand';
import { cartService } from '../services/index.js';

export const useCartStore = create((set, get) => ({
  cart: { items: [], subtotal: 0, id: null },
  drawerOpen: false,
  bouncing: false,

  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),

  refresh: async () => {
    const cart = await cartService.get();
    set({ cart });
  },

  add: async (variant_id, quantity = 1) => {
    const cart = await cartService.add(variant_id, quantity);
    set({ cart, drawerOpen: true, bouncing: true });
    setTimeout(() => set({ bouncing: false }), 600);
  },

  update: async (id, quantity) => {
    const cart = await cartService.update(id, quantity);
    set({ cart });
  },

  remove: async (id) => {
    const cart = await cartService.remove(id);
    set({ cart });
  },

  itemCount: () => get().cart.items.reduce((n, it) => n + it.quantity, 0),
}));

import { create } from 'zustand';
import { authService } from '../services/index.js';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  init: async () => {
    try {
      const { user } = await authService.me();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  setUser: (user) => set({ user }),
  login: async (email, password) => {
    const data = await authService.login(email, password);
    // If TOTP required, data has { requires_totp, challenge_token } — don't set user yet
    if (data.user) set({ user: data.user });
    return data;
  },
  register: async (email, password, name, referralCode) => {
    const { user } = await authService.register(email, password, name, referralCode);
    set({ user });
    return user;
  },
  logout: async () => {
    await authService.logout();
    set({ user: null });
  },
  loginWithGoogle: async (idToken, referralCode) => {
    const data = await authService.googleSignIn(idToken, referralCode);
    // If TOTP required, data has { requires_totp, challenge_token } — don't set user yet
    if (data.user) set({ user: data.user });
    return data;
  },
}));

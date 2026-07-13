import { create } from 'zustand';
import { authService } from '../services/index.js';
import { api } from '../services/api.js';
import { hasSessionHint, setSessionHint, clearSessionHint } from '../utils/sessionHint.js';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  init: async () => {
    if (!hasSessionHint()) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const { user } = await authService.me();
      set({ user, loading: false });
    } catch (err) {
      if (err?.response?.status !== 401) {
        // Network/5xx hiccup, not a definitive "no session" — don't touch the
        // hint, just resolve this load to logged-out.
        set({ user: null, loading: false });
        return;
      }
      // The response interceptor deliberately skips /auth/* URLs to avoid
      // refresh loops, so /auth/me needs its own one-shot refresh-and-retry here.
      // Split into two catches so only a definitive rejection FROM /auth/refresh
      // clears the hint — a network blip/timeout/5xx on either call, or the
      // follow-up /auth/me failing for some other reason after a successful
      // refresh, is not the server saying "no session" and must not clear it.
      try {
        await api.post('/auth/refresh');
      } catch (refreshErr) {
        if (refreshErr?.response?.status === 401 || refreshErr?.response?.status === 403) {
          clearSessionHint();
        }
        set({ user: null, loading: false });
        return;
      }
      try {
        const { user } = await authService.me();
        set({ user, loading: false });
      } catch {
        set({ user: null, loading: false });
      }
    }
  },
  setUser: (user) => set({ user }),
  login: async (email, password) => {
    const data = await authService.login(email, password);
    // If TOTP required, data has { requires_totp, challenge_token } — don't set user yet
    if (data.user) { set({ user: data.user }); setSessionHint(); }
    return data;
  },
  register: async (email, password, name, referralCode) => {
    const { user } = await authService.register(email, password, name, referralCode);
    set({ user });
    setSessionHint();
    return user;
  },
  logout: async () => {
    await authService.logout();
    set({ user: null });
    clearSessionHint();
  },
  loginWithGoogle: async (idToken, referralCode) => {
    const data = await authService.googleSignIn(idToken, referralCode);
    // If TOTP required, data has { requires_totp, challenge_token } — don't set user yet
    if (data.user) { set({ user: data.user }); setSessionHint(); }
    return data;
  },
}));

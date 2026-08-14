import { create } from 'zustand';
import { settingsService } from '../services/index.js';

// How long a fetched settings snapshot is considered fresh before the next
// call to load() (App.jsx calls this on every navigation) triggers a real
// refetch — matches the TanStack Query global staleTime in main.jsx. Without
// this, an admin's change to e.g. free_shipping_threshold_ghs would never
// reach a tab that was already open (previously guarded by a one-shot
// `loaded` flag that never reset).
const STALE_MS = 60_000;

export const useSettingsStore = create((set, get) => ({
  settings: {},
  loaded: false,
  lastFetchedAt: 0,
  load: async () => {
    const { loaded, lastFetchedAt } = get();
    if (loaded && Date.now() - lastFetchedAt < STALE_MS) return;
    try {
      const data = await settingsService.public();
      set({ settings: data, loaded: true, lastFetchedAt: Date.now() });
    } catch { /* fail silently — previous values (or defaults) apply */ }
  },
}));

export function useFeature(name) {
  const val = useSettingsStore(s => s.settings[`feature_${name}`]);
  return val === undefined || val === null || val === 'true' || val === true;
}

export function useSetting(key, fallback = '') {
  return useSettingsStore(s => s.settings[key] ?? fallback);
}

import { create } from 'zustand';
import { settingsService } from '../services/index.js';

export const useSettingsStore = create((set, get) => ({
  settings: {},
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const data = await settingsService.public();
      set({ settings: data, loaded: true });
    } catch { /* fail silently — defaults apply */ }
  },
}));

export function useFeature(name) {
  const val = useSettingsStore(s => s.settings[`feature_${name}`]);
  return val === undefined || val === null || val === 'true' || val === true;
}

export function useSetting(key, fallback = '') {
  return useSettingsStore(s => s.settings[key] ?? fallback);
}

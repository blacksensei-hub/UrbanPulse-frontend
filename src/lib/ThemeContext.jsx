import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {}, setTheme: () => {} });
const STORAGE_KEY = 'urbanpulse-theme';
const THEME_COLORS = { light: '#F8F6F2', dark: '#12100E' };

export function ThemeProvider({ children }) {
  // Initial value taken from <html> class (set by no-FOUC script in index.html).
  const [theme, setThemeState] = useState(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const apply = useCallback((next) => {
    setThemeState(next);
    const root = document.documentElement;
    if (next === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.colorScheme = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    // Both theme-color meta tags (gated by prefers-color-scheme) get the same value
    // so the browser chrome reflects the in-app choice, not just the OS preference.
    document.querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute('content', THEME_COLORS[next]));
  }, []);

  const toggleTheme = useCallback(() => apply(theme === 'light' ? 'dark' : 'light'), [theme, apply]);

  useEffect(() => {
    // Keep tabs in sync
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue && e.newValue !== theme) apply(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [theme, apply]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: apply, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

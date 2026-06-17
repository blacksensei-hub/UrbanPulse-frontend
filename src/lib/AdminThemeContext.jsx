import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AdminThemeContext = createContext({
  adminTheme: 'light',
  toggleAdminTheme: () => {},
  setAdminTheme: () => {},
  isAdminDark: false,
});

const ADMIN_STORAGE_KEY = 'urbanpulse-admin-theme';

export function AdminThemeProvider({ children }) {
  const [adminTheme, setAdminThemeState] = useState(() => {
    try { return localStorage.getItem(ADMIN_STORAGE_KEY) || 'light'; } catch { return 'light'; }
  });

  const apply = useCallback((next) => {
    setAdminThemeState(next);
    try { localStorage.setItem(ADMIN_STORAGE_KEY, next); } catch {}
  }, []);

  const toggleAdminTheme = useCallback(
    () => apply(adminTheme === 'light' ? 'dark' : 'light'),
    [adminTheme, apply],
  );

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === ADMIN_STORAGE_KEY && e.newValue && e.newValue !== adminTheme) {
        apply(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [adminTheme, apply]);

  return (
    <AdminThemeContext.Provider
      value={{ adminTheme, toggleAdminTheme, setAdminTheme: apply, isAdminDark: adminTheme === 'dark' }}
    >
      {children}
    </AdminThemeContext.Provider>
  );
}

export const useAdminTheme = () => useContext(AdminThemeContext);

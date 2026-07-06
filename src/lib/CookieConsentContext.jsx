import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { readConsent, writeConsent, COOKIE_CONSENT_KEY } from '../utils/cookieConsent.js';
import { useAuthStore } from '../stores/authStore.js';
import { authService } from '../services/index.js';

const CookieConsentContext = createContext(null);

export function CookieConsentProvider({ children }) {
  const [consent, setConsent] = useState(() => readConsent());
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  const save = useCallback((partial) => {
    const next = writeConsent(partial);
    setConsent(next);
    setCustomizeOpen(false);
    if (user) {
      // Audit-trail only — enforcement stays entirely client-side (localStorage).
      authService.logConsentUpdate({
        functional: next.functional, analytics: next.analytics, marketing: next.marketing,
      }).catch(() => {});
    }
    return next;
  }, [user]);

  const acceptAll = useCallback(
    () => save({ functional: true, analytics: true, marketing: true }),
    [save]
  );

  useEffect(() => {
    const onStorage = (e) => { if (e.key === COOKIE_CONSENT_KEY) setConsent(readConsent()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        hasResponded: consent !== null,
        save,
        acceptAll,
        customizeOpen,
        openCustomize: () => setCustomizeOpen(true),
        closeCustomize: () => setCustomizeOpen(false),
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export const useCookieConsent = () => useContext(CookieConsentContext);

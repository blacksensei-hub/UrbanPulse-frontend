import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { readConsent, writeConsent, answerBelongsTo, COOKIE_CONSENT_KEY } from '../utils/cookieConsent.js';
import { useAuthStore } from '../stores/authStore.js';
import { authService } from '../services/index.js';

const CookieConsentContext = createContext(null);

const pick = (c) => ({ functional: !!c.functional, analytics: !!c.analytics, marketing: !!c.marketing });

// The banner is asked once per account, not once per browser:
//  - Signed-out visitors never see it. Nothing non-essential is on by default,
//    so there is nothing to ask them about yet.
//  - On sign-in, the account's answer is fetched. If it has one, this browser
//    adopts it and the banner stays hidden, on every device from then on.
//  - If the account has none but this browser does (answered before this
//    change, or signed out), that answer is sent to the account instead of
//    asking again.
//  - Only an account with no answer anywhere sees the banner, and Accept,
//    Reject or Save all record it against the account.
export function CookieConsentProvider({ children }) {
  const [consent, setConsent] = useState(() => readConsent());
  const [customizeOpen, setCustomizeOpen] = useState(false);
  // Which signed-in account still needs to answer. Starts false, so there is
  // no flash of the banner while the account's answer is being looked up.
  const [needsAnswerFor, setNeedsAnswerFor] = useState(null);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;

  useEffect(() => {
    setNeedsAnswerFor(null);
    if (!userId) return;
    let cancelled = false;

    authService.getConsent()
      .then((server) => {
        if (cancelled) return;
        if (server) {
          setConsent(writeConsent(pick(server), { userId, grantedAt: server.granted_at }));
          return;
        }
        const local = readConsent();
        if (answerBelongsTo(local, userId)) {
          setConsent(writeConsent(pick(local), { userId, grantedAt: local.granted_at }));
          authService.logConsentUpdate(pick(local)).catch(() => {});
          return;
        }
        setNeedsAnswerFor(userId);
      })
      // If the lookup fails, don't nag. The next sign-in asks again.
      .catch(() => {});

    return () => { cancelled = true; };
  }, [userId]);

  const save = useCallback((partial) => {
    const next = writeConsent(partial, { userId });
    setConsent(next);
    setCustomizeOpen(false);
    setNeedsAnswerFor(null);
    if (userId) authService.logConsentUpdate(pick(next)).catch(() => {});
    return next;
  }, [userId]);

  const acceptAll = useCallback(
    () => save({ functional: true, analytics: true, marketing: true }),
    [save]
  );
  const rejectAll = useCallback(
    () => save({ functional: false, analytics: false, marketing: false }),
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
        showBanner: !!userId && needsAnswerFor === userId,
        save,
        acceptAll,
        rejectAll,
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

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useCookieConsent } from '../lib/CookieConsentContext.jsx';
import { Button } from './ui/index.jsx';
import Modal from './ui/Modal.jsx';

const GROUPS = [
  { key: 'essential', label: 'Essential', locked: true, description: 'Required for cart, checkout, and sign-in. Always on.' },
  { key: 'functional', label: 'Functional', description: 'Remembers preferences like theme and recently viewed items.' },
  { key: 'analytics', label: 'Analytics', description: 'Helps us understand site usage so we can improve it.' },
  { key: 'marketing', label: 'Marketing', description: 'Used to personalize offers and measure campaigns.' },
];

export default function CookieConsent() {
  const { hasResponded, consent, customizeOpen, openCustomize, closeCustomize, save, acceptAll } = useCookieConsent();
  const [draft, setDraft] = useState({ functional: false, analytics: false, marketing: false });

  useEffect(() => {
    if (customizeOpen) {
      setDraft({
        functional: !!consent?.functional,
        analytics: !!consent?.analytics,
        marketing: !!consent?.marketing,
      });
    }
  }, [customizeOpen, consent]);

  return (
    <>
      <AnimatePresence>
        {!hasResponded && !customizeOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-0 bottom-0 z-[90] border-t border-border bg-surface p-4 shadow-float"
          >
            <div className="container-site flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-xl text-sm text-muted">
                We use cookies to keep you signed in and remember your cart. We don&rsquo;t sell your data.{' '}
                <Link to="/privacy" className="underline hover:text-accent">Privacy policy</Link>.
              </p>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={openCustomize}>Customize</Button>
                <Button size="sm" onClick={acceptAll}>Accept</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={customizeOpen} onClose={closeCustomize} title="Cookie preferences">
        <div className="space-y-4">
          {GROUPS.map((g) => (
            <div key={g.key} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{g.label}</p>
                <p className="text-xs text-muted">{g.description}</p>
              </div>
              <input
                type="checkbox"
                checked={g.locked ? true : !!draft[g.key]}
                disabled={g.locked}
                onChange={(e) => setDraft((d) => ({ ...d, [g.key]: e.target.checked }))}
                className="mt-1 h-5 w-5 shrink-0 accent-accent"
              />
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={closeCustomize}>Cancel</Button>
            <Button onClick={() => save(draft)}>Save preferences</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

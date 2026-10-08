import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from './ui/index.jsx';
import SegmentedControl from './ui/SegmentedControl.jsx';
import { dropService } from '../services/index.js';
import { useAuthStore } from '../stores/authStore.js';
import { spring } from '../lib/motion.js';
import { cn } from '../utils/format.js';
import { getServerMessage } from '../utils/errors.js';

// The welcome offer ("10% off your first order"), fetched once per page load
// and shared by every form on the page. null when none is set.
let offerRequest = null;
export function useDropOffer() {
  const [offer, setOffer] = useState(null);
  useEffect(() => {
    let live = true;
    offerRequest ??= dropService.offer().catch(() => null);
    offerRequest.then((o) => { if (live) setOffer(o); });
    return () => { live = false; };
  }, []);
  return offer;
}

const MODES = [{ id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }];

/**
 * Join the drop list by email or SMS. Saves the contact for real (the old
 * forms said "Subscribed" and kept nothing), then shows the welcome code if
 * there is one.
 *
 * tone: 'inverse' for the homepage's dark band, 'plain' elsewhere.
 */
export default function DropSignup({ source, tone = 'plain', className }) {
  const reduced = useReducedMotion();
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState('email');
  const [value, setValue] = useState('');
  const [state, setState] = useState('idle');   // idle | sending | done
  const [error, setError] = useState('');
  const [welcome, setWelcome] = useState(null);
  const inputRef = useRef(null);
  const inverse = tone === 'inverse';

  useEffect(() => {
    if (user?.email && mode === 'email') setValue((v) => v || user.email);
  }, [user?.email, mode]);

  function switchMode(m) {
    setMode(m);
    setValue(m === 'email' ? (user?.email ?? '') : '');
    setError('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function submit(e) {
    e.preventDefault();
    const v = value.trim();
    if (!v) { setError(mode === 'email' ? 'Enter your email address.' : 'Enter your phone number.'); inputRef.current?.focus(); return; }
    setState('sending');
    setError('');
    try {
      const r = await dropService.subscribe({ [mode === 'email' ? 'email' : 'phone']: v, source });
      setWelcome(r.welcome ?? null);
      setState('done');
    } catch (err) {
      setError(getServerMessage(err, 'That didn’t go through. Try again in a moment.'));
      setState('idle');
      inputRef.current?.focus();
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(welcome.code); toast.success('Code copied'); }
    catch { toast.error('Couldn’t copy. Select the code instead.'); }
  }

  const muted = inverse ? 'inverse-muted' : 'text-muted';

  return (
    <div className={className}>
      {/* Enter-only swap. An exit-then-enter (AnimatePresence mode="wait")
          never finished once the segmented control's thumb had slid (its
          shared layout animation holds the exit open), leaving a blank space
          where the confirmation should be. */}
      {state === 'done' ? (
          <motion.div
            key="done"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
            role="status"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
                <Check className="h-5 w-5" strokeWidth={2.6} />
              </span>
              <div>
                <p className="font-semibold">You’re on the list.</p>
                <p className={cn('text-sm', muted)}>
                  We’ll {mode === 'email' ? 'email' : 'text'} you when the next drop lands.
                </p>
              </div>
            </div>
            {welcome && (
              <div className={cn('mt-4 rounded-2xl p-4', inverse ? 'inverse-fill' : 'bg-highlight')}>
                <p className={cn('text-xs font-medium', muted)}>Your code · {welcome.label}</p>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span className="select-all font-mono text-xl font-semibold tracking-[0.06em]">{welcome.code}</span>
                  <button type="button" onClick={copy} className={cn('press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold', inverse ? 'inverse-track' : 'bg-surface border border-border')}>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
                <p className={cn('mt-1.5 text-xs', muted)}>Enter it at checkout.{welcome.note ? ` ${welcome.note}` : ''}</p>
              </div>
            )}
          </motion.div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-3">
            <SegmentedControl
              ariaLabel="How should we reach you?"
              items={MODES}
              value={mode}
              onChange={switchMode}
              tone={inverse ? 'inverse' : undefined}
              className="sm:w-full"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                ref={inputRef}
                aria-label={mode === 'email' ? 'Email address' : 'Phone number'}
                aria-invalid={!!error}
                type={mode === 'email' ? 'email' : 'tel'}
                inputMode={mode === 'email' ? 'email' : 'tel'}
                autoComplete={mode === 'email' ? 'email' : 'tel'}
                placeholder={mode === 'email' ? 'you@email.com' : '024 123 4567'}
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(''); }}
                className={inverse
                  ? 'inverse-input min-w-0 flex-1 rounded-xl px-4 py-3.5 transition-colors focus:border-accent focus:outline-none'
                  : 'input min-w-0 flex-1'}
              />
              <Button
                type="submit"
                size={inverse ? 'lg' : undefined}
                loading={state === 'sending'}
                className={cn('shrink-0', inverse && 'bg-accent text-on-accent hover:bg-accent-hover')}
              >
                Join
              </Button>
            </div>
            <AnimatePresence initial={false}>
              {error && (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={spring}
                  className={cn('text-sm', inverse ? 'text-bg' : 'text-error')}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <p className={cn('text-xs', muted)}>
              Only drop news{mode === 'sms' ? ', to Ghana numbers' : ''}. Every message has a link to unsubscribe.
            </p>
          </form>
      )}
    </div>
  );
}

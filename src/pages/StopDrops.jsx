import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BellOff, Bell, Mail, MessageSquare } from 'lucide-react';
import SEO from '../components/SEO.jsx';
import { Button } from '../components/ui/index.jsx';
import { Label } from '../components/ui/Instrument.jsx';
import { dropService } from '../services/index.js';
import { spring } from '../lib/motion.js';

/**
 * /stop/:token, linked from every drop email and text. Opening it only shows
 * which contact it's for; leaving takes a tap, because email security
 * scanners open links on their own and would otherwise unsubscribe people.
 */
export default function StopDrops() {
  const { token } = useParams();
  const reduced = useReducedMotion();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dropService.stopInfo(token)
      .then(setInfo)
      .catch((err) => setError(err?.response?.data?.error ?? 'That link doesn’t work.'));
  }, [token]);

  async function act(fn) {
    setBusy(true);
    try { setInfo(await fn(token)); }
    catch (err) { setError(err?.response?.data?.error ?? 'That didn’t go through. Try again in a moment.'); }
    finally { setBusy(false); }
  }

  const Channel = info?.channel === 'sms' ? MessageSquare : Mail;

  return (
    <>
      <SEO title="Drop list" description="Manage UrbanPulse drop messages." url={`/stop/${token}`} noindex />
      <div className="container-site max-w-md" style={{ paddingBlock: 'var(--space-section)' }}>
        <Label className="mb-3 block">Drop list</Label>
        <AnimatePresence mode="wait" initial={false}>
          {error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-display text-h1 font-semibold">That link doesn’t work.</h1>
              <p className="mt-3 text-muted">{error} If you keep getting messages you don’t want, <Link to="/contact" className="text-accent-text underline underline-offset-2">tell us</Link> and we’ll take you off.</p>
            </motion.div>
          ) : !info ? (
            <motion.p key="loading" className="text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Loading…</motion.p>
          ) : (
            <motion.div
              key={info.subscribed ? 'on' : 'off'}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring}
            >
              <h1 className="font-display text-h1 font-semibold">
                {info.subscribed ? 'Stop drop messages?' : 'You’re unsubscribed.'}
              </h1>
              <p className="mt-3 text-muted">
                {info.subscribed
                  ? `You’ll stop getting new-drop ${info.channel === 'sms' ? 'texts' : 'emails'} here. Order updates aren’t affected.`
                  : `No more drop ${info.channel === 'sms' ? 'texts' : 'emails'} to this ${info.channel === 'sms' ? 'number' : 'address'}.`}
              </p>
              <div className="inset-group mt-8">
                <div className="inset-row flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-highlight">
                    <Channel className="h-4 w-4 text-muted" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px]">{info.contact}</span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                    {info.subscribed ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                    {info.subscribed ? 'On the list' : 'Off the list'}
                  </span>
                </div>
              </div>
              {info.subscribed ? (
                <Button size="lg" className="mt-5 w-full" loading={busy} onClick={() => act(dropService.stop)}>Unsubscribe</Button>
              ) : (
                <>
                  <Button size="lg" variant="outline" className="mt-5 w-full" loading={busy} onClick={() => act(dropService.undoStop)}>
                    Undo, keep me on the list
                  </Button>
                  <Link to="/shop" className="mt-4 block text-center text-sm text-muted underline underline-offset-2">Back to the shop</Link>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

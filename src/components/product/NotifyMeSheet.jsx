import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Check } from 'lucide-react';
import Sheet from '../ui/Sheet.jsx';
import { Button } from '../ui/index.jsx';
import { productService } from '../../services/index.js';
import { useAuthStore } from '../../stores/authStore.js';
import { spring } from '../../lib/motion.js';
import { getServerMessage } from '../../utils/errors.js';

/**
 * "Tell me when it's back" for a sold-out size. One message when that exact
 * size is restocked, then nothing more, and the sheet says so up front.
 */
export default function NotifyMeSheet({ open, onClose, product, variant }) {
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setEmail(user?.email ?? '');
    setPhone('');
    setState('idle');
    setError('');
  }, [open, user?.email]);

  const variantLabel = [variant?.size, variant?.color].filter(Boolean).join(' · ');

  async function submit(e) {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) { setError('Add an email address or a phone number.'); return; }
    setState('sending');
    setError('');
    try {
      const r = await productService.stockAlert(product.id, {
        variant_id: variant.id,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      if (r?.in_stock) { setError('Good news: this size is in stock right now. Close this and add it to your bag.'); setState('idle'); return; }
      setState('done');
    } catch (err) {
      setError(getServerMessage(err, 'That didn’t go through. Try again in a moment.'));
      setState('idle');
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={state === 'done' ? undefined : 'Get told when it’s back'} maxWidth="440px">
      <AnimatePresence mode="wait" initial={false}>
        {state === 'done' ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
            className="flex flex-col items-center py-4 text-center"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-accent text-on-accent">
              <Check className="h-7 w-7" strokeWidth={2.6} />
            </span>
            <h3 className="mt-4 font-display text-h3 font-semibold">You’re on the list</h3>
            <p className="mt-2 max-w-xs text-sm text-muted">
              We’ll send one message when {product.name}{variantLabel ? ` in ${variantLabel}` : ''} is back. Nothing else.
            </p>
            <Button className="mt-6 w-full" onClick={onClose}>Done</Button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} noValidate exit={{ opacity: 0 }}>
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-highlight">
                <BellRing className="h-5 w-5 text-accent-text" />
              </span>
              <p className="text-sm">
                <span className="font-semibold">{product.name}</span>
                {variantLabel && <span className="text-muted"> · {variantLabel}</span>}
                <span className="block text-muted">Sold out right now.</span>
              </p>
            </div>
            <div className="inset-group">
              <label className="inset-row block">
                <span className="block text-[12px] font-medium text-muted">Email</span>
                <input className="inset-field" type="email" inputMode="email" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </label>
              <label className="inset-row block">
                <span className="block text-[12px] font-medium text-muted">Phone for a text (optional)</span>
                <input className="inset-field" type="tel" inputMode="tel" autoComplete="tel"
                  value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 123 4567" />
              </label>
            </div>
            <p className="mt-3 px-1 text-xs text-muted">One message when this size is restocked. We don’t add you to any list.</p>
            {error && <p role="alert" className="mt-3 px-1 text-sm text-error">{error}</p>}
            <Button type="submit" size="lg" className="mt-5 w-full" loading={state === 'sending'}>Notify me</Button>
          </motion.form>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

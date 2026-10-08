import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Package, Truck, Home as HomeIcon, ClipboardCheck, CircleDot, ExternalLink, MessageCircle } from 'lucide-react';
import { useWhatsAppLink } from '../lib/whatsapp.js';
import SEO from '../components/SEO.jsx';
import { Button } from '../components/ui/index.jsx';
import { Label } from '../components/ui/Instrument.jsx';
import ProductImage from '../components/ui/ProductImage.jsx';
import { orderService } from '../services/index.js';
import { formatDate } from '../utils/format.js';
import { spring } from '../lib/motion.js';
import { getServerMessage } from '../utils/errors.js';

// The five stages a customer cares about, and which order statuses mean
// each one has been reached.
const STAGES = [
  { key: 'placed',     label: 'Order placed',   icon: ClipboardCheck, reached: () => true },
  { key: 'confirmed',  label: 'Confirmed',      icon: CircleDot,      reached: (s) => ['paid', 'processing', 'shipped', 'delivered'].includes(s) },
  { key: 'processing', label: 'Being prepared', icon: Package,        reached: (s) => ['processing', 'shipped', 'delivered'].includes(s) },
  { key: 'shipped',    label: 'On its way',     icon: Truck,          reached: (s) => ['shipped', 'delivered'].includes(s) },
  { key: 'delivered',  label: 'Delivered',      icon: HomeIcon,       reached: (s) => s === 'delivered' },
];
const STAGE_STATUSES = { confirmed: ['paid'], processing: ['processing'], shipped: ['shipped'], delivered: ['delivered'] };

const HEADLINE = {
  pending: 'Waiting for payment',
  awaiting_confirmation: "We've got your order",
  paid: 'Confirmed',
  processing: 'Being prepared',
  shipped: 'On its way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

// "Questions about this order?" with the order number already in the chat.
// Nothing shows until a WhatsApp number is set in Admin → Settings.
function OrderWhatsApp({ orderNumber }) {
  const href = useWhatsAppLink(`Hi UrbanPulse, I have a question about my order ${orderNumber}.`);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="press mt-6 flex items-center gap-3 rounded-2xl border border-border px-4 py-3 transition-colors hover:border-text">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#25D366] text-white" aria-hidden="true">
        <MessageCircle className="h-[18px] w-[18px]" />
      </span>
      <span className="flex-1 text-sm font-semibold">Questions about this order? Chat on WhatsApp</span>
    </a>
  );
}

function stageDate(result, key) {
  if (key === 'placed') return result.placed_at;
  const statuses = STAGE_STATUSES[key] ?? [];
  return result.history.find((h) => statuses.includes(h.status))?.created_at ?? null;
}

export default function TrackOrder() {
  const reduced = useReducedMotion();
  const [params] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get('order') ?? '');
  const [contact, setContact] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setError(''); }, [orderNumber, contact]);

  async function submit(e) {
    e.preventDefault();
    if (!orderNumber.trim() || !contact.trim()) {
      setError('Enter your order number and the email or phone you ordered with.');
      return;
    }
    setLoading(true);
    try {
      setResult(await orderService.track({ order_number: orderNumber.trim(), contact: contact.trim() }));
    } catch (err) {
      setResult(null);
      setError(getServerMessage(err, "Something went wrong. Try again in a moment."));
    } finally {
      setLoading(false);
    }
  }

  const ended = result && ['cancelled', 'refunded'].includes(result.status);

  return (
    <>
      <SEO title="Track an order" description="Check where your UrbanPulse order is with your order number and the email or phone you used." url="/track" />
      <div className="container-site max-w-xl" style={{ paddingBlock: 'var(--space-section)' }}>
        <Label className="mb-3 block">Orders / Track</Label>
        <h1 className="font-display text-h1 font-semibold">Where's my order?</h1>
        <p className="mt-3 text-muted">
          No account needed. Use the order number from your confirmation email and the email or phone number you ordered with.
        </p>

        <form onSubmit={submit} noValidate className="mt-8">
          <div className="inset-group">
            <label className="inset-row block">
              <span className="block text-[12px] font-medium text-muted">Order number</span>
              <input
                className="inset-field font-mono uppercase tracking-[0.02em]"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="UP-20261001-ABCDE"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
              />
            </label>
            <label className="inset-row block">
              <span className="block text-[12px] font-medium text-muted">Email or phone</span>
              <input
                className="inset-field"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="you@example.com or 024 123 4567"
                autoComplete="email"
                spellCheck={false}
              />
            </label>
          </div>
          <AnimatePresence initial={false}>
            {error && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={spring}
                className="mt-3 px-1 text-sm text-error"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          <Button type="submit" size="lg" className="mt-5 w-full" loading={loading}>Track order</Button>
        </form>

        <AnimatePresence mode="wait">
          {result && (
            <motion.section
              key={result.order_number + result.status}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring}
              className="mt-12"
              aria-live="polite"
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <Label className="block">{result.order_number}</Label>
                  <h2 className="mt-1 font-display text-h2 font-semibold">{HEADLINE[result.status] ?? 'In progress'}</h2>
                </div>
                <span className="shrink-0 text-sm text-muted">Placed {formatDate(result.placed_at)}</span>
              </div>

              {ended ? (
                <div className="inset-group mt-6">
                  <div className="inset-row text-sm">
                    This order was {result.status}. If that's unexpected, get in touch and quote the order number.
                  </div>
                </div>
              ) : (
                <ol className="inset-group mt-6">
                  {STAGES.map((st) => {
                    const done = st.reached(result.status);
                    const when = done ? stageDate(result, st.key) : null;
                    const Icon = done ? Check : st.icon;
                    return (
                      <li key={st.key} className="inset-row flex items-center gap-3.5">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? 'bg-accent text-on-accent' : 'bg-highlight text-muted'}`}>
                          <Icon className="h-4 w-4" strokeWidth={done ? 2.6 : 1.8} />
                        </span>
                        <span className={`flex-1 text-[15px] ${done ? 'font-semibold' : 'text-muted'}`}>{st.label}</span>
                        {when && <span className="text-xs text-muted">{formatDate(when)}</span>}
                      </li>
                    );
                  })}
                </ol>
              )}

              {result.tracking_url && (
                <a href={result.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-4 block">
                  <Button variant="outline" className="w-full">
                    Follow the courier {result.tracking_number ? `(${result.tracking_number})` : ''}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
              {!result.tracking_url && result.tracking_number && (
                <p className="mt-4 px-1 text-sm text-muted">Courier tracking number: <span className="font-mono text-text">{result.tracking_number}</span></p>
              )}

              {result.items?.length > 0 && (
                <>
                  <Label className="mb-2 mt-8 block px-1">In this order</Label>
                  <ul className="inset-group">
                    {result.items.map((it, i) => (
                      <li key={i} className="inset-row flex items-center gap-3">
                        <div className="plate h-14 w-12 shrink-0">
                          <ProductImage src={it.product_image} alt="" initial={it.product_name} displayWidth={56} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium">{it.product_name}</p>
                          {it.variant_description && it.variant_description !== '/' && (
                            <p className="text-xs text-muted">{it.variant_description.replace(/^\s*\/\s*|\s*\/\s*$/g, '')}</p>
                          )}
                        </div>
                        <span className="text-sm text-muted">× {it.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {(result.city || result.region) && (
                <p className="mt-4 px-1 text-xs text-muted">Delivering to {[result.city, result.region].filter(Boolean).join(', ')}.</p>
              )}
              <OrderWhatsApp orderNumber={result.order_number} />
            </motion.section>
          )}
        </AnimatePresence>

        <p className="mt-12 text-sm text-muted">
          Have an account? <Link to="/account" className="text-accent-text underline underline-offset-2">Your orders</Link> show the full details.
        </p>
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Package, Download, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/index.jsx';
import { orderService } from '../services/index.js';
import { useCartStore } from '../stores/cartStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { staggerContainer, fadeInUp } from '../lib/motion.js';
import Confetti from '../components/ui/Confetti.jsx';
import { vibrate } from '../utils/haptic.js';

function DownloadReceiptButton({ orderId, orderNumber }) {
  const [downloading, setDownloading] = useState(false);
  async function download() {
    setDownloading(true);
    try { await orderService.downloadReceipt(orderId, orderNumber); }
    catch { toast.error('Could not download receipt. Please try again.'); }
    finally { setDownloading(false); }
  }
  return (
    <button
      type="button"
      onClick={download}
      disabled={downloading}
      className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {downloading
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Download className="h-3.5 w-3.5" />}
      {downloading ? 'Downloading…' : 'Download receipt (PDF)'}
    </button>
  );
}

export default function OrderSuccess() {
  const [params] = useSearchParams();
  const id        = params.get('id');
  const reference = params.get('reference');
  const cod       = params.get('cod');
  const [order, setOrder]     = useState(null);
  const [history, setHistory] = useState([]);
  const [confetti, setConfetti] = useState(false);
  const refreshCart = useCartStore((s) => s.refresh);
  const user = useAuthStore((s) => s.user);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    refreshCart();
    async function load() {
      if (reference && !cod) {
        try { await orderService.verify(reference); } catch { /* ignore */ }
      }
      if (id) {
        try {
          setOrder(await orderService.get(id));
          orderService.history(id).then(setHistory).catch(() => {});
        } catch { /* ignore */ }
      }
    }
    load();
    const t = setTimeout(() => { setConfetti(true); vibrate([40, 30, 40]); }, 400);
    return () => clearTimeout(t);
  }, [id, reference, cod, refreshCart]);

  const firstName = user?.name?.split(' ')[0] ?? null;

  return (
    <>
      <Confetti trigger={confetti && !prefersReduced} />
      <Helmet>
        <title>Order confirmed — UrbanPulse</title>
      </Helmet>

      <div className="container-site grid place-items-center py-16 md:py-24">
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-xl"
        >
          {/* Success icon */}
          <motion.div
            initial={prefersReduced ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/15 text-accent"
          >
            <Check className="h-8 w-8" />
          </motion.div>

          {/* Heading + order number */}
          <div className="mt-6 text-center">
            <h1 className="text-display font-display font-bold leading-tight">
              Thank you{firstName ? `, ${firstName}` : ''}.
            </h1>
            {order && (
              <p className="mt-2 font-mono text-small text-muted tracking-wider">
                {order.order_number}
              </p>
            )}
            <p className="mt-3 text-muted max-w-sm mx-auto">
              {cod
                ? "We'll call or WhatsApp you shortly to confirm. Cash will be collected on delivery."
                : 'Your order is confirmed. A receipt is on its way to your inbox.'}
            </p>
          </div>

          {/* Order summary card */}
          {order && (
            <div className="mt-8 rounded-xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-accent" />
                  <span className="font-semibold font-mono text-sm">{order.order_number}</span>
                </div>
                <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase text-accent">
                  {order.status}
                </span>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Items</dt>
                  <dd>{order.items?.length ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Total</dt>
                  <dd className="font-mono text-base font-bold">{formatCurrency(order.total)}</dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-border pt-4">
                {(() => {
                  const isPaid  = order.payment_status === 'paid';
                  const isCOD   = order.payment_method === 'cod';
                  const codDone = isCOD && ['delivered', 'paid'].includes(order.status);
                  if (!isPaid && !codDone) {
                    return (
                      <p className="text-xs text-muted">
                        Your receipt will be available once we deliver and confirm payment.
                      </p>
                    );
                  }
                  return <DownloadReceiptButton orderId={order.id} orderNumber={order.order_number} />;
                })()}
              </div>
            </div>
          )}

          {/* Pre-order items */}
          {(order?.items ?? []).some((i) => i.is_preorder) && (
            <div className="mt-4 rounded-xl border border-border bg-surface p-5">
              <p className="mb-3 font-display text-sm font-semibold">Pre-order items</p>
              <ul className="space-y-2">
                {(order.items ?? []).filter((i) => i.is_preorder).map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span>{item.product_name} <span className="text-muted">× {item.quantity}</span></span>
                    {item.preorder_ships_at && (
                      <span className="text-xs text-accent">Ships {formatDate(item.preorder_ships_at)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Order timeline */}
          {history.length > 0 && (
            <div className="mt-6 rounded-xl border border-border bg-surface p-6">
              <p className="mb-4 font-display text-sm font-semibold">Order timeline</p>
              <motion.ol
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-0"
              >
                {history.map((h, i) => (
                  <motion.li key={h.id} variants={fadeInUp} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                      {i < history.length - 1 && <span className="my-1 w-px flex-1 bg-border" />}
                    </div>
                    <div className="pb-4">
                      <div className="text-sm font-semibold capitalize">{h.status}</div>
                      {h.note && <div className="text-xs text-muted">{h.note}</div>}
                      <div className="text-xs text-muted">{formatDate(h.created_at)}</div>
                    </div>
                  </motion.li>
                ))}
              </motion.ol>
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/shop">
              <Button variant="outline">Continue shopping</Button>
            </Link>
            {id && (
              <Link to="/account/orders">
                <Button>View your orders</Button>
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}

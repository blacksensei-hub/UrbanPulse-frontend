import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, animate } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Minus, Plus, Trash2, ShoppingBag, Lock, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../../stores/cartStore.js';
import { Button } from '../ui/index.jsx';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { spring } from '../../lib/motion.js';
import FreeShippingBar from './FreeShippingBar.jsx';

function useCountUp(value, duration = 400) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf  = useRef(null);

  useEffect(() => {
    const from = prev.current;
    const to   = value;
    if (from === to) return;
    const start = performance.now();
    cancelAnimationFrame(raf.current);
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(from + (to - from) * t);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else prev.current = to;
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return display;
}

function SwipeItem({ it, remove, update, closeDrawer, prefersReduced }) {
  const x = useMotionValue(0);

  async function handleDragEnd(_, info) {
    const commit = info.offset.x < -120 || info.velocity.x < -500;
    if (commit) {
      await animate(x, -500, { duration: 0.2, ease: 'easeIn' });
      remove(it.id);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }

  return (
    <motion.div
      drag={prefersReduced ? false : 'x'}
      dragConstraints={{ left: -120, right: 0 }}
      dragElastic={{ left: 0.05, right: 0 }}
      style={{ x }}
      onDragEnd={handleDragEnd}
      className="flex gap-4 bg-surface p-0"
    >
      <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-md overflow-hidden bg-border flex-shrink-0">
        {it.images?.[0] && (
          <img src={it.images[0]} alt={it.name} loading="lazy" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link to={`/products/${it.slug}`} onClick={closeDrawer} className="font-medium hover:text-accent transition-colors">
          {it.name}
        </Link>
        <div className="flex items-center gap-1 mt-0.5">
          {it.size && <span className="text-xs bg-border rounded px-1.5 py-0.5 font-medium">{it.size}</span>}
          {it.color && <span className="text-xs bg-border rounded px-1.5 py-0.5 font-medium">{it.color}</span>}
        </div>
        {it.is_preorder && it.preorder_ships_at && (
          <p className="text-xs text-accent mt-0.5">Ships {formatDate(it.preorder_ships_at)}</p>
        )}
        <p className="font-semibold mt-1">{formatCurrency(it.price)}</p>
        <div className="flex items-center gap-3 mt-2.5">
          <div className="flex items-center border border-border rounded-full">
            <button
              onClick={() => update(it.id, Math.max(0, it.quantity - 1))}
              aria-label="Decrease quantity"
              className="w-9 h-9 flex items-center justify-center hover:text-accent transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="px-2 min-w-[24px] text-center font-medium text-small">{it.quantity}</span>
            <button
              onClick={() => {
                if (it.quantity >= it.stock) return;
                update(it.id, it.quantity + 1).catch((err) =>
                  toast.error(err?.response?.data?.message ?? 'Could not update cart')
                );
              }}
              disabled={it.quantity >= it.stock}
              aria-label="Increase quantity"
              className="w-9 h-9 flex items-center justify-center hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          <button
            onClick={() => remove(it.id)}
            aria-label={`Remove ${it.name}`}
            className="text-muted hover:text-error transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
        {it.quantity >= it.stock && (
          <p className="mt-1 text-xs text-muted">Max stock reached</p>
        )}
      </div>
    </motion.div>
  );
}

export default function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, update, remove } = useCartStore();
  const isEmpty         = !cart.items?.length;
  const prefersReduced  = useReducedMotion();
  const displaySubtotal = useCountUp(Number(cart.subtotal) || 0);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e) { if (e.key === 'Escape') closeDrawer(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeDrawer}
          />
          <motion.aside
            role="dialog" aria-modal="true" aria-label="Shopping cart"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={spring}
            className="fixed top-0 right-0 z-[100] h-full w-full sm:w-[400px] md:w-[480px] xl:w-[560px] glass-strong flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-display text-h3 font-semibold">Your bag</h3>
              <button
                onClick={closeDrawer}
                aria-label="Close cart"
                className="w-10 h-10 rounded-full hover:bg-highlight flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Free-shipping progress bar — pinned below header */}
            <div className="px-5 pt-4 pb-2">
              <FreeShippingBar subtotal={cart.subtotal} />
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {isEmpty ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-16">
                  <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center">
                    <ShoppingBag size={26} />
                  </div>
                  <div>
                    <p className="font-display text-h3 mb-1">Your bag is empty</p>
                    <p className="text-muted text-small">Start with the new drops.</p>
                  </div>
                  <Button onClick={closeDrawer} as={Link} to="/shop">
                    <Link to="/shop" onClick={closeDrawer}>Shop now</Link>
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  <AnimatePresence initial={false}>
                    {cart.items.map((it) => (
                      <motion.li
                        key={it.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 60 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className="relative overflow-hidden rounded-lg"
                      >
                        {/* Red remove panel revealed on swipe */}
                        <div
                          className="absolute inset-y-0 right-0 flex items-center justify-end gap-1.5 bg-error px-4 rounded-r-lg"
                          aria-hidden="true"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                          <span className="text-xs font-semibold text-white">Remove</span>
                        </div>
                        <SwipeItem
                          it={it}
                          remove={remove}
                          update={update}
                          closeDrawer={closeDrawer}
                          prefersReduced={prefersReduced}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer — summary + checkout */}
            {!isEmpty && (
              <div className="p-5 border-t border-border space-y-3">
                <div className="flex items-center justify-between text-small text-muted">
                  <span>Subtotal</span>
                  <span className="font-medium text-text font-mono">{formatCurrency(displaySubtotal)}</span>
                </div>
                <p className="text-small text-muted">Shipping & taxes calculated at checkout.</p>
                {(() => {
                  const items = cart.items ?? [];
                  const hasPreorder = items.some(i => i.is_preorder);
                  const hasInStock  = items.some(i => !i.is_preorder);
                  if (!hasPreorder || !hasInStock) return null;
                  const latest = items
                    .filter(i => i.is_preorder && i.preorder_ships_at)
                    .reduce((m, i) => !m || new Date(i.preorder_ships_at) > new Date(m) ? i.preorder_ships_at : m, null);
                  return (
                    <p className="text-xs text-muted border-t border-border pt-2">
                      This order ships in two parts — in-stock items within 2 business days; pre-order items from {latest ? formatDate(latest) : 'the estimated date'}.
                    </p>
                  );
                })()}

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-5 py-2 border-t border-border text-xs text-muted">
                  <div className="flex items-center gap-1.5">
                    <Lock size={12} className="flex-shrink-0" />
                    <span>Secure checkout</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Truck size={12} className="flex-shrink-0" />
                    <span>Free shipping over GH₵ 1,000</span>
                  </div>
                </div>

                <Link to="/checkout" onClick={closeDrawer} className="block">
                  <Button className="w-full" size="lg">
                    Checkout · {formatCurrency(displaySubtotal)}
                  </Button>
                </Link>
                <button
                  onClick={closeDrawer}
                  className="w-full text-small text-muted hover:text-text py-2 transition-colors"
                >
                  Continue shopping
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, animate } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Minus, Plus, Trash2, ShoppingBag, Lock, Truck } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore.js';
import { useSetting } from '../../stores/settingsStore.js';
import { Button } from '../ui/index.jsx';
import ProductImage from '../ui/ProductImage.jsx';
import { Label } from '../ui/Instrument.jsx';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { showUndoToast } from '../../utils/undoToast.jsx';
import { useDebouncedCartQuantity } from '../../hooks/useDebouncedCartQuantity.js';
import { useSwipe } from '../../hooks/useSwipe.js';
import { spring, springFlick } from '../../lib/motion.js';
import SideDrawer from '../ui/SideDrawer.jsx';
import FreeShippingBar from './FreeShippingBar.jsx';
import BundleOffer from './BundleOffer.jsx';

// How far a row opens to show its Remove action when released part-way.
const REVEAL = 96;

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

// A cart line you can swipe left, the way Mail does it: release part-way and
// it rests open on a Remove button; throw it (or drag past halfway) and it
// carries on off the left edge at the finger's speed and is removed.
function SwipeItem({ it, onRemove, getQuantity, setQuantity, closeDrawer, prefersReduced }) {
  const x = useMotionValue(0);
  const rowRef = useRef(null);
  const qty = getQuantity(it);

  const swipe = useSwipe({
    axis: 'x',
    value: x,
    max: 0,                      // dragging right past closed rubber-bands
    dimension: 160,
    enabled: !prefersReduced,
    // A closed row only answers leftward swipes (rightward ones close the
    // drawer); an open row can be pushed either way.
    commitDirection: () => (x.get() < 0 ? 0 : -1),
    onRelease: ({ projected, velocity }) => {
      const width = rowRef.current?.offsetWidth || 320;
      if (projected < -width * 0.55) {
        animate(x, -width, { ...springFlick, velocity }).then(() => onRemove(it, true));
      } else {
        animate(x, projected < -REVEAL / 2 ? -REVEAL : 0, { ...springFlick, velocity });
      }
    },
  });

  return (
    <>
      {/* The Remove action sits under the row and shows through as it slides. */}
      <button
        type="button"
        onClick={() => onRemove(it, true)}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-end gap-1.5 rounded-lg bg-error pr-4 text-white"
      >
        <Trash2 className="h-4 w-4" />
        <span className="text-xs font-semibold">Remove</span>
      </button>
      <motion.div
        ref={rowRef}
        {...swipe}
        style={{ ...swipe.style, x }}
        className="relative flex gap-4 bg-surface p-0"
      >
        <div className="plate h-24 w-20 flex-shrink-0 sm:h-28 sm:w-24">
          <ProductImage src={it.images?.[0]} alt={it.name} loading="lazy" displayWidth={96} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`/products/${it.slug}`} onClick={closeDrawer} title={it.name} className="block truncate font-medium hover:text-accent-text transition-colors">
            {it.name}
          </Link>
          <div className="flex items-center gap-1 mt-0.5">
            {it.size && <Label className="rounded border border-border bg-highlight px-1.5 py-0.5">{it.size}</Label>}
            {it.color && <Label className="rounded border border-border bg-highlight px-1.5 py-0.5">{it.color}</Label>}
          </div>
          {it.is_preorder && it.preorder_ships_at && (
            <p className="text-xs text-accent-text mt-0.5">Ships {formatDate(it.preorder_ships_at)}</p>
          )}
          <p className="mt-1 font-mono text-sm font-semibold tabular-nums">{formatCurrency(Number(it.price) * qty)}</p>
          <div className="flex items-center gap-3 mt-2.5">
            <div className="flex items-center border border-border rounded-full">
              <button
                onClick={() => setQuantity(it, qty - 1, 0)}
                aria-label="Decrease quantity"
                className="press w-11 h-11 flex items-center justify-center hover:text-accent-text transition-colors"
              >
                <Minus size={14} className="pointer-events-none" />
              </button>
              <span className="px-2 min-w-[24px] text-center font-medium text-small">{qty}</span>
              <button
                onClick={() => setQuantity(it, qty + 1, 0)}
                disabled={qty >= it.stock}
                aria-label="Increase quantity"
                className="press w-11 h-11 flex items-center justify-center hover:text-accent-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={14} className="pointer-events-none" />
              </button>
            </div>
            <button
              onClick={() => onRemove(it, false)}
              aria-label={`Remove ${it.name}`}
              className="press w-11 h-11 flex items-center justify-center hover:text-error transition-colors"
            >
              <Trash2 size={16} className="pointer-events-none" />
            </button>
          </div>
          {qty >= it.stock && (
            <p className="mt-1 text-xs text-muted">Max stock reached</p>
          )}
        </div>
      </motion.div>
    </>
  );
}

export default function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, update, remove, add } = useCartStore();
  const isEmpty         = !cart.items?.length;
  const prefersReduced  = useReducedMotion();
  const displaySubtotal = useCountUp(Number(cart.subtotal) || 0);
  const { getQuantity, setQuantity } = useDebouncedCartQuantity(update);
  const freeShipThreshold = useSetting('free_shipping_threshold_ghs', '1000');

  // `swiped`: the row already left by the swipe, so the list shouldn't
  // animate it out a second time.
  const swipedOut = useRef(new Set());
  function handleRemove(it, swiped) {
    if (swiped) swipedOut.current.add(it.id);
    remove(it.id);
    showUndoToast({
      message: 'Removed from cart',
      onUndo: () => add(it.variant_id, it.quantity),
    });
  }

  return (
    <SideDrawer
      open={drawerOpen}
      onClose={closeDrawer}
      label="Shopping cart"
      className="w-full sm:w-[400px] md:w-[480px] xl:w-[560px]"
    >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/70 p-5">
              <div>
                <Label className="mb-1 block">Bag / {(cart.items ?? []).length} {(cart.items ?? []).length === 1 ? 'line' : 'lines'}</Label>
                <h3 className="font-display text-h3 font-semibold leading-none">Your bag</h3>
              </div>
              <button
                onClick={closeDrawer}
                aria-label="Close cart"
                className="press w-10 h-10 rounded-full hover:bg-highlight flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Free-shipping progress bar · pinned below header */}
            <div className="px-5 pt-4 pb-2">
              <FreeShippingBar subtotal={cart.subtotal} />
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
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
                <>
                  <ul className="flex flex-col gap-4">
                    <AnimatePresence initial={false} custom={swipedOut.current}>
                      {cart.items.map((it) => (
                        <motion.li
                          key={it.id}
                          layout
                          custom={swipedOut.current}
                          variants={{
                            initial: { opacity: 0, y: 10 },
                            animate: { opacity: 1, y: 0 },
                            // Leaves the way it was sent: to the left. A swiped
                            // row is already gone, so it just closes the gap.
                            // (Decided at exit time via `custom`, not at the
                            // last render, which predates the swipe.)
                            exit: (swiped) => (swiped.has(it.id) ? { opacity: 0, height: 0 } : { opacity: 0, x: -48 }),
                          }}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={spring}
                          className="relative overflow-hidden rounded-lg"
                        >
                          <SwipeItem
                            it={it}
                            onRemove={handleRemove}
                            getQuantity={getQuantity}
                            setQuantity={setQuantity}
                            closeDrawer={closeDrawer}
                            prefersReduced={prefersReduced}
                          />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                  <BundleOffer items={cart.items} />
                </>
              )}
            </div>

            {/* Footer · summary + checkout */}
            {!isEmpty && (
              <div className="p-5 border-t border-border/70 space-y-3">
                <div className="flex items-baseline justify-between">
                  <Label>Subtotal</Label>
                  <span className="font-mono text-base font-semibold tabular-nums">{formatCurrency(displaySubtotal)}</span>
                </div>
                <Label className="block !normal-case !tracking-normal">Shipping and taxes calculated at checkout.</Label>
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
                      This order ships in two parts. In-stock items within 2 business days, pre-order items from {latest ? formatDate(latest) : 'the estimated date'}.
                    </p>
                  );
                })()}

                {/* Trust badges */}
                <div className="label-mono flex items-center justify-center gap-5 border-t border-border py-2">
                  <div className="flex items-center gap-1.5">
                    <Lock size={12} className="flex-shrink-0" />
                    <span>Secure checkout</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Truck size={12} className="flex-shrink-0" />
                    <span>Free shipping over {formatCurrency(freeShipThreshold)}</span>
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
    </SideDrawer>
  );
}

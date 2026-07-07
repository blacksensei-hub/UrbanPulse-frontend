import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

import { Button } from '../components/ui/index.jsx';
import SEO from '../components/SEO.jsx';
import ProductImage from '../components/ui/ProductImage.jsx';
import StickyActionBar from '../components/ui/StickyActionBar.jsx';
import { useCartStore } from '../stores/cartStore.js';
import { productService } from '../services/index.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { showUndoToast } from '../utils/undoToast.jsx';
import { useDebouncedCartQuantity } from '../hooks/useDebouncedCartQuantity.js';
import { fadeInUp, staggerContainer } from '../lib/motion.js';
import ProductCard from '../components/product/ProductCard.jsx';
import FreeShippingBar from '../components/cart/FreeShippingBar.jsx';

function useCountUp(value, duration = 400) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf = useRef(null);
  useEffect(() => {
    const from = prev.current;
    const to = value;
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

export default function Cart() {
  const { cart, update, remove, add } = useCartStore();
  const items = cart?.items ?? [];
  const { getQuantity, setQuantity } = useDebouncedCartQuantity(update);
  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.price) * getQuantity(i),
    0,
  );
  const displaySubtotal = useCountUp(subtotal);

  function handleRemove(item) {
    remove(item.id);
    showUndoToast({
      message: 'Removed from cart',
      onUndo: () => add(item.variant_id, item.quantity),
    });
  }

  const [bestSellers, setBestSellers] = useState([]);
  useEffect(() => {
    if (items.length === 0) {
      productService.list({ sort: 'rating', limit: 4 })
        .then((d) => setBestSellers(d.items ?? []))
        .catch(() => {});
    }
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="container-site py-16 md:py-24">
        <SEO title="Your bag" />
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
            <ShoppingBag className="h-9 w-9 text-accent" />
          </div>
          <h1 className="mt-6 font-display text-h2 font-bold">Your bag is empty</h1>
          <p className="mt-2 max-w-sm text-muted">
            Looks like you haven&apos;t added anything yet.
          </p>
          <Link to="/shop" className="mt-6">
            <Button size="lg">Browse the collection</Button>
          </Link>
        </div>
        {bestSellers.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-h3 font-bold mb-6">You might like</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {bestSellers.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <SEO title="Cart" />

      <div className="container-site py-8 pb-28 md:py-12 lg:pb-12">
        <h1 className="font-display text-h1 font-bold">Your cart</h1>
        <p className="mt-1 text-sm text-muted">
          {items.length} {items.length === 1 ? 'piece' : 'pieces'}
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <motion.ul
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface"
          >
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const qty = getQuantity(item);
                return (
                <motion.li
                  key={item.id}
                  variants={fadeInUp}
                  exit={{ opacity: 0, x: 60 }}
                  layout
                  className="flex gap-4 p-5"
                >
                  <Link
                    to={`/products/${item.slug}`}
                    className="shrink-0 overflow-hidden rounded-md bg-border"
                  >
                    <ProductImage
                      src={item.image}
                      alt={item.name}
                      className="h-28 w-24 object-cover sm:h-32 sm:w-28"
                      loading="lazy"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/products/${item.slug}`}
                          title={item.name}
                          className="block truncate font-display text-base font-semibold hover:text-accent"
                        >
                          {item.name}
                        </Link>
                        <div className="mt-1 text-xs text-muted">
                          {[item.size, item.color].filter(Boolean).join(' \u00B7 ')}
                        </div>
                        {item.is_preorder && item.preorder_ships_at && (
                          <div className="mt-0.5 text-xs text-accent">
                            Ships {formatDate(item.preorder_ships_at)}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(item)}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-bg hover:text-error"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-lg border border-border">
                        <button
                          onClick={() => setQuantity(item, qty - 1, 1)}
                          className="grid h-9 w-9 place-items-center hover:bg-bg"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">
                          {qty}
                        </span>
                        <button
                          onClick={() => setQuantity(item, qty + 1, 1)}
                          disabled={qty >= item.stock}
                          className="grid h-9 w-9 place-items-center hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Increase"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="font-mono font-semibold">
                        {formatCurrency(Number(item.price) * qty)}
                      </div>
                    </div>
                    {qty >= item.stock && (
                      <p className="mt-1 text-xs text-muted">Max stock reached</p>
                    )}
                  </div>
                </motion.li>
              );})}
            </AnimatePresence>
          </motion.ul>

          {/* Summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="font-display text-lg font-semibold">Order summary</h2>
              <div className="mt-4">
                <FreeShippingBar subtotal={subtotal} />
              </div>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-semibold">{formatCurrency(displaySubtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Shipping</dt>
                  <dd className="text-muted">Calculated at checkout</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-base">
                  <dt className="font-semibold">Total</dt>
                  <dd className="font-display text-lg font-bold">
                    {formatCurrency(displaySubtotal)}
                  </dd>
                </div>
              </dl>
              {(() => {
                const cartItems = cart.items ?? [];
                const hasPreorder = cartItems.some(i => i.is_preorder);
                const hasInStock  = cartItems.some(i => !i.is_preorder);
                if (!hasPreorder || !hasInStock) return null;
                const latest = cartItems.filter(i => i.is_preorder && i.preorder_ships_at)
                  .reduce((m, i) => !m || new Date(i.preorder_ships_at) > new Date(m) ? i.preorder_ships_at : m, null);
                return (
                  <p className="mt-4 text-xs text-muted">
                    This order ships in two parts — in-stock items within 2 business days; pre-order items from {latest ? formatDate(latest) : 'the estimated date'}.
                  </p>
                );
              })()}
              <Link to="/checkout" className="mt-6 block">
                <Button size="lg" className="w-full">
                  Checkout
                </Button>
              </Link>
              <Link
                to="/shop"
                className="mt-3 block text-center text-sm text-muted hover:text-text"
              >
                Continue shopping
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <StickyActionBar>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted">Total</p>
          <p className="font-mono font-semibold">{formatCurrency(displaySubtotal)}</p>
        </div>
        <Link to="/checkout" className="shrink-0">
          <Button size="sm">Checkout</Button>
        </Link>
      </StickyActionBar>
    </>
  );
}

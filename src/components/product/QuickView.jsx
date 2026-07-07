import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

import Modal from '../ui/Modal.jsx';
import { Button } from '../ui/index.jsx';
import ProductImage from '../ui/ProductImage.jsx';
import { productService } from '../../services/index.js';
import { useCartStore } from '../../stores/cartStore.js';
import { formatCurrency, cn } from '../../utils/format.js';
import { vibrate } from '../../utils/haptic.js';
import { prefersReducedMotion } from '../../utils/motion.js';

const COLOR_MAP = {
  black: '#1a1a1a', 'jet black': '#1a1a1a',
  white: '#f9f9f9', 'bone white': '#f0e9dd', bone: '#f0e9dd', ivory: '#f5f0e8', cream: '#f0e9dd',
  grey: '#9ca3af', gray: '#9ca3af', slate: '#64748b',
  navy: '#1e3a5f', khaki: '#c3b091', olive: '#6b7345',
  tan: '#d2b48c', camel: '#c19a6b', sand: '#c2b280',
  red: '#dc2626', burgundy: '#800020', green: '#16a34a', forest: '#228b22',
  blue: '#2563eb', yellow: '#eab308', orange: '#f97316', pink: '#ec4899', purple: '#9333ea',
};

export function swatchColor(name) {
  return COLOR_MAP[name?.toLowerCase()] ?? null;
}

export function showAddedToast(product, priceText) {
  const reducedMotion = prefersReducedMotion();

  toast.custom(
    (t) => (
      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={reducedMotion ? { opacity: 0 } : { x: 60, opacity: 0 }}
        className={cn(
          'glass-strong flex items-center gap-3 border border-accent rounded-xl shadow-elevated px-4 py-3 max-w-[300px]',
          !t.visible && 'opacity-0',
        )}
      >
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            className="h-10 w-10 rounded-lg object-cover shrink-0"
            alt=""
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{product.name}</p>
          <p className="text-xs text-muted">
            {priceText ? `Added · ${priceText}` : 'Added to cart'}
          </p>
        </div>
        <Link
          to="/cart"
          onClick={() => toast.dismiss(t.id)}
          className="text-xs font-semibold text-accent shrink-0 hover:text-accent-hover"
        >
          View cart
        </Link>
      </motion.div>
    ),
    { duration: 3500, position: 'top-right', id: 'cart-preview' },
  );
}

export default function QuickView({ slug, open, onClose }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const add = useCartStore((s) => s.add);

  useEffect(() => {
    if (!open || !slug) return;
    setLoading(true);
    setProduct(null);
    setActiveImage(0);
    setQty(1);
    productService
      .get(slug)
      .then((data) => {
        setProduct(data);
        const colors = [...new Set(data.variants?.map((v) => v.color).filter(Boolean))];
        const sizes = [...new Set(data.variants?.map((v) => v.size).filter(Boolean))];
        setSelectedColor(colors[0] ?? null);
        setSelectedSize(sizes[0] ?? null);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [open, slug]);

  const colors = useMemo(
    () => (product ? [...new Set(product.variants.map((v) => v.color).filter(Boolean))] : []),
    [product],
  );
  const sizes = useMemo(
    () => (product ? [...new Set(product.variants.map((v) => v.size).filter(Boolean))] : []),
    [product],
  );
  const variant = useMemo(() => {
    if (!product) return null;
    return product.variants.find(
      (v) =>
        (!selectedSize || v.size === selectedSize) &&
        (!selectedColor || v.color === selectedColor),
    );
  }, [product, selectedSize, selectedColor]);

  async function handleAdd() {
    if (!variant) return toast.error('Pick your size and color first.');
    if (variant.stock <= 0) return toast.error('Out of stock.');
    setAdding(true);
    try {
      await add(variant.id, qty);
      vibrate(10);
      showAddedToast(product, formatCurrency(variant.price ?? product.price));
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  }

  const images = product?.images?.length
    ? product.images
    : ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'];

  return (
    <Modal open={open} onClose={onClose} maxWidth="700px">
      {loading && (
        <div className="grid sm:grid-cols-2 gap-6 p-6">
          <div className="skeleton aspect-[4/5] rounded-xl" />
          <div className="space-y-4 py-2">
            <div className="skeleton h-5 w-3/4 rounded" />
            <div className="skeleton h-4 w-1/4 rounded" />
            <div className="skeleton h-8 w-full rounded-full" />
            <div className="skeleton h-10 w-full rounded" />
            <div className="skeleton h-12 w-full rounded-full" />
          </div>
        </div>
      )}

      {!loading && !product && (
        <div className="p-8 text-center text-muted">
          <p>Couldn&apos;t load product.</p>
          <Link
            to={`/products/${slug}`}
            className="mt-2 inline-block text-accent text-sm hover:text-accent-hover"
          >
            View full page →
          </Link>
        </div>
      )}

      {!loading && product && (
        <div className="grid sm:grid-cols-2 gap-0">
          {/* Image */}
          <div className="p-4 space-y-2">
            <div className="aspect-[4/5] overflow-hidden rounded-xl bg-surface">
              <AnimatePresence mode="wait">
                <motion.div
                  key={images[activeImage]}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full"
                >
                  <ProductImage
                    src={images[activeImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                    className={cn(
                      'shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                      i === activeImage ? 'border-accent' : 'border-transparent',
                    )}
                  >
                    <ProductImage src={src} alt="" initial={product.name} className="h-14 w-14 object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            <div>
              <Link
                to={`/products/${product.slug}`}
                onClick={onClose}
                className="font-display text-h3 font-bold hover:text-accent transition-colors"
              >
                {product.name}
              </Link>
              <p className="text-xs text-muted mt-0.5">{product.category}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-xl font-bold">
                  {formatCurrency(product.price)}
                </span>
                {product.compare_at_price &&
                  Number(product.compare_at_price) > Number(product.price) && (
                    <span className="text-sm text-muted line-through">
                      {formatCurrency(product.compare_at_price)}
                    </span>
                  )}
              </div>
            </div>

            {/* Color swatches */}
            {colors.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider">Color</span>
                  <span className="text-xs text-muted">{selectedColor}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const hex = swatchColor(c);
                    const oos = !product.variants.some(
                      (v) =>
                        v.color === c &&
                        (!selectedSize || v.size === selectedSize) &&
                        v.stock > 0,
                    );
                    return (
                      <button
                        key={c}
                        onClick={() => !oos && setSelectedColor(c)}
                        title={c}
                        aria-label={c}
                        className={cn(
                          'w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center',
                          selectedColor === c
                            ? 'border-accent scale-110'
                            : 'border-transparent hover:border-text/40',
                          oos && 'opacity-40 cursor-not-allowed',
                        )}
                        style={
                          hex
                            ? { backgroundColor: hex }
                            : { backgroundColor: 'var(--color-border)' }
                        }
                      >
                        {!hex && (
                          <span className="text-[8px] font-bold leading-none">
                            {c.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size pills */}
            {sizes.length > 0 && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider">Size</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sizes.map((s) => {
                    const v = product.variants.find(
                      (x) => x.size === s && (!selectedColor || x.color === selectedColor),
                    );
                    const oos = !v || v.stock <= 0;
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          if (oos) {
                            toast('Notify me when back in stock — coming soon', { icon: '🔔' });
                            return;
                          }
                          setSelectedSize(s);
                        }}
                        className={cn(
                          'rounded-full border px-3 py-1 text-sm font-medium transition-all',
                          selectedSize === s
                            ? 'border-accent bg-accent text-white'
                            : 'border-border hover:border-text',
                          oos && 'opacity-40 line-through',
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Qty */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Qty</span>
              <div className="inline-flex items-center rounded-lg border border-border">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid h-9 w-9 place-items-center hover:bg-surface"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(variant?.stock ?? 1, q + 1))}
                  disabled={!variant || variant.stock <= 0 || qty >= variant.stock}
                  className="grid h-9 w-9 place-items-center hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleAdd}
              loading={adding}
              disabled={!variant || variant.stock <= 0}
            >
              {variant && variant.stock <= 0 ? 'Out of stock' : 'Add to cart'}
            </Button>

            <Link
              to={`/products/${product.slug}`}
              onClick={onClose}
              className="text-center text-xs text-muted hover:text-accent transition-colors"
            >
              View full details →
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}

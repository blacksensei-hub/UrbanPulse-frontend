import { motion } from 'framer-motion';
import { Star, Heart, Minus, Plus, Lock, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Button, Input } from '../components/ui/index.jsx';
import { cn, formatCurrency, formatDate, formatRelativeDate } from '../utils/format.js';
import { spring } from '../lib/motion.js';
import { swatchColor } from '../components/product/QuickView.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import RecentlyViewed from '../components/product/RecentlyViewed.jsx';
import ProductImage from '../components/ui/ProductImage.jsx';

const SITE_URL = import.meta.env.VITE_APP_URL || 'https://urbanpulse.com';

const EDITORIAL_META = {
  'pulse-hoodie-bone-white': {
    eyebrow: "Field Series · Spring ‘26",
    annotation: {
      label: 'Drop-shoulder hem',
      x: '52%',
      y: '65%',
    },
    metadata: {
      Materials: '380GSM heavyweight fleece, 65% cotton / 35% polyester',
      Cut: 'Oversized drop-shoulder, ribbed cuffs and hem',
      Care: 'Machine wash cold, do not tumble dry',
    },
    spreads: [
      {
        eyebrow: 'The Fabric',
        body: 'Constructed from a 380GSM heavyweight fleece blend engineered to hold its shape through seasons of wear.',
      },
      {
        eyebrow: 'The Construction',
        body: 'Triple-stitched seams and a reinforced kangaroo pocket. Every edge finished, every stitch counted.',
      },
    ],
  },
};

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              n <= value ? 'fill-accent text-accent' : 'text-border',
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProductDetailEditorial({
  product,
  related,
  variant,
  colors,
  sizes,
  selectedColor,
  setSelectedColor,
  selectedSize,
  setSelectedSize,
  quantity,
  setQuantity,
  handleAdd,
  adding,
  handleWishlist,
  wishlistToggling,
  wishlisted,
  user,
  reviewRating,
  setReviewRating,
  reviewComment,
  setReviewComment,
  reviewImageUrl,
  setReviewImageUrl,
  submittingReview,
  reviewError,
  handleReviewSubmit,
  hasReviewed,
  reviewsEnabled,
  prefersReduced,
  atcRef,
  isPreorder,
  spotsLeft,
  preordersEnabled,
  wishlistBtnRef,
}) {
  const meta = EDITORIAL_META[product.slug] ?? {
    eyebrow: product.category,
    annotation: { label: '', x: '50%', y: '50%' },
    metadata: {},
    spreads: [],
  };

  const images = product.images?.length
    ? product.images
    : ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'];

  const desc = product.description ?? '';
  const dotIdx = desc.indexOf('.');
  const leadSentence = dotIdx > 0 && dotIdx < 250 ? desc.slice(0, dotIdx + 1) : desc;
  const restBody = dotIdx > 0 && dotIdx < 250 ? desc.slice(dotIdx + 1).trim() : '';

  const onSale = !!product.compare_at_price && Number(product.compare_at_price) > Number(product.price);
  const spreads = meta.spreads ?? [];

  const purchaseCardContent = (
    <div className="space-y-5">
      <div>
        <p className="eyebrow mb-1">{product.category}</p>
        <h2 className="font-display text-xl font-bold leading-tight">{product.name}</h2>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold">{formatCurrency(product.price)}</span>
          {onSale && (
            <span className="text-sm text-muted line-through">{formatCurrency(product.compare_at_price)}</span>
          )}
        </div>
      </div>

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
                (v) => v.color === c && (!selectedSize || v.size === selectedSize) && v.stock > 0,
              );
              return (
                <button
                  key={c}
                  onClick={() => !oos && setSelectedColor(c)}
                  title={c}
                  aria-label={c}
                  aria-pressed={selectedColor === c}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center',
                    selectedColor === c ? 'border-accent scale-110' : 'border-transparent hover:border-text/40',
                    oos && 'opacity-40 cursor-not-allowed',
                  )}
                  style={hex ? { backgroundColor: hex } : { backgroundColor: 'var(--color-border)' }}
                >
                  {!hex && (
                    <span className="text-[8px] font-bold leading-none">{c.slice(0, 2).toUpperCase()}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <div className="mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Size</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {sizes.map((s) => {
              const v = product.variants.find(
                (x) => x.size === s && (!selectedColor || x.color === selectedColor),
              );
              const oos = !v || v.stock <= 0;
              return (
                <button
                  key={s}
                  aria-pressed={s === selectedSize}
                  onClick={() => { if (!oos) setSelectedSize(s); }}
                  className={cn(
                    'rounded-md border py-2 text-sm font-medium transition-colors',
                    s === selectedSize ? 'border-accent bg-accent text-white' : 'border-border hover:border-text',
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

      <div className="flex items-stretch gap-3">
        <div className="inline-flex items-center rounded-md border border-border">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="grid h-11 w-11 place-items-center hover:bg-surface"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-9 text-center text-sm font-semibold">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => isPreorder ? q + 1 : Math.min(variant?.stock ?? 1, q + 1))}
            disabled={!variant || (!isPreorder && (variant.stock <= 0 || quantity >= variant.stock))}
            className="grid h-11 w-11 place-items-center hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {isPreorder && !preordersEnabled ? (
          <div className="flex-1 rounded-lg border border-border p-3 text-sm text-muted text-center">
            Pre-orders unavailable
          </div>
        ) : (
          <Button
            size="lg"
            className="flex-1"
            onClick={handleAdd}
            loading={adding}
            disabled={!variant || (!isPreorder && variant.stock <= 0) || (isPreorder && spotsLeft !== null && spotsLeft <= 0)}
          >
            {isPreorder ? <><Lock className="mr-2 h-4 w-4" />Pre-order</> : (variant && variant.stock <= 0 ? 'Out of stock' : 'Add to cart')}
          </Button>
        )}
      </div>

      <button
        ref={wishlistBtnRef}
        onClick={handleWishlist}
        disabled={wishlistToggling}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60',
          wishlisted ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent hover:text-accent',
        )}
      >
        <Heart className={cn('h-4 w-4', wishlisted && 'fill-accent')} />
        {wishlisted ? 'Saved' : 'Save to wishlist'}
      </button>

      <ul className="space-y-2 border-t border-border pt-4">
        <li className="flex items-center gap-2 text-xs text-muted">
          <Truck className="h-4 w-4 text-accent shrink-0" /> Free shipping over GH&#8373;&nbsp;1,000
        </li>
        <li className="flex items-center gap-2 text-xs text-muted">
          <RotateCcw className="h-4 w-4 text-accent shrink-0" /> 30-day returns
        </li>
        <li className="flex items-center gap-2 text-xs text-muted">
          <ShieldCheck className="h-4 w-4 text-accent shrink-0" /> Secure checkout
        </li>
      </ul>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{product.name} — UrbanPulse</title>
        <meta name="description"
          content={product.description?.slice(0, 155) || `${product.name} — ${product.category}`} />
        <link rel="canonical" href={`${SITE_URL}/products/${product.slug}`} />
        <meta property="og:type"        content="product" />
        <meta property="og:title"       content={`${product.name} — UrbanPulse`} />
        <meta property="og:description"
          content={product.description?.slice(0, 155) || `${product.name} — ${product.category}`} />
        <meta property="og:image"       content={product.images?.[0] || ''} />
        <meta property="og:url"         content={`${SITE_URL}/products/${product.slug}`} />
        <meta name="twitter:card"       content="summary_large_image" />
        <meta name="twitter:title"      content={`${product.name} — UrbanPulse`} />
        <meta name="twitter:image"      content={product.images?.[0] || ''} />
      </Helmet>

      {/* § 1 — Full-bleed hero */}
      <section
        className="relative w-full overflow-hidden"
        style={{ height: '70vh', minHeight: '520px' }}
      >
        <ProductImage
          src={images[0]}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {meta.annotation.label && (
          <svg
            className="absolute pointer-events-none hidden md:block"
            style={{ left: meta.annotation.x, top: meta.annotation.y }}
            width="160"
            height="22"
            aria-hidden="true"
          >
            <circle cx="5" cy="11" r="4" fill="var(--color-accent)" />
            <line x1="9" y1="11" x2="76" y2="11" stroke="var(--color-accent)" strokeWidth="1" opacity="0.8" />
            <text
              x="80"
              y="15"
              fill="white"
              fontSize="9"
              fontFamily="inherit"
              letterSpacing="0.12em"
            >
              {meta.annotation.label.toUpperCase()}
            </text>
          </svg>
        )}

        <div className="absolute bottom-0 left-0 p-8 md:p-14 max-w-4xl">
          <p className="text-white/60 uppercase tracking-[0.22em] text-xs mb-3">{meta.eyebrow}</p>
          <h1
            className="font-display font-bold text-white leading-[0.95] tracking-tight"
            style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}
          >
            {product.name}
          </h1>
        </div>
      </section>

      {/* Mobile purchase card — ref={atcRef} so shared sticky ATC observer fires */}
      <div className="lg:hidden" ref={atcRef}>
        <div className="container-site py-8">
          <div className="card p-6">
            {purchaseCardContent}
          </div>
        </div>
      </div>

      {/* Editorial body: left column | right sticky purchase card */}
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start">

        {/* Left column */}
        <div>

          {/* § 2 — Intro prose + metadata sidebar */}
          <section className="container-site py-14 md:py-20">
            <div className="grid gap-10 md:grid-cols-[1fr_260px] items-start">
              <div>
                {leadSentence && (
                  <p className="font-display text-xl md:text-2xl font-medium leading-relaxed mb-5">
                    {leadSentence}
                  </p>
                )}
                {restBody && (
                  <p className="text-muted leading-relaxed">{restBody}</p>
                )}
                {!leadSentence && !restBody && (
                  <p className="text-muted leading-relaxed">
                    A garment designed without compromise. Every detail considered, every material chosen.
                  </p>
                )}
              </div>

              {Object.keys(meta.metadata).length > 0 && (
                <div className="space-y-7 border-l border-border pl-8">
                  {Object.entries(meta.metadata).map(([label, value]) => (
                    <div key={label}>
                      <p className="eyebrow text-[0.65rem] mb-1">{label}</p>
                      <p className="text-sm text-muted leading-relaxed">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* § 3 — Alternating image+text spreads */}
          {spreads.map((spread, i) => {
            const img = images[i + 1];
            if (!img) return null;
            const reversed = i % 2 === 1;
            return (
              <motion.section
                key={i}
                initial={prefersReduced ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-2"
              >
                <div
                  className={cn(
                    'relative aspect-[3/4] md:aspect-auto md:min-h-[520px]',
                    reversed && 'md:order-2',
                  )}
                >
                  <ProductImage
                    src={img}
                    alt=""
                    initial={product.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center p-8 md:p-14 lg:p-20 bg-surface">
                  <div className="max-w-xs">
                    <p className="eyebrow mb-4">{spread.eyebrow}</p>
                    <p className="text-lg text-muted leading-relaxed">{spread.body}</p>
                  </div>
                </div>
              </motion.section>
            );
          })}

          {/* Reviews */}
          <section className="container-site py-14 border-t border-border">
            <h2 className="font-display text-2xl font-bold mb-8">Reviews</h2>

            {user && reviewsEnabled && (
              <div className="mb-8 card p-6 max-w-xl">
                {hasReviewed ? (
                  <p className="text-sm text-muted">You&apos;ve already reviewed this product.</p>
                ) : (
                  <>
                    <h3 className="font-semibold mb-4">Write a review</h3>
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider">Rating</label>
                        <StarPicker value={reviewRating} onChange={setReviewRating} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider">Review</label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          rows={3}
                          placeholder="Share your thoughts about this product..."
                          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                        />
                      </div>
                      <div>
                        <Input
                          label="Photo URL (optional)"
                          value={reviewImageUrl}
                          onChange={(e) => setReviewImageUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="min-h-[1.25rem] text-sm text-error">{reviewError}</div>
                      <Button type="submit" loading={submittingReview}>Submit review</Button>
                    </form>
                  </>
                )}
              </div>
            )}

            {product.reviews?.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {product.reviews.slice(0, 6).map((r) => (
                  <div key={r.id} className="card p-5">
                    <div className="flex items-center gap-1 text-accent">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="mt-2 text-sm">{r.comment}</p>
                    {r.image_url && (
                      <ProductImage
                        src={r.image_url}
                        alt="Review photo"
                        initial={r.user_name}
                        className="mt-3 max-h-40 w-full rounded-lg object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted flex-wrap">
                      <span className="font-medium text-text">{r.user_name}</span>
                      {r.verified_purchase && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-success font-semibold">
                          <ShieldCheck className="h-3 w-3" /> Verified buyer
                        </span>
                      )}
                      <span title={formatDate(r.created_at)}>{formatRelativeDate(r.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                {user ? 'No reviews yet.' : 'No reviews yet. Be the first to review this product.'}
              </p>
            )}
          </section>
        </div>

        {/* Right column — sticky purchase card (desktop) */}
        <aside className="hidden lg:block px-6 pt-14">
          <div className="sticky top-24">
            <div className="glass-strong rounded-2xl border border-border p-6 shadow-float">
              {purchaseCardContent}
            </div>
          </div>
        </aside>
      </div>

      {/* § 5 — Shop the Look */}
      {related.length > 0 && (
        <section className="py-14 md:py-20 border-t border-border">
          <div className="container-site mb-8">
            <p className="eyebrow">Shop the Look</p>
            <h2 className="mt-2 font-display text-3xl font-bold">Complete the fit</h2>
          </div>

          <div className="container-site hidden md:grid md:grid-cols-3 gap-6">
            {related.slice(0, 3).map((p, i) => (
              <motion.div
                key={p.id}
                initial={prefersReduced ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
              >
                <ProductCard product={p} />
              </motion.div>
            ))}
          </div>

          <div className="md:hidden overflow-x-auto pb-4">
            <div
              className="flex gap-4 px-4 snap-x snap-mandatory"
              style={{ width: 'max-content' }}
            >
              {related.slice(0, 3).map((p) => (
                <div key={p.id} className="w-[70vw] max-w-[260px] shrink-0 snap-start">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="container-site">
        <RecentlyViewed excludeId={product.id} />
      </div>
    </>
  );
}

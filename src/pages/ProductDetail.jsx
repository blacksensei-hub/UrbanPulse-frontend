import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion, useMotionValue } from 'framer-motion';
import { Minus, Plus, ChevronRight, Star, Heart, Truck, RotateCcw, ShieldCheck, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, Input, Spinner } from '../components/ui/index.jsx';
import { productService, reviewService } from '../services/index.js';
import { useCartStore } from '../stores/cartStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { useWishlistStore } from '../stores/wishlistStore.js';
import { useViewAs } from '../hooks/useViewAs.js';
import { useFeature } from '../stores/settingsStore.js';
import { formatCurrency, formatDate, cn } from '../utils/format.js';
import { fadeIn, morph, spring, staggerContainer } from '../lib/motion.js';
import FlashSaleTimer from '../components/product/FlashSaleTimer.jsx';
import { swatchColor } from '../components/product/QuickView.jsx';
import { triggerWishlistConfetti } from '../utils/confetti.js';
import { vibrate } from '../utils/haptic.js';
import { recordView } from '../utils/recentlyViewed.js';
import RecentlyViewed from '../components/product/RecentlyViewed.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import ProductDetailEditorial from './ProductDetailEditorial.jsx';
import SEO from '../components/SEO.jsx';
import ShareButtons from '../components/product/ShareButtons.jsx';
import { SITE_URL, buildProductSchema, buildBreadcrumbSchema } from '../lib/seoSchema.js';

const EDITORIAL_SLUGS = ['pulse-hoodie-bone-white'];

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              n <= (hovered || value) ? 'fill-accent text-accent' : 'text-border',
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const add = useCartStore((s) => s.add);
  const { isViewAs } = useViewAs();

  const { user } = useAuthStore();
  const { isWishlisted, getItem, add: addToWishlist, remove: removeFromWishlist } = useWishlistStore();
  const [wishlistToggling, setWishlistToggling] = useState(false);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImageUrl, setReviewImageUrl] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);

  // Must be before early returns to avoid hooks-in-condition violation
  const prefersReduced = useReducedMotion();
  const [flashDone, setFlashDone] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({});
  const [showStickyATC, setShowStickyATC] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [social, setSocial] = useState(null);
  const [related, setRelated] = useState([]);
  const [flyState, setFlyState] = useState(null);
  const atcRef = useRef(null);
  const reviewsRef = useRef(null);
  const mainImageRef = useRef(null);
  const wishlistBtnRef = useRef(null);
  const galleryDragX = useMotionValue(0);
  const [draggingGallery, setDraggingGallery] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSocial(null);
    setRelated([]);
    productService
      .get(slug)
      .then((data) => {
        setProduct(data);
        const colors = [...new Set(data.variants?.map((v) => v.color).filter(Boolean))];
        const sizes = [...new Set(data.variants?.map((v) => v.size).filter(Boolean))];
        setSelectedColor(colors[0] ?? null);
        setSelectedSize(sizes[0] ?? null);
        setActiveImage(0);
        if (user && data.reviews?.some((r) => r.user_id === user.id)) {
          setHasReviewed(true);
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug, user]);

  useEffect(() => {
    if (!product) return;
    recordView(product.id, product.slug);
    productService.social(product.slug).then(setSocial).catch(() => {});
    productService.related(product.slug)
      .then((d) => setRelated(d.items ?? []))
      .catch(() => {});
  }, [product?.id]);

  useEffect(() => {
    if (!atcRef.current) return;
    const obs = new IntersectionObserver(
      ([e]) => setShowStickyATC(!e.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(atcRef.current);
    return () => obs.disconnect();
  }, [product]);

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
    if (isViewAs) return toast.error('Add to cart is disabled in view-as mode.');
    if (!variant) return toast.error('Pick your size and color first.');
    if (!product.is_preorder && variant.stock <= 0) return toast.error('Out of stock.');
    setAdding(true);
    try {
      await add(variant.id, quantity);
      vibrate(10);
      if (!prefersReduced && mainImageRef.current) {
        const rect = mainImageRef.current.getBoundingClientRect();
        setFlyState({
          src: product.images?.[activeImage] ?? product.images?.[0],
          x: rect.left + rect.width / 2 - 30,
          y: rect.top + rect.height / 2 - 30,
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  }

  async function handleWishlist() {
    if (isViewAs) { toast.error('Wishlist is disabled in view-as mode.'); return; }
    if (!user) {
      toast.error('Sign in to save items');
      return;
    }
    setWishlistToggling(true);
    try {
      if (isWishlisted(product.id)) {
        const item = getItem(product.id);
        if (item) await removeFromWishlist(item.id);
      } else {
        await addToWishlist(product.id);
        vibrate(10);
        triggerWishlistConfetti(wishlistBtnRef.current, prefersReduced);
      }
    } catch {
      toast.error('Could not update wishlist');
    } finally {
      setWishlistToggling(false);
    }
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();
    setReviewError('');
    if (isViewAs) { setReviewError('Reviews are disabled in view-as mode.'); return; }
    if (!reviewRating) return setReviewError('Please select a star rating.');
    if (!reviewComment.trim()) return setReviewError('Please write a comment.');
    setSubmittingReview(true);
    try {
      const newReview = await reviewService.add(slug, {
        rating: reviewRating,
        comment: reviewComment.trim(),
        image_url: reviewImageUrl.trim() || undefined,
      });
      setProduct((prev) => ({
        ...prev,
        reviews: [{ ...newReview, user_name: user.name }, ...(prev.reviews ?? [])],
      }));
      setHasReviewed(true);
      toast.success('Review submitted!');
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Could not submit review';
      setReviewError(msg);
    } finally {
      setSubmittingReview(false);
    }
  }

  function handleImageMouseMove(e) {
    if (prefersReduced || draggingGallery) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomStyle({ transformOrigin: `${x}% ${y}%`, transform: 'scale(2)', cursor: 'zoom-in', transition: 'transform 0.1s' });
  }

  function handleImageMouseLeave() {
    setZoomStyle({});
  }

  if (loading) {
    return (
      <div className="container-site grid place-items-center py-24">
        <Spinner />
      </div>
    );
  }
  if (!product) {
    return (
      <div className="container-site py-24 text-center">
        <div className="font-display text-2xl font-semibold">Product not found</div>
        <Link to="/shop" className="mt-3 inline-block text-accent hover:text-accent-hover">
          Back to shop
        </Link>
      </div>
    );
  }

  const images = product.images?.length
    ? product.images
    : ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'];

  const flashEndsAt = product.flash_sale_ends_at;
  const flashActive = !flashDone && !!flashEndsAt && new Date(flashEndsAt).getTime() > Date.now();
  const flashExpired = !!flashEndsAt && !flashActive;
  const onSale = !flashExpired &&
    product.compare_at_price && Number(product.compare_at_price) > Number(product.price);

  const reviewsEnabled   = useFeature('reviews');
  const preordersEnabled = useFeature('preorders');

  const isPreorder = !!product.is_preorder;
  const spotsLeft = product.preorder_limit
    ? Number(product.preorder_limit) - Number(product.preorder_count ?? 0)
    : null;
  const wishlisted = isWishlisted(product.id);
  const isEditorial = EDITORIAL_SLUGS.includes(product.slug);
  const canonicalUrl = `${SITE_URL}/products/${product.slug}`;

  return (
    <>
      <SEO
        title={product.name}
        description={product.description?.slice(0, 155) || `${product.name} — ${product.category}`}
        image={product.images?.[0]}
        url={`/products/${product.slug}`}
        type="product"
        jsonLd={[
          buildProductSchema(product, canonicalUrl),
          buildBreadcrumbSchema([
            { name: 'Home', url: SITE_URL },
            { name: product.category, url: `${SITE_URL}/shop?category=${product.category}` },
            { name: product.name, url: canonicalUrl },
          ]),
        ]}
      />

      {/* Shared: flyaway thumbnail */}
      <AnimatePresence>
        {flyState && (
          <motion.img
            src={flyState.src}
            alt=""
            aria-hidden="true"
            className="fixed z-[200] pointer-events-none rounded-lg object-cover"
            style={{ width: 60, height: 60, left: flyState.x, top: flyState.y }}
            initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            animate={{
              opacity: 0,
              scale: 0.3,
              x: window.innerWidth - flyState.x - 80,
              y: -flyState.y + 20,
            }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            onAnimationComplete={() => setFlyState(null)}
          />
        )}
      </AnimatePresence>

      {/* Shared: mobile sticky ATC */}
      <AnimatePresence>
        {showStickyATC && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={spring}
            className="fixed inset-x-0 z-40 lg:hidden glass-strong px-4 pt-3 flex items-center gap-3"
            style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
          >
            {product.images?.[0] && (
              <img
                src={product.images[0]}
                className="h-10 w-10 rounded-lg object-cover shrink-0"
                alt=""
                loading="lazy"
                width={200}
                height={200}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{product.name}</p>
              <p className="text-xs text-muted">{formatCurrency(variant?.price ?? product.price)}</p>
            </div>
            <Button size="sm" onClick={handleAdd} loading={adding}
              disabled={!variant || (!isPreorder && variant.stock <= 0) || (isPreorder && spotsLeft !== null && spotsLeft <= 0)}>
              {isPreorder ? 'Pre-order' : 'Add to cart'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {isEditorial ? (
        <ProductDetailEditorial
          product={product}
          related={related}
          variant={variant}
          colors={colors}
          sizes={sizes}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
          quantity={quantity}
          setQuantity={setQuantity}
          handleAdd={handleAdd}
          adding={adding}
          handleWishlist={handleWishlist}
          wishlistToggling={wishlistToggling}
          wishlisted={wishlisted}
          user={user}
          reviewRating={reviewRating}
          setReviewRating={setReviewRating}
          reviewComment={reviewComment}
          setReviewComment={setReviewComment}
          reviewImageUrl={reviewImageUrl}
          setReviewImageUrl={setReviewImageUrl}
          submittingReview={submittingReview}
          reviewError={reviewError}
          handleReviewSubmit={handleReviewSubmit}
          hasReviewed={hasReviewed}
          reviewsEnabled={reviewsEnabled}
          prefersReduced={prefersReduced}
          atcRef={atcRef}
          isPreorder={isPreorder}
          spotsLeft={spotsLeft}
          preordersEnabled={preordersEnabled}
          wishlistBtnRef={wishlistBtnRef}
        />
      ) : (
    <div className="container-site py-6 md:py-10 pb-20 lg:pb-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-xs text-muted">
        <Link to="/" className="hover:text-accent transition-colors">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/shop?category=${product.category}`} className="hover:text-accent transition-colors">{product.category}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-text truncate">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Gallery */}
        <div className="flex flex-col gap-4 lg:flex-row-reverse lg:gap-6">
          <div
            ref={mainImageRef}
            className="relative flex-1 overflow-hidden rounded-xl bg-surface"
            onMouseMove={handleImageMouseMove}
            onMouseLeave={handleImageMouseLeave}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={images[activeImage]}
                layoutId={!prefersReduced && activeImage === 0 ? `product-image-${product.id}` : undefined}
                src={images[activeImage]}
                alt={product.name}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={!prefersReduced && activeImage === 0 ? morph : { duration: 0.25 }}
                style={zoomStyle}
                className="aspect-[4/5] w-full object-cover"
                loading="eager"
                width={800}
                height={1000}
                decoding="async"
              />
            </AnimatePresence>
            {onSale && (
              <div className="absolute left-4 top-4 flex flex-col gap-1.5">
                <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase text-white">
                  {flashActive ? 'Flash Sale' : 'Sale'}
                </span>
                {flashActive && (
                  <FlashSaleTimer endsAt={flashEndsAt} onExpire={() => setFlashDone(true)} />
                )}
              </div>
            )}

            {/* Mobile swipe overlay */}
            {images.length > 1 && (
              <motion.div
                className="md:hidden absolute inset-0 z-10"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{
                  left: activeImage < images.length - 1 ? 0.2 : 0.5,
                  right: activeImage > 0 ? 0.2 : 0.5,
                }}
                style={{ x: galleryDragX }}
                onDragStart={() => setDraggingGallery(true)}
                onDragEnd={(_, info) => {
                  setDraggingGallery(false);
                  galleryDragX.set(0);
                  const { offset: { x }, velocity: { x: vx } } = info;
                  if (x < -50 || vx < -300) setActiveImage((i) => Math.min(i + 1, images.length - 1));
                  else if (x > 50 || vx > 300) setActiveImage((i) => Math.max(i - 1, 0));
                }}
              />
            )}

            {/* Mobile dot indicators */}
            {images.length > 1 && (
              <div className="md:hidden absolute bottom-3 inset-x-0 z-20 flex justify-center gap-1.5 pointer-events-none">
                {images.map((_, i) => (
                  <motion.button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    aria-label={`Image ${i + 1}`}
                    style={{ pointerEvents: 'auto' }}
                    animate={{ width: i === activeImage ? 16 : 6, opacity: i === activeImage ? 1 : 0.5 }}
                    transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                    className="h-1.5 rounded-full bg-white flex-shrink-0"
                  />
                ))}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto lg:flex-col lg:overflow-visible">
              {images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                    i === activeImage ? 'border-accent' : 'border-transparent',
                  )}
                  aria-label={`View image ${i + 1}`}
                >
                  <img
                    src={src}
                    alt=""
                    className="h-16 w-16 object-cover sm:h-20 sm:w-20 lg:h-24 lg:w-24"
                    loading="lazy"
                    width={200}
                    height={200}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <motion.div variants={fadeIn} initial="hidden" animate="show" className="flex flex-col">
          <p className="eyebrow">{product.category}</p>
          <motion.h1
            layoutId={prefersReduced ? undefined : `product-name-${product.id}`}
            transition={morph}
            className="mt-1 font-display text-h1 font-bold leading-tight"
          >
            {product.name}
          </motion.h1>

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold">
                {formatCurrency(product.price)}
              </span>
              {onSale && (
                <span className="text-base text-muted line-through">
                  {formatCurrency(product.compare_at_price)}
                </span>
              )}
            </div>
            {Number(product.rating) > 0 && (
              <button
                onClick={() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors"
              >
                <Star className="h-4 w-4 fill-accent text-accent" />
                {Number(product.rating).toFixed(1)}
                <span>({product.reviews?.length ?? 0})</span>
              </button>
            )}
          </div>

          {social?.sold_recently > 0 && (
            <p className="mt-1.5 text-sm text-muted">
              {social.sold_recently} sold in the last 30 days
            </p>
          )}

          {/* Color swatches */}
          {colors.length > 0 && (
            <div className="mt-7">
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
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center',
                        selectedColor === c
                          ? 'border-accent scale-110'
                          : 'border-transparent hover:border-text/40',
                        oos && 'opacity-40 cursor-not-allowed',
                      )}
                      style={hex ? { backgroundColor: hex } : { backgroundColor: 'var(--color-border)' }}
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
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider">Size</span>
                <button className="text-xs text-muted underline hover:text-text">Size guide</button>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
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
                          toast('Notify me when back in stock — coming soon!', { icon: '🔔' });
                          return;
                        }
                        setSelectedSize(s);
                      }}
                      className={cn(
                        'rounded-md border py-2.5 text-sm font-medium transition-colors',
                        s === selectedSize
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

          {/* Qty + add + wishlist */}
          <div className="mt-7 flex flex-wrap items-stretch gap-3" ref={atcRef}>
            <div className="inline-flex items-center rounded-md border border-border">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="grid h-12 w-12 place-items-center hover:bg-surface"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => isPreorder ? q + 1 : Math.min(variant?.stock ?? 1, q + 1))}
                disabled={!variant || (!isPreorder && (variant.stock <= 0 || quantity >= variant.stock))}
                className="grid h-12 w-12 place-items-center hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {isPreorder && !preordersEnabled ? (
              <div className="flex-1 rounded-lg border border-border p-4 text-sm text-muted text-center">
                Pre-orders are currently unavailable
              </div>
            ) : isPreorder ? (
              <Button
                size="lg"
                className="flex-1 min-w-[160px] bg-accent text-white"
                onClick={handleAdd}
                loading={adding}
                disabled={!variant || (spotsLeft !== null && spotsLeft <= 0)}
              >
                <Lock className="mr-2 h-4 w-4" />
                Pre-order
              </Button>
            ) : (
              <Button
                size="lg"
                className="flex-1 min-w-[160px]"
                onClick={handleAdd}
                loading={adding}
                disabled={!variant || variant.stock <= 0}
              >
                {variant && variant.stock <= 0 ? 'Out of stock' : 'Add to cart'}
              </Button>
            )}
            <button
              ref={wishlistBtnRef}
              onClick={handleWishlist}
              disabled={wishlistToggling}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              className={cn(
                'flex h-12 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors disabled:opacity-60',
                wishlisted
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border hover:border-accent hover:text-accent',
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={wishlisted ? 'saved' : 'save'}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="flex items-center gap-2"
                >
                  <Heart className={cn('h-4 w-4', wishlisted && 'fill-accent')} />
                  {wishlisted ? 'Saved' : 'Save'}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>

          {isPreorder && product.preorder_ships_at && (
            <p className="mt-3 text-sm font-medium text-accent">
              Ships {formatDate(product.preorder_ships_at)}
            </p>
          )}
          {isPreorder && spotsLeft !== null && spotsLeft <= 20 && spotsLeft > 0 && (
            <p className="mt-1 text-xs text-muted">
              {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
            </p>
          )}
          {!isPreorder && variant && variant.stock > 0 && variant.stock <= 5 && (
            <motion.p
              key={variant.id}
              animate={prefersReduced ? {} : { x: [0, -4, 4, -3, 3, 0] }}
              transition={{ duration: 0.4 }}
              className="mt-3 text-sm text-warning"
            >
              Only {variant.stock} left in this size/color
            </motion.p>
          )}

          {/* Perks */}
          <ul className="mt-8 grid grid-cols-1 gap-3 border-t border-border pt-6 sm:grid-cols-3">
            <li className="flex items-center gap-2 text-sm text-muted">
              <Truck className="h-4 w-4 text-accent" /> Free shipping over GH&#8373; 1,000
            </li>
            <li className="flex items-center gap-2 text-sm text-muted">
              <RotateCcw className="h-4 w-4 text-accent" /> 30-day returns
            </li>
            <li className="flex items-center gap-2 text-sm text-muted">
              <ShieldCheck className="h-4 w-4 text-accent" /> Secure checkout
            </li>
          </ul>

          <div className="mt-6">
            <ShareButtons
              url={canonicalUrl}
              text={`Check this out from UrbanPulse: ${product.name} — ${canonicalUrl}`}
            />
          </div>
        </motion.div>
      </div>

      {/* Tabs — Description / Size Guide / Reviews */}
      <section className="mt-16 border-t border-border pt-10">
        <div role="tablist" className="flex gap-6 border-b border-border">
          {[
            { id: 'description', label: 'Description' },
            { id: 'size-guide',  label: 'Size guide' },
            { id: 'reviews',     label: `Reviews (${product.reviews?.length ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              ref={tab.id === 'reviews' ? reviewsRef : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative pb-3 text-sm font-medium transition-colors',
                activeTab === tab.id ? 'text-text' : 'text-muted hover:text-text',
              )}
            >
              {tab.label}
              {activeTab === tab.id && !prefersReduced && (
                <motion.span
                  layoutId="product-detail-tab"
                  className="absolute inset-x-0 -bottom-px h-[2px] bg-accent rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            role="tabpanel"
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-8"
          >
            {activeTab === 'description' && (
              <div className="prose-editorial max-w-2xl">
                {product.description
                  ? <p>{product.description}</p>
                  : <p className="text-muted">No description available.</p>}
              </div>
            )}

            {activeTab === 'size-guide' && (
              <div className="max-w-lg">
                {/* TODO: replace with real per-category size chart data */}
                <p className="eyebrow mb-4">General sizing</p>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 text-left font-semibold">Size</th>
                      <th className="py-2 text-left font-semibold">Chest (cm)</th>
                      <th className="py-2 text-left font-semibold">Waist (cm)</th>
                      <th className="py-2 text-left font-semibold">Hip (cm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted">
                    {[
                      ['XS',  '82–86',   '68–72',   '88–92'],
                      ['S',   '86–90',   '72–76',   '92–96'],
                      ['M',   '90–96',   '76–82',   '96–102'],
                      ['L',   '96–104',  '82–90',   '102–110'],
                      ['XL',  '104–112', '90–98',   '110–118'],
                      ['XXL', '112–120', '98–106',  '118–126'],
                    ].map(([s, ...m]) => (
                      <tr key={s}>
                        <td className="py-2 font-medium text-text">{s}</td>
                        {m.map((v, i) => <td key={i} className="py-2">{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-4 text-xs text-muted">
                  Measurements are approximate. When between sizes, size up for a relaxed fit.
                </p>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
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
                          {reviewError && <p className="text-sm text-error">{reviewError}</p>}
                          <Button type="submit" loading={submittingReview}>Submit review</Button>
                        </form>
                      </>
                    )}
                  </div>
                )}

                {product.reviews?.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {product.reviews.slice(0, 6).map((r) => (
                      <div key={r.id} className="card p-5">
                        <div className="flex items-center gap-1 text-accent">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                          ))}
                        </div>
                        <p className="mt-2 text-sm">{r.comment}</p>
                        {r.image_url && (
                          <img src={r.image_url} alt="Review photo"
                            className="mt-3 max-h-40 w-full rounded-lg object-cover" loading="lazy" />
                        )}
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted flex-wrap">
                          <span className="font-medium text-text">{r.user_name}</span>
                          {r.verified_purchase && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-success font-semibold">
                              <ShieldCheck className="h-3 w-3" /> Verified buyer
                            </span>
                          )}
                          <span>{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    {user ? 'No reviews yet.' : 'No reviews yet. Be the first to review this product.'}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* You might also like */}
      {related.length > 0 && (
        <section className="mt-16 border-t border-border pt-12">
          <p className="eyebrow">From the same collection</p>
          <h2 className="mt-2 font-display text-h3 font-bold">You might also like</h2>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
          >
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </motion.div>
        </section>
      )}

      {/* Recently viewed */}
      <RecentlyViewed excludeId={product.id} />
    </div>
      )}
    </>
  );
}

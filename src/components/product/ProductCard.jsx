import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Heart, Eye, Star } from 'lucide-react';
import toast from 'react-hot-toast';

import { formatCurrency, formatDate } from '../../utils/format.js';
import { fadeInUp, morph, cardHover } from '../../lib/motion.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useWishlistStore } from '../../stores/wishlistStore.js';
import { useViewAs } from '../../hooks/useViewAs.js';
import FlashSaleTimer from './FlashSaleTimer.jsx';
import QuickView from './QuickView.jsx';
import { swatchColor } from './QuickView.jsx';
import { triggerWishlistConfetti } from '../../utils/confetti.js';
import { vibrate } from '../../utils/haptic.js';
import { useLongPress } from '../../hooks/useLongPress.js';

export default function ProductCard({ product }) {
  const { user } = useAuthStore();
  const { isWishlisted, getItem, add, remove } = useWishlistStore();
  const { isViewAs } = useViewAs();
  const [toggling, setToggling]         = useState(false);
  const [flashDone, setFlashDone]       = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [isHovered, setIsHovered]       = useState(false);
  const [cardImageIdx, setCardImageIdx] = useState(0);
  const prefersReduced = useReducedMotion();
  const heartRef = useRef(null);

  const flashEndsAt  = product.flash_sale_ends_at;
  const flashActive  = !flashDone && !!flashEndsAt && new Date(flashEndsAt).getTime() > Date.now();
  const flashExpired = !!flashEndsAt && !flashActive;
  const hasDiscount  = !flashExpired &&
    product.compare_at_price && Number(product.compare_at_price) > Number(product.price);

  const discountPct = hasDiscount
    ? Math.round(((Number(product.compare_at_price) - Number(product.price)) / Number(product.compare_at_price)) * 100)
    : 0;

  const wishlisted  = isWishlisted(product.id);
  const images      = product.images ?? [];
  const primarySrc  = images[cardImageIdx] ?? images[0];
  const hoverSrc    = images.length > 1 ? images[(cardImageIdx + 1) % images.length] : null;

  const imageLayoutId = prefersReduced ? undefined : `product-image-${product.id}`;
  const nameLayoutId  = prefersReduced ? undefined : `product-name-${product.id}`;

  const colors = product.colors ?? [];

  const longPressHandlers = useLongPress(() => {
    vibrate(10);
    setQuickViewOpen(true);
  }, 500);

  async function handleWishlist(e) {
    e.preventDefault();
    if (isViewAs) { toast.error('Wishlist is disabled in view-as mode.'); return; }
    if (!user) { toast.error('Sign in to save items'); return; }
    setToggling(true);
    try {
      if (wishlisted) {
        const item = getItem(product.id);
        if (item) await remove(item.id);
      } else {
        await add(product.id);
        vibrate(10);
        triggerWishlistConfetti(heartRef.current, prefersReduced);
      }
    } catch {
      toast.error('Could not update wishlist');
    } finally {
      setToggling(false);
    }
  }

  function handleSwatchClick(e, color) {
    e.preventDefault();
    const idx = colors.indexOf(color);
    setCardImageIdx(Math.min(idx < 0 ? 0 : idx, images.length - 1));
  }

  return (
    <>
    <motion.article
      variants={fadeInUp}
      whileHover={prefersReduced ? {} : cardHover}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      {...longPressHandlers}
      className="group"
    >
      <Link to={`/products/${product.slug}`} className="block">
        {/* Image container — 3:4 aspect, rounded-lg = 16px */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-border">
          {primarySrc && (
            <motion.img
              layoutId={imageLayoutId}
              transition={morph}
              src={primarySrc}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}

          {/* Second image crossfade on hover — desktop only */}
          {hoverSrc && !prefersReduced && (
            <motion.img
              src={hoverSrc}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.35 }}
            />
          )}

          {/* Pre-order badge */}
          {product.is_preorder && (
            <div className="absolute top-3 left-3">
              <span className="badge badge-accent">Pre-order</span>
            </div>
          )}

          {/* Flash sale badge + timer */}
          {!product.is_preorder && flashActive && (
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              <span className="badge badge-accent">Flash Sale</span>
              <FlashSaleTimer endsAt={flashEndsAt} onExpire={() => setFlashDone(true)} />
            </div>
          )}

          {/* Sale corner ribbon — non-flash discounts only */}
          {!product.is_preorder && hasDiscount && !flashActive && discountPct > 0 && (
            <div className="absolute top-0 left-0 w-[72px] h-[72px] pointer-events-none overflow-hidden rounded-tl-lg">
              <div
                className="absolute inset-0 bg-accent"
                style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
              />
              <span
                className="absolute text-white font-bold"
                style={{ fontSize: '9px', top: '12px', left: '5px', transform: 'rotate(-45deg)', lineHeight: 1 }}
              >
                -{discountPct}%
              </span>
            </div>
          )}

          {/* Quick Shop pill — desktop hover */}
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200 hidden md:flex justify-center">
            <button
              onClick={(e) => { e.preventDefault(); setQuickViewOpen(true); }}
              className="rounded-pill bg-bg/90 backdrop-blur-sm border border-border px-5 py-1.5 text-xs font-semibold hover:bg-bg transition-colors"
            >
              Quick Shop
            </button>
          </div>

          {/* Quick Shop icon — mobile always-visible */}
          <button
            onClick={(e) => { e.preventDefault(); setQuickViewOpen(true); }}
            aria-label="Quick shop"
            className="absolute bottom-2 right-2 md:hidden w-8 h-8 rounded-full bg-bg/80 backdrop-blur-sm border border-border flex items-center justify-center"
          >
            <Eye size={14} />
          </button>

          {/* Wishlist heart */}
          <button
            ref={heartRef}
            onClick={handleWishlist}
            disabled={toggling}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-white/80 backdrop-blur-sm shadow transition-transform hover:scale-110 disabled:opacity-60"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={wishlisted ? 'filled' : 'empty'}
                initial={prefersReduced ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={prefersReduced ? {} : { scale: 0.6, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex"
              >
                <Heart className={wishlisted ? 'h-4 w-4 fill-accent text-accent' : 'h-4 w-4 text-muted'} />
              </motion.span>
            </AnimatePresence>
          </button>
        </div>

        {/* Info row */}
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <motion.h3
              layoutId={nameLayoutId}
              transition={morph}
              className="font-medium truncate"
            >
              {product.name}
            </motion.h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-small text-muted">{product.category}</p>
              {Number(product.rating) > 0 && (
                <span className="flex items-center gap-0.5 eyebrow" style={{ textTransform: 'none' }}>
                  <Star className="h-3 w-3 fill-accent text-accent flex-shrink-0" />
                  {Number(product.rating).toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-display font-semibold">{formatCurrency(product.price)}</p>
            {hasDiscount && !product.is_preorder && (
              <p className="text-small text-muted line-through">
                {formatCurrency(product.compare_at_price)}
              </p>
            )}
            {product.is_preorder && product.preorder_ships_at && (
              <p className="text-xs text-muted">Ships {formatDate(product.preorder_ships_at)}</p>
            )}
          </div>
        </div>
      </Link>

      {/* Color swatches — outside Link so clicks don't navigate */}
      {colors.length > 1 && (
        <div className="mt-2 flex gap-1.5 px-0.5">
          {colors.slice(0, 5).map((c) => {
            const hex = swatchColor(c);
            const active = colors.indexOf(c) === cardImageIdx;
            return (
              <button
                key={c}
                onClick={(e) => handleSwatchClick(e, c)}
                aria-label={c}
                title={c}
                className={`w-5 h-5 rounded-full border-2 transition-all flex-shrink-0 ${
                  active ? 'border-accent scale-110' : 'border-transparent hover:border-text/30'
                }`}
                style={hex ? { backgroundColor: hex } : { backgroundColor: 'var(--color-border)' }}
              />
            );
          })}
        </div>
      )}
    </motion.article>
    <QuickView slug={product.slug} open={quickViewOpen} onClose={() => setQuickViewOpen(false)} />
    </>
  );
}

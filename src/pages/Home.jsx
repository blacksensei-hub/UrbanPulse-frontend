import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowDown, Truck, ShieldCheck, RotateCcw, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

import ProductCard from '../components/product/ProductCard.jsx';
import Divider from '../components/ui/Divider.jsx';
import { Button } from '../components/ui/index.jsx';
import SEO from '../components/SEO.jsx';
import { buildOrganizationSchema, buildWebsiteSchema } from '../lib/seoSchema.js';
import { productService, referralService } from '../services/index.js';
import RecentlyViewed from '../components/product/RecentlyViewed.jsx';
import { getStoredRefCode } from '../utils/referral.js';
import { useAuthStore } from '../stores/authStore.js';
import { useSetting } from '../stores/settingsStore.js';
import { Chapter, Statement, Label } from '../components/ui/Instrument.jsx';
import { formatCurrency } from '../utils/format.js';

// A 5.3s loop with no visible seam: the camera drifts left past bolts of
// heavy cotton in the workroom, dust turning in the raking light. The left
// third stays dark on purpose, which is where the headline sits. 439KB.
const HERO = {
  video:    '/hero/spring-26.mp4',
  poster:   '/hero/spring-26.jpg',
  fallback: '/media/room-wide.jpg',
};

// ─── Data ───────────────────────────────────────────────────────────────────

const DROP_ITEMS = [
  {
    label: 'The flagship drop',
    name: 'Pulse Hoodie, Bone White',
    href: '/shop?category=Tops',
    image: '/media/hanging.jpg',
    large: true,
  },
  {
    label: 'New',
    name: 'Cargo Tech Pant',
    href: '/shop?category=Bottoms',
    image: '/media/twill.jpg',
    large: false,
  },
  {
    label: 'Limited',
    name: 'Field Jacket',
    href: '/shop?category=Outerwear',
    image: '/media/waxed.jpg',
    large: false,
  },
];

const STORIES = [
  {
    slug: 'spring-26',
    eyebrow: 'The Drop',
    title: 'Spring/Summer 2026 Field Guide',
    desc: 'Twelve pieces built for early mornings and late nights across Accra.',
    image: '/media/workroom.jpg',
  },
  {
    slug: 'field-essentials',
    eyebrow: 'Editorial',
    title: 'Field Essentials',
    desc: 'Technical outerwear for the in-between weather. Minimal, and it works.',
    image: '/media/bench.jpg',
  },
  {
    slug: 'urban-roots',
    eyebrow: 'Founders',
    title: 'Urban Roots',
    desc: 'Why craft and street culture will always be inseparable.',
    image: '/media/light.jpg',
  },
];

// The wall the homepage used to fill with stock photos of strangers under a
// "community" heading. There is no community to show yet, and inventing one
// contradicts the honest social proof used everywhere else on this site. It
// shows the cloth instead, which is true today and costs nothing to keep true.
const CLOTH_WALL = [
  '/media/stack.jpg',
  '/media/detail-tee.jpg',
  '/media/cuff.jpg',
  '/media/shake.jpg',
  '/media/seam.jpg',
  '/media/detail-jacket.jpg',
  '/media/compare.jpg',
  '/media/detail-pant.jpg',
];
// The free-shipping perk's label is computed at render time from settings
// (see `key: 'freeShipping'` below) rather than hardcoded here, so it stays
// in sync with the admin-configurable free_shipping_threshold_ghs.
const PERKS = [
  { icon: Truck,       key: 'freeShipping' },
  { icon: RotateCcw,   label: '30-day easy returns' },
  { icon: ShieldCheck, label: 'Secure checkout' },
  { icon: Sparkles,    label: 'New drops every Friday' },
];

// ─── Reveal wrapper ──────────────────────────────────────────────────────────

function Reveal({ children, delay = 0, className = '' }) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [email, setEmail] = useState('');
  const [referrerName, setReferrerName] = useState(null);
  const user = useAuthStore((s) => s.user);
  const freeShipThreshold = useSetting('free_shipping_threshold_ghs', '1000');
  // 'video' | 'image' | 'solid' · strict degradation order, never goes backward.
  // Reduced-motion is applied at render time rather than baked in here, because
  // useReducedMotion() can settle after the first render.
  const [heroStage, setHeroStage] = useState(() => (HERO.video ? 'video' : 'image'));
  const [heroImgSrc, setHeroImgSrc] = useState(HERO.poster || HERO.fallback);
  const prefersReduced = useReducedMotion();
  const nextSectionRef = useRef(null);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], prefersReduced ? [0, 0] : [0, 80]);
  const contentY = useTransform(scrollY, [0, 400], prefersReduced ? [0, 0] : [0, -40]);
  const contentOpacity = useTransform(scrollY, [0, 300], prefersReduced ? [1, 1] : [1, 0]);

  useEffect(() => {
    setLoading(true);
    setFetchFailed(false);
    setSlowLoad(false);
    const slowTimer = setTimeout(() => setSlowLoad(true), 5000);
    productService
      .list({ sort: 'rating', limit: 8 })
      .then((data) => setProducts(data.items ?? []))
      .catch(() => setFetchFailed(true))
      .finally(() => { setLoading(false); clearTimeout(slowTimer); });
    return () => clearTimeout(slowTimer);
  }, [retryToken]);

  useEffect(() => {
    if (user) return;
    const code = getStoredRefCode();
    if (!code) return;
    referralService.lookup(code).then((r) => {
      if (r.valid) setReferrerName(r.referrer_name);
    }).catch(() => {});
  }, [user]);

  function subscribe(e) {
    e.preventDefault();
    if (!email) return;
    toast.success("You're in. Watch your inbox.");
    setEmail('');
  }

  function handleHeroImgError() {
    // One more real-image chance: if the poster failed and a distinct fallback
    // exists, try it; otherwise degrade to the solid brand background.
    if (heroImgSrc !== HERO.fallback && HERO.fallback) {
      setHeroImgSrc(HERO.fallback);
    } else {
      setHeroStage('solid');
    }
  }

  return (
    <>
      <SEO
        title="UrbanPulse · Premium streetwear and accessories"
        suffix={false}
        description="Shop premium streetwear, accessories, and basics. Curated drops. Fast delivery across Ghana."
        image={HERO.fallback}
        url=""
        jsonLd={[buildOrganizationSchema(), buildWebsiteSchema()]}
      />

      {/* Referral banner · shown only when the visitor arrived via a referral link */}
      {!user && referrerName && (
        <div className="border-b border-accent/20 bg-accent/8 py-2.5 text-center text-sm text-accent-text">
          You were referred by <strong>{referrerName}</strong>. Sign up to get GH₵ 50 off your first order.{' '}
          <Link to="/register" className="underline underline-offset-2">
            Create account
          </Link>
        </div>
      )}

      {/* ─── (a) FULL-BLEED HERO ─────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden h-[80vh] md:h-[92vh]"
        style={{ minHeight: '560px' }}
      >
        {/* Background · extends 80px above section to absorb parallax translation without gaps */}
        <motion.div
          className="absolute left-0 right-0"
          /* The ink base sits under every stage. Without it a slow or failed
             image leaves the white hero type on the light dust canvas. */
          style={{ top: '-80px', height: 'calc(100% + 80px)', y: bgY, background: '#141210' }}
        >
          {heroStage === 'video' && !prefersReduced ? (
            <video
              autoPlay muted loop playsInline
              poster={HERO.poster || HERO.fallback}
              src={HERO.video}
              width={1600}
              height={900}
              className="h-full w-full object-cover"
              aria-hidden="true"
              onError={() => setHeroStage('image')}
            />
          ) : heroStage !== 'solid' ? (
            <img
              src={heroImgSrc}
              alt=""
              width={1600}
              height={900}
              className="h-full w-full object-cover"
              aria-hidden="true"
              onError={handleHeroImgError}
            />
          ) : (
            <div
              aria-hidden="true"
              className="h-full w-full"
              // Theme-independent charcoal→stone: --color-secondary flips to cream in
              // dark mode, which would risk white-on-light for the hero text.
              style={{ background: 'linear-gradient(160deg, #2A2A2A 0%, #57504A 100%)' }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent" />
          {/* Base scrim: dims the corners without flattening the picture. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 120% 90% at 50% 45%, rgba(10,9,7,0) 38%, rgba(10,9,7,0.58) 100%)' }}
          />
        </motion.div>

        {/* Content */}
        <motion.div
          className="relative z-10 container-site flex h-full flex-col justify-end pb-16 md:pb-24 lg:pb-28"
          style={{ y: contentY, opacity: contentOpacity }}
        >
          <motion.p
            className="eyebrow text-white/60 tracking-[0.18em]"
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          >
            Spring &#39;26 Collection
          </motion.p>

          <h1 className="mt-4 max-w-3xl font-display text-display font-bold leading-[1.02] tracking-tight text-white">
            {['Built for the', 'street. Made', 'to last.'].map((line, i) => (
              <motion.span
                key={i}
                className="block"
                initial={prefersReduced ? false : { opacity: 0, y: 28, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 + i * 0.12 }}
              >
                {line}
              </motion.span>
            ))}
          </h1>

          <motion.p
            className="mt-5 max-w-md text-base text-white/70 leading-relaxed"
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.52 }}
          >
            Heavyweight tees, technical outerwear, and accessories engineered for movement.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap gap-3"
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.62 }}
          >
            <Link to="/shop?collection=spring-26" aria-label="Shop the Spring 26 drop">
              {/* The accent gets one of its rare doses here: the single primary
                  action on the page, over the footage. */}
              <Button size="lg" className="group gap-2">
                Shop the drop
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/lookbook/spring-26" aria-label="Watch the Spring 26 film">
              <Button
                variant="outline"
                size="lg"
                className="border-bone/50 text-bone hover:border-bone hover:bg-bone/10"
              >
                Watch the film
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/50">
          <button
            onClick={() => nextSectionRef.current?.scrollIntoView({ behavior: prefersReduced ? 'instant' : 'smooth' })}
            aria-label="Scroll to next section"
            className="flex flex-col items-center gap-1.5 hover:text-white/80 transition-colors"
          >
            <span className="eyebrow text-[0.6rem]">Scroll</span>
            <motion.div
              animate={prefersReduced ? {} : { y: [0, 7, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            >
              <ArrowDown className="h-4 w-4" />
            </motion.div>
          </button>
        </div>
      </section>

      {/* ─── PERKS BAR ───────────────────────────────────────────────────── */}
      <section ref={nextSectionRef} className="border-b border-border bg-surface">
        <div className="container-site grid grid-cols-2 gap-x-4 gap-y-3 py-4 md:grid-cols-4">
          {PERKS.map(({ icon: Icon, key, label }, i) => (
            <div key={key ?? label} className="flex items-center gap-2.5">
              <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-accent-text" />
              <Label className="truncate">
                {key === 'freeShipping'
                  ? `Free delivery over ${formatCurrency(freeShipThreshold)}`
                  : label}
              </Label>
            </div>
          ))}
        </div>
      </section>

      {/* ─── (b) NEW DROP · ASYMMETRIC GRID ─────────────────────────────── */}
      <section className="container-site pt-16 pb-10 md:pt-24 md:pb-14">
        <Chapter n={1} kicker="The drop" title={['New in', 'rotation.']} />

        <div className="mt-8 grid gap-3 md:grid-cols-3 md:gap-4">
          {/* Large 2/3 item */}
          <Reveal delay={0.05} className="md:col-span-2">
            <Link
              to={DROP_ITEMS[0].href}
              className="group relative block overflow-hidden rounded-2xl bg-border"
              style={{ aspectRatio: '4/3' }}
            >
              <img
                src={DROP_ITEMS[0].image}
                alt={DROP_ITEMS[0].name}
                loading="lazy"
                width={1200}
                height={900}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <p className="eyebrow text-white/60">{DROP_ITEMS[0].label}</p>
                <p className="mt-1 font-display text-h3 font-semibold">{DROP_ITEMS[0].name}</p>
              </div>
              <div className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white/15 backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100">
                <ArrowRight className="h-4 w-4 text-white" />
              </div>
            </Link>
          </Reveal>

          {/* Two stacked 1/3 items */}
          <div className="flex flex-row gap-3 md:flex-col">
            {DROP_ITEMS.slice(1).map((item, i) => (
              <Reveal key={item.name} delay={0.1 + i * 0.07} className="flex-1">
                <Link
                  to={item.href}
                  className="group relative block h-full overflow-hidden rounded-2xl bg-border"
                  style={{ minHeight: '180px' }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    width={1200}
                    height={900}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <p className="eyebrow text-white/60">{item.label}</p>
                    <p className="mt-0.5 font-display text-sm font-semibold">{item.name}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Statement>Heavyweight cotton / cut in Accra / made to outlast the season</Statement>

      {/* ─── (c) STORY STRIP ─────────────────────────────────────────────── */}
      <section className="container-site py-10 md:py-16">
        <Chapter
          n={2}
          kicker="Stories"
          title={['The edit.']}
          lead="How the pieces get worn once they leave here."
        />

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STORIES.map((story, i) => (
            <Reveal key={story.slug} delay={i * 0.08}>
              <Link to={`/lookbook/${story.slug}`} className="group block">
                <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-border">
                  <img
                    src={story.image}
                    alt={story.title}
                    loading="lazy"
                    width={900}
                    height={600}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
                <div className="mt-4">
                  <p className="eyebrow">{story.eyebrow}</p>
                  <h3 className="mt-1.5 font-display text-h3 font-semibold leading-tight group-hover:text-accent-text transition-colors">
                    {story.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{story.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text">
                    Read story
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <Statement>We make fewer things, and we make them properly.</Statement>

      {/* ─── (d) BEST-SELLERS ────────────────────────────────────────────── */}
      <section className="py-10 md:py-16">
        <div className="container-site mb-8 flex items-end justify-between gap-6">
          <Chapter n={3} kicker="Best-sellers" title={['As worn', 'in Accra.']} />
          <Link
            to="/shop"
            className="hidden shrink-0 pb-1.5 text-sm font-semibold text-accent-text hover:text-accent-hover sm:inline-flex sm:items-center sm:gap-1"
          >
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="container-site space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="skeleton aspect-[3/4] w-full rounded-2xl" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/3 rounded" />
                </div>
              ))}
            </div>
            {slowLoad && (
              <p className="text-center text-sm text-muted">Still loading. Hang tight.</p>
            )}
          </div>
        ) : fetchFailed ? (
          <div className="container-site rounded-xl border border-border bg-surface p-12 text-center">
            <div className="font-display text-xl font-semibold">Couldn&apos;t load products</div>
            <p className="mt-2 text-sm text-muted">Something went wrong on our end.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setRetryToken((n) => n + 1)}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: horizontal scroll carousel */}
            <div className="md:hidden overflow-x-auto overscroll-x-contain pb-4">
              <div className="flex gap-4 px-[max(1rem,3vw)] snap-x snap-mandatory" style={{ width: 'max-content' }}>
                {products.slice(0, 8).map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={prefersReduced ? false : { opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    className="w-[62vw] max-w-[220px] shrink-0 snap-start"
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Desktop: 4-up grid */}
            <div className="container-site hidden md:grid md:grid-cols-4 gap-5">
              {products.slice(0, 8).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={prefersReduced ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </section>

      <Statement>Pay with Mobile Money, card, or cash at your door.</Statement>

      {/* ─── (e) THE CLOTH WALL ──────────────────────────────────────────── */}
      <section className="container-site py-10 md:py-16">
        <Chapter
          align="center"
          className="mb-10"
          n={4}
          kicker="The cloth"
          title={['Before it', 'is a garment.']}
          lead="Weave, weight, edge and seam. Everything we sell starts as this."
        />

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:grid-cols-4 lg:gap-3">
          {CLOTH_WALL.map((src, i) => (
            <motion.div
              key={src}
              initial={prefersReduced ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.06 }}
              whileHover={prefersReduced ? {} : { y: -4, zIndex: 1 }}
              className="relative aspect-square overflow-hidden rounded-lg bg-border"
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                width={600}
                height={600}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Recently viewed ─────────────────────────────────────────────── */}
      <div className="container-site">
        <RecentlyViewed />
      </div>

      <Divider />

      {/* ─── (f) NEWSLETTER BAND ─────────────────────────────────────────── */}
      <section className="container-site pb-16 md:pb-24">
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-3xl bg-text px-8 py-14 text-bg sm:px-12 md:px-16 md:py-20"
        >
          <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div className="max-w-xl">
              <motion.p
                initial={prefersReduced ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="eyebrow text-bg/50"
              >
                Get first dibs
              </motion.p>
              <motion.h2
                initial={prefersReduced ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: 0.18 }}
                className="mt-3 font-display text-hero font-bold leading-[1.05] tracking-tight"
              >
                10% off your
                <br />
                first order.
              </motion.h2>
              <motion.p
                initial={prefersReduced ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.26 }}
                className="mt-4 max-w-sm text-bg/65 leading-relaxed"
              >
                Early access to drops, restocks, and the occasional behind-the-scenes essay.
                No spam. Ever.
              </motion.p>
            </div>
            <motion.form
              initial={prefersReduced ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.32 }}
              onSubmit={subscribe}
              className="flex w-full flex-col gap-3 sm:flex-row md:w-80 md:flex-col"
            >
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-xl border border-bg/20 bg-bg/10 px-4 py-3.5 text-bg placeholder:text-bg/45 focus:border-accent focus:outline-none transition-colors"
              />
              <Button type="submit" size="lg" className="bg-accent hover:bg-accent-hover text-on-accent shrink-0">
                Subscribe
              </Button>
            </motion.form>
          </div>
        </motion.div>
      </section>
    </>
  );
}

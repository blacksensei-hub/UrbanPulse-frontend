import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';

import ProductCard from '../components/product/ProductCard.jsx';
import Divider from '../components/ui/Divider.jsx';
import SEO from '../components/SEO.jsx';
import { buildArticleSchema, SITE_URL } from '../lib/seoSchema.js';

// ─── Lookbook content ────────────────────────────────────────────────────────
// TODO: Replace productSlugs with real product slugs from your DB once you
// have a "shop the look" feature or product–lookbook join table.

const LOOKBOOKS = {
  'spring-26': {
    title: 'Spring/Summer 2026',
    eyebrow: 'The Drop',
    intro:
      `Twelve pieces conceived at the intersection of movement and stillness. Designed for the heat of Accra and the cool of early mornings, the Spring/Summer collection leans into technical fabrics and washed-down palettes.`,
    hero: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=80',
    blocks: [
      {
        type: 'image',
        src: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1400&q=80',
        caption: 'Boxy Heavyweight Tee in Bone White. 320gsm ring-spun cotton.',
      },
      {
        type: 'text',
        heading: 'Weight you can feel.',
        body: `Every tee in the collection starts at 300gsm. We believe fabric weight is the single most honest indicator of quality — you feel it the moment you pull it on. The Boxy Heavyweight is our core piece: dropped shoulders, boxy silhouette, built to outlast seasons.`,
      },
      {
        type: 'duo',
        left: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
        right: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80',
        caption: 'Left: Field Jacket in Slate. Right: Cargo Tech Pant in Khaki.',
      },
      {
        type: 'image',
        src: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1400&q=80',
        caption: 'Shot on location, East Legon, Accra.',
      },
      {
        type: 'text',
        heading: 'Built for the city.',
        body: `Accra moves fast. The accessories line — caps, totes, and utility pouches — were designed to move with it. Durable hardware, minimal branding, maximum function.`,
      },
    ],
    // TODO: Replace with real product slugs
    productSlugs: [],
  },
  'field-essentials': {
    title: 'Field Essentials',
    eyebrow: 'Editorial',
    intro:
      `A focused outerwear edit for in-between weather. Six jackets. Three silhouettes. One philosophy: you should never have to choose between looking good and staying dry.`,
    hero: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1800&q=80',
    blocks: [
      {
        type: 'image',
        src: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1400&q=80',
        caption: 'The Field Jacket — our most-requested restock.',
      },
      {
        type: 'text',
        heading: 'Technical. Minimal.',
        body: `No unnecessary hardware. No logo noise. The Field Jacket is built on a waxed ripstop shell with a relaxed, unstructured silhouette. It layers over anything. It handles light rain. It packs into itself.`,
      },
      {
        type: 'duo',
        left: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=800&q=80',
        right: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
        caption: 'Left: Olive + cargo pants. Right: Slate + boxy tee.',
      },
      {
        type: 'image',
        src: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=80',
        caption: 'Shot in Kumasi.',
      },
    ],
    productSlugs: [],
  },
  'urban-roots': {
    title: 'Urban Roots',
    eyebrow: 'Founders',
    intro:
      `UrbanPulse began as a question: why does premium streetwear consistently ignore the cities that defined the culture? This is the answer.`,
    hero: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1800&q=80',
    blocks: [
      {
        type: 'text',
        heading: `The gap we couldn't ignore.`,
        body: `In 2022, three friends noticed the same thing: the brands they admired shipped from London, Tokyo, New York. Never from Accra. Never from Lagos. Never from anywhere on the continent that actually shaped how streetwear looks and moves today. So they started UrbanPulse.`,
      },
      {
        type: 'image',
        src: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=80',
        caption: 'The first sample run, 2022.',
      },
      {
        type: 'text',
        heading: 'Small batches. Always.',
        body: `We never overproduce. Every drop is a limited batch — enough to satisfy demand without flooding the market. When something sells out, it's gone. We bring it back only when the quality can be maintained or improved.`,
      },
    ],
    productSlugs: [],
  },
};

// ─── Parallax image block ─────────────────────────────────────────────────────

function ParallaxImage({ src, alt, caption, className = '', width = 1400, height = 933 }) {
  const ref = useRef(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReduced ? ['0%', '0%'] : ['-6%', '6%'],
  );

  return (
    <figure ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div style={{ y }} className="relative h-full w-full">
        <img
          src={src}
          alt={alt || ''}
          width={width}
          height={height}
          className="w-full object-cover"
          style={{ transform: 'scale(1.14)', transformOrigin: 'center' }}
          loading="lazy"
        />
      </motion.div>
      {caption && (
        <figcaption className="mt-3 text-small text-muted italic px-1">{caption}</figcaption>
      )}
    </figure>
  );
}

function Reveal({ children, delay = 0, className = '' }) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Lookbook Index ───────────────────────────────────────────────────────────

export function LookbookIndex() {
  const entries = Object.entries(LOOKBOOKS);

  return (
    <>
      <SEO
        title="Lookbook"
        description="Editorial lookbooks and campaign stories from UrbanPulse."
        url="/lookbook"
      />

      <div className="container-site py-12 md:py-20">
        <Reveal>
          <p className="eyebrow">Editorial</p>
          <h1 className="mt-2 font-display text-hero font-bold">Lookbook</h1>
          <p className="mt-4 prose-editorial">
            Campaign stories, field guides, and the ideas behind the drops.
          </p>
        </Reveal>

        <Divider />

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(([slug, lb], i) => (
            <Reveal key={slug} delay={i * 0.07}>
              <Link to={`/lookbook/${slug}`} className="group block">
                <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-border">
                  <img
                    src={lb.hero}
                    alt={lb.title}
                    loading="lazy"
                    width={900}
                    height={600}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <p className="eyebrow text-white/60">{lb.eyebrow}</p>
                    <p className="mt-1 font-display text-h3 font-semibold">{lb.title}</p>
                  </div>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                  Read story
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Lookbook Detail ──────────────────────────────────────────────────────────

export function LookbookDetail() {
  const { slug } = useParams();
  const lb = LOOKBOOKS[slug];
  const prefersReduced = useReducedMotion();

  if (!lb) {
    return (
      <div className="container-site py-24 text-center">
        <h1 className="font-display text-h1 font-bold">Story not found</h1>
        <Link to="/lookbook" className="mt-4 inline-block text-accent hover:text-accent-hover">
          ← Back to lookbook
        </Link>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`${lb.title} — UrbanPulse Lookbook`}
        suffix={false}
        description={lb.intro.slice(0, 155)}
        image={lb.hero}
        url={`/lookbook/${slug}`}
        type="article"
        jsonLd={[buildArticleSchema(lb, `${SITE_URL}/lookbook/${slug}`)]}
      />

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ height: 'clamp(55vh, 72vh, 90vh)', minHeight: '420px' }}
      >
        <div className="absolute inset-0">
          <img
            src={lb.hero}
            alt={lb.title}
            className="h-full w-full object-cover"
            loading="eager"
            width={1600}
            height={900}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/30 to-black/75" />
        </div>
        <div className="relative z-10 container-site flex h-full flex-col justify-end pb-14 md:pb-20">
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            <p className="eyebrow text-white/60">{lb.eyebrow}</p>
            <h1 className="mt-3 font-display text-hero font-bold text-white leading-[1.05]">
              {lb.title}
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Intro */}
      <div className="container-site max-w-3xl py-14 md:py-20">
        <Reveal>
          <p className="prose-editorial">{lb.intro}</p>
        </Reveal>
      </div>

      <Divider />

      {/* Blocks */}
      <div className="container-site space-y-16 pb-16 md:space-y-24 md:pb-24">
        {lb.blocks.map((block, i) => {
          if (block.type === 'image') {
            return (
              <Reveal key={i}>
                <ParallaxImage
                  src={block.src}
                  alt={block.caption || ''}
                  caption={block.caption}
                  className="rounded-2xl"
                />
              </Reveal>
            );
          }

          if (block.type === 'text') {
            return (
              <Reveal key={i} className="mx-auto max-w-2xl">
                <h2 className="font-display text-display font-bold">{block.heading}</h2>
                <p className="mt-5 prose-editorial">{block.body}</p>
              </Reveal>
            );
          }

          if (block.type === 'duo') {
            return (
              <Reveal key={i}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ParallaxImage
                    src={block.left}
                    alt=""
                    width={900}
                    height={1200}
                    className="aspect-[3/4] rounded-2xl overflow-hidden"
                  />
                  <ParallaxImage
                    src={block.right}
                    alt=""
                    width={900}
                    height={1200}
                    className="aspect-[3/4] rounded-2xl overflow-hidden sm:mt-12"
                  />
                </div>
                {block.caption && (
                  <p className="mt-3 text-small text-muted italic text-center">{block.caption}</p>
                )}
              </Reveal>
            );
          }

          return null;
        })}
      </div>

      <Divider />

      {/* Shop the look */}
      {/* TODO: Wire productSlugs to real product data — currently empty until DB join exists */}
      <div className="container-site pb-16 md:pb-24">
        <Reveal>
          <p className="eyebrow">Shop the look</p>
          <h2 className="mt-2 font-display text-display font-bold">Pieces featured</h2>
          <p className="mt-3 text-sm text-muted">
            {lb.productSlugs.length === 0
              ? 'Products coming soon — browse the full collection in the meantime.'
              : 'Tap any piece to add it to your cart.'}
          </p>
        </Reveal>

        {lb.productSlugs.length === 0 && (
          <Reveal delay={0.1} className="mt-8">
            <Link to="/shop">
              <button className="inline-flex items-center gap-2 rounded-full bg-text px-6 py-3 text-sm font-semibold text-bg hover:opacity-90 transition-opacity">
                Browse all products <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </Reveal>
        )}
      </div>

      {/* Prev / next navigation */}
      <div className="container-site border-t border-border py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/lookbook"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All stories
          </Link>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            Shop the collection <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}

// Default export — router reads the slug param to choose which view
export default function Lookbook() {
  const { slug } = useParams();
  return slug ? <LookbookDetail /> : <LookbookIndex />;
}

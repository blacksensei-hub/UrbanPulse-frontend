import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import Divider from '../components/ui/Divider.jsx';
import { Button } from '../components/ui/index.jsx';
import SEO from '../components/SEO.jsx';

const ABOUT_HERO_IMAGE = 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1800&q=80';

const VALUES = [
  {
    heading: 'Craft first.',
    body: 'We start with fabric weight, stitch count, and finish. Every garment earns its place in the collection by meeting a minimum standard of quality that we set in the first sample run and have never compromised on.',
  },
  {
    heading: 'Small batches.',
    body: 'We never overproduce. Every drop is limited — enough to meet demand without flooding the market. Scarcity here isn\'t a marketing trick: it\'s a discipline that keeps us honest about what we make.',
  },
  {
    heading: 'Made for here.',
    body: 'UrbanPulse is a Ghana-first brand. Our sizing, our climate considerations, our distribution — all designed for the African city, not adapted from somewhere else as an afterthought.',
  },
];

// TODO: Replace with real team photos once available
const TEAM = [
  {
    name: 'Kofi Mensah',
    role: 'Co-founder & Creative Director',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    quote: 'We wanted to make something that felt like it came from here — not just sold here.',
  },
];

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

export default function About() {
  return (
    <>
      <SEO
        title="Our Story"
        description="UrbanPulse is a Ghana-first premium streetwear brand built on craft, small batches, and the cities that shaped street culture."
        image={ABOUT_HERO_IMAGE}
        url="/about"
      />

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ height: 'clamp(50vh, 65vh, 80vh)', minHeight: '380px' }}
      >
        {/* TODO: Replace with an actual brand hero image */}
        <img
          src={ABOUT_HERO_IMAGE}
          alt="UrbanPulse team"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          width={1600}
          height={900}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />
        <div className="relative z-10 container-site flex h-full flex-col justify-end pb-14 md:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl"
          >
            <p className="eyebrow text-white/60">Our story</p>
            <h1 className="mt-3 font-display text-hero font-bold text-white leading-[1.05]">
              Built from here.
              <br />
              For here.
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Intro */}
      <section className="container-site max-w-3xl py-14 md:py-20">
        <Reveal>
          <p className="eyebrow">The beginning</p>
        </Reveal>
        <Reveal delay={0.06} className="mt-4 space-y-5 prose-editorial">
          <p>
            UrbanPulse started with a question three friends couldn't shake: why does premium
            streetwear consistently ignore the cities that defined the culture? London, Tokyo,
            New York — the usual suspects — ship to Accra, Lagos, Nairobi. But they never come
            from there.
          </p>
          <p>
            In 2022, Kofi, Ama, and Daniel launched UrbanPulse out of a small workshop in East
            Legon. The brief was simple: make the best heavyweight tee we could at a price that
            made sense for the market, then build from there.
          </p>
          <p>
            Three years later, the collection spans outerwear, accessories, and a growing
            footwear line. Every piece is still designed in Accra. Every drop is still limited.
            The brief has never changed.
          </p>
        </Reveal>
      </section>

      <Divider />

      {/* Values */}
      <section className="container-site py-12 md:py-18">
        <Reveal>
          <p className="eyebrow">What we stand for</p>
          <h2 className="mt-2 font-display text-display font-bold">The principles</h2>
        </Reveal>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <Reveal key={v.heading} delay={i * 0.08}>
              <div className="border-t-2 border-accent pt-5">
                <h3 className="font-display text-h3 font-bold">{v.heading}</h3>
                <p className="mt-3 text-sm text-muted leading-relaxed">{v.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Divider />

      {/* Team / Founder */}
      <section className="container-site py-12 md:py-18">
        <Reveal>
          <p className="eyebrow">The people</p>
          <h2 className="mt-2 font-display text-display font-bold">Behind the brand</h2>
        </Reveal>

        <div className="mt-12 grid gap-12 md:grid-cols-2 md:items-center">
          {TEAM.map((member, i) => (
            <>
              <Reveal key={member.name} delay={0.05} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-border">
                {/* TODO: Replace with actual founder/team photo */}
                <img
                  src={member.image}
                  alt={member.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  width={800}
                  height={1000}
                />
              </Reveal>

              <Reveal delay={0.12}>
                <blockquote className="relative">
                  <span
                    className="absolute -top-6 -left-2 font-display text-8xl font-bold text-accent/15 select-none leading-none"
                    aria-hidden
                  >
                    "
                  </span>
                  <p className="relative font-display text-h2 font-semibold leading-snug">
                    {member.quote}
                  </p>
                  <footer className="mt-6">
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-sm text-muted">{member.role}</p>
                  </footer>
                </blockquote>
              </Reveal>
            </>
          ))}
        </div>
      </section>

      <Divider />

      {/* Closing CTA */}
      <section className="container-site pb-20 md:pb-28">
        <Reveal className="rounded-3xl border border-border bg-surface px-8 py-14 text-center md:px-16 md:py-20">
          <p className="eyebrow">What's next</p>
          <h2 className="mt-3 font-display text-display font-bold">
            Ready to wear it?
          </h2>
          <p className="mt-4 mx-auto max-w-md text-muted leading-relaxed">
            Every piece in the current collection ships within 48 hours across Ghana.
            Free returns, always.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/shop">
              <Button size="lg" className="group gap-2">
                Browse the collection
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/lookbook">
              <Button variant="outline" size="lg">
                View the lookbook
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}

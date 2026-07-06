import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import SEO from '../components/SEO.jsx';
import { buildFAQPageSchema } from '../lib/seoSchema.js';

const FAQS = [
  {
    q: 'How long does shipping take?',
    a: 'Standard shipping takes 5\u20137 business days. Express shipping is 2\u20133 business days. Free standard shipping on orders over GH\u20b5 1,000.',
  },
  {
    q: 'What is your return policy?',
    a: 'You can return any unworn, unwashed item within 30 days of delivery for a full refund. Original packaging required. Final sale items cannot be returned.',
  },
  {
    q: 'How do I know what size to order?',
    a: 'Each product page has a size guide tailored to that piece. Our tees run boxy and true to size; outerwear is designed with room for layering.',
  },
  {
    q: 'Do you ship internationally?',
    a: 'Yes. We currently ship to 48 countries. International shipping rates and timing are calculated at checkout based on your destination.',
  },
  {
    q: 'How do I track my order?',
    a: 'Once your order ships you\u2019ll get a tracking email. You can also view tracking info in your account under Orders.',
  },
  {
    q: 'Can I change or cancel my order?',
    a: 'Reach out to support within 1 hour of placing your order and we\u2019ll do our best. Once an order has shipped it can\u2019t be cancelled.',
  },
  {
    q: 'Are your products ethically made?',
    a: 'Yes. All UrbanPulse pieces are produced in small batches at audited factories with fair-labor certification. We publish a yearly transparency report.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <>
      <SEO
        title="FAQ"
        description="Answers to common questions about shipping, returns, sizing, and order tracking at UrbanPulse."
        url="/faq"
        jsonLd={[buildFAQPageSchema(FAQS)]}
      />

      <div className="container-site max-w-3xl py-12 md:py-20">
        <p className="eyebrow">Support</p>
        <h1 className="mt-2 font-display text-h1 font-bold">Frequently asked</h1>
        <p className="mt-3 text-muted">
          Can\u2019t find what you\u2019re looking for? Email{' '}
          <a href="mailto:support@urbanpulse.com" className="text-accent hover:text-accent-hover">
            support@urbanpulse.com
          </a>
          .
        </p>

        <ul className="mt-10 divide-y divide-border border-y border-border">
          {FAQS.map((item, i) => {
            const isOpen = i === open;
            return (
              <li key={item.q}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-display text-base font-semibold">{item.q}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border">
                    {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-muted">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

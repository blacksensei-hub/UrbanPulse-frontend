import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import SEO from '../components/SEO.jsx';
import Markdown from '../components/content/Markdown.jsx';
import NotFound from './NotFound.jsx';
import { Spinner } from '../components/ui/index.jsx';
import { useContentPage } from '../hooks/useContentPage.js';
import { parseFaqBody } from '../utils/parseFaqBody.js';
import { buildFAQPageSchema } from '../lib/seoSchema.js';

export default function FAQ() {
  const [open, setOpen] = useState(0);
  const { page, loading, fetchFailed, notFoundFlag, slowLoad, retry } = useContentPage('faq');

  if (notFoundFlag) return <NotFound />;

  const { intro, faqs } = page ? parseFaqBody(page.body) : { intro: '', faqs: [] };

  return (
    <>
      <SEO
        title="FAQ"
        description="Answers to common questions about shipping, returns, sizing, and order tracking at UrbanPulse."
        url="/faq"
        jsonLd={faqs.length ? [buildFAQPageSchema(faqs)] : undefined}
      />

      <div className="container-site max-w-3xl py-12 md:py-20">
        <p className="eyebrow">Support</p>
        <h1 className="mt-2 font-display text-h1 font-bold">Frequently asked</h1>

        {loading ? (
          <div className="mt-10 grid place-items-center gap-3 py-16 text-center">
            <Spinner />
            {slowLoad && <p className="text-sm text-muted">Still loading — hang tight.</p>}
          </div>
        ) : fetchFailed ? (
          <div className="mt-10 py-16 text-center">
            <div className="font-display text-2xl font-semibold">Couldn't load this page</div>
            <button
              onClick={retry}
              className="mt-3 inline-block text-accent hover:text-accent-hover"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="mt-3">
              <Markdown>{intro}</Markdown>
            </div>

            <ul className="mt-10 divide-y divide-border border-y border-border">
              {faqs.map((item, i) => {
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
                          <div className="pb-5">
                            <Markdown>{item.a}</Markdown>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

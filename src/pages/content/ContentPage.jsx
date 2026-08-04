import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../../components/SEO.jsx';
import Markdown from '../../components/content/Markdown.jsx';
import NotFound from '../NotFound.jsx';
import { Spinner } from '../../components/ui/index.jsx';
import { useContentPage } from '../../hooks/useContentPage.js';
import { formatDate } from '../../utils/format.js';

// Generic renderer for content_pages rows: H1 + rendered markdown body. Used
// by About and the 4 policy pages. FAQ has its own bespoke fetch+parse logic
// (see FAQ.jsx) since it needs to keep its accordion markup.
export default function ContentPage({ slug, eyebrow, showLastUpdated = false, showBackToTop = false, noindex = false }) {
  const { page, loading, fetchFailed, notFoundFlag, slowLoad, retry } = useContentPage(slug);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    if (!showBackToTop) return;
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showBackToTop]);

  if (notFoundFlag) return <NotFound />;

  return (
    <>
      <SEO title={page?.title} description={page?.meta_description} url={`/${slug}`} noindex={noindex} />

      <div className="container-site" style={{ maxWidth: '48rem' }}>
        <div style={{ paddingBlock: 'var(--space-section)' }}>
          {loading ? (
            <div className="grid place-items-center gap-3 py-16 text-center">
              <Spinner />
              {slowLoad && <p className="text-sm text-muted">Still loading — hang tight.</p>}
            </div>
          ) : fetchFailed ? (
            <div className="py-16 text-center">
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
              {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
              <h1 className="font-display text-h1 font-bold">{page.title}</h1>
              {showLastUpdated && (
                <p className="mt-2 text-small text-muted">Last updated: {formatDate(page.updated_at)}</p>
              )}
              <div className="mt-12">
                <Markdown>{page.body}</Markdown>
              </div>
            </>
          )}
        </div>
      </div>

      {showBackToTop && (
        <AnimatePresence>
          {showTop && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-24 right-6 lg:bottom-8 z-30 rounded-full bg-surface border border-border shadow-md px-4 py-2 text-xs font-medium hover:border-accent hover:text-accent transition-colors"
              aria-label="Back to top"
            >
              ↑ Top
            </motion.button>
          )}
        </AnimatePresence>
      )}
    </>
  );
}

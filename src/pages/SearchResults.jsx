import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

import ProductCard from '../components/product/ProductCard.jsx';
import SEO from '../components/SEO.jsx';
import { productService } from '../services/index.js';
import { staggerContainer } from '../lib/motion.js';

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    productService
      .search(q)
      .then((data) => setResults(data.items ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <>
      <SEO title="Search" noindex />

      <div className="container-site py-8 md:py-12">
        <h1 className="font-display text-h1 font-bold">
          Search results
        </h1>
        <p className="mt-1 text-sm text-muted">
          {loading
            ? 'Searching\u2026'
            : `${results.length} result${results.length === 1 ? '' : 's'} for "${q}"`}
        </p>

        {loading ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="skeleton aspect-[3/4] w-full rounded-lg" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-4 w-1/3 rounded" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="mt-12 flex flex-col items-center text-center py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
              <Search className="h-9 w-9 text-accent" />
            </div>
            <div className="mt-5 font-display text-xl font-semibold">No results for &ldquo;{q}&rdquo;</div>
            <p className="mt-2 text-sm text-muted max-w-sm">
              Try a broader term, or explore by category.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[['Shop All', ''], ['Outerwear', 'Outerwear'], ['Accessories', 'Accessories'], ['Tops', 'Tops']].map(([label, cat]) => (
                <Link
                  key={label}
                  to={cat ? `/shop?category=${cat}` : '/shop'}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5"
          >
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

import ProductCard from '../components/product/ProductCard.jsx';
import { Button } from '../components/ui/index.jsx';
import { productService } from '../services/index.js';
import { staggerContainer, bottomSheetVariants } from '../lib/motion.js';
import { usePullToRefresh } from '../hooks/usePullToRefresh.js';
import PullToRefreshIndicator from '../components/ui/PullToRefreshIndicator.jsx';

const CATEGORIES = ['All', 'Tops', 'Outerwear', 'Bottoms', 'Footwear', 'Accessories'];
const SIZES  = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', 'One size'];
const COLORS = ['Black', 'White', 'Navy', 'Grey', 'Brown', 'Green', 'Blue', 'Red', 'Cream'];
const SORTS  = [
  { value: 'newest',     label: 'Newest' },
  { value: 'price-asc',  label: 'Price: Low to high' },
  { value: 'price-desc', label: 'Price: High to low' },
  { value: 'rating',     label: 'Top rated' },
];

const FILTER_CHIP_LABELS = {
  category: (v) => v,
  size:     (v) => `Size: ${v}`,
  color:    (v) => `Color: ${v}`,
  minPrice: (v) => `Min: GH₵ ${v}`,
  maxPrice: (v) => `Max: GH₵ ${v}`,
  inStock:  ()  => 'In stock only',
};

const EMPTY_FILTERS = {
  category: '', minPrice: '', maxPrice: '', sort: 'newest',
  size: '', color: '', inStock: '',
};

function FilterPanel({ filters, setFilters, onApply }) {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-5">
      <div>
        <p className="eyebrow mb-3">Category</p>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilters((f) => ({ ...f, category: c === 'All' ? '' : c }))}
              className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                (filters.category || 'All') === c ? 'bg-accent text-white' : 'hover:bg-highlight'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3">Price range</p>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" placeholder="Min" value={filters.minPrice}
            onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
            className="input" />
          <input type="number" placeholder="Max" value={filters.maxPrice}
            onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
            className="input" />
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3">Size</p>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((s) => (
            <button key={s}
              onClick={() => setFilters((f) => ({ ...f, size: f.size === s ? '' : s }))}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                filters.size === s ? 'border-accent bg-accent text-white' : 'border-border hover:border-text'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3">Color</p>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((c) => (
            <button key={c}
              onClick={() => setFilters((f) => ({ ...f, color: f.color === c ? '' : c }))}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                filters.color === c ? 'border-accent bg-accent text-white' : 'border-border hover:border-text'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <button
          onClick={() => setFilters((f) => ({ ...f, inStock: f.inStock ? '' : 'true' }))}
          className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-colors ${
            filters.inStock ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-text'
          }`}
        >
          In stock only
          <span className={`h-4 w-4 rounded-full border-2 ${filters.inStock ? 'border-accent bg-accent' : 'border-muted'}`} />
        </button>
      </div>

      <div className="mt-auto flex gap-2 border-t border-border pt-4">
        <Button variant="ghost" className="flex-1"
          onClick={() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort })}>
          Reset
        </Button>
        {onApply && <Button className="flex-1" onClick={onApply}>Apply</Button>}
      </div>
    </div>
  );
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    category: searchParams.get('category') ?? '',
    minPrice:  searchParams.get('minPrice')  ?? '',
    maxPrice:  searchParams.get('maxPrice')  ?? '',
    sort:      searchParams.get('sort')      ?? 'newest',
    size:      searchParams.get('size')      ?? '',
    color:     searchParams.get('color')     ?? '',
    inStock:   searchParams.get('inStock')   ?? '',
  });
  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [page, setPage]         = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const prefersReduced = useReducedMotion();
  const backdropRef = useRef(null);

  const params = useMemo(() => ({ ...filters, page, limit: 24 }), [filters, page]);

  useEffect(() => {
    setLoading(true);
    productService.list(params)
      .then((data) => { setProducts(data.items ?? []); setTotal(data.total ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params, refreshKey]);

  const { pulling, pullProgress, refreshing } = usePullToRefresh(
    () => setRefreshKey((k) => k + 1),
    { disabled: mobileOpen },
  );

  useEffect(() => {
    const next = {};
    if (filters.category) next.category = filters.category;
    if (filters.minPrice) next.minPrice  = filters.minPrice;
    if (filters.maxPrice) next.maxPrice  = filters.maxPrice;
    if (filters.sort && filters.sort !== 'newest') next.sort = filters.sort;
    if (filters.size)    next.size    = filters.size;
    if (filters.color)   next.color   = filters.color;
    if (filters.inStock) next.inStock = filters.inStock;
    setSearchParams(next, { replace: true });
    setPage(1);
  }, [filters, setSearchParams]);

  const totalPages = Math.max(1, Math.ceil(total / 24));

  const activeChips = Object.entries(filters)
    .filter(([k, v]) => v && k !== 'sort' && FILTER_CHIP_LABELS[k])
    .map(([k, v]) => ({ key: k, label: FILTER_CHIP_LABELS[k](v) }));

  const SortSelect = () => (
    <div className="relative">
      <select
        value={filters.sort}
        onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
        className="appearance-none rounded-pill border border-border bg-surface pl-4 pr-8 py-2 text-sm font-medium focus:border-accent focus:outline-none cursor-pointer"
      >
        {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
    </div>
  );

  return (
    <>
      <PullToRefreshIndicator pulling={pulling} pullProgress={pullProgress} refreshing={refreshing} />
      <Helmet>
        <title>Shop — UrbanPulse</title>
        <meta name="description" content="Browse all UrbanPulse products — clothing, accessories, and more. Filter by category, size, and colour." />
        <link rel="canonical" href={`${import.meta.env.VITE_APP_URL || 'https://urbanpulse.com'}/shop`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Shop — UrbanPulse" />
        <meta property="og:description" content="Browse all UrbanPulse products — clothing, accessories, and more." />
        <meta property="og:url" content={`${import.meta.env.VITE_APP_URL || 'https://urbanpulse.com'}/shop`} />
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <div className="container-site py-8 md:py-12">
        {/* Page header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-1">Catalogue</p>
            <h1 className="font-display text-h1 font-bold">Shop everything</h1>
            <p className="mt-1 text-sm text-muted">
              {loading ? 'Loading…' : `${total} pieces in rotation`}
            </p>
          </div>
          {/* Mobile controls */}
          <div className="flex items-center gap-2 lg:hidden">
            <SortSelect />
            <button
              onClick={() => setMobileOpen(true)}
              className="inline-flex items-center gap-2 rounded-pill border border-border px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeChips.length > 0 && (
                <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                  {activeChips.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr] 4xl:grid-cols-[320px_1fr]">
          {/* Desktop sticky sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border border-border bg-surface">
              <FilterPanel filters={filters} setFilters={setFilters} />
            </div>
          </aside>

          {/* Grid area */}
          <div>
            {/* Active chips + sort row */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              {activeChips.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeChips.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFilters((f) => ({ ...f, [key]: '' }))}
                      className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent transition-colors"
                    >
                      {label}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                  {activeChips.length > 1 && (
                    <button
                      onClick={() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort })}
                      className="px-1 text-xs text-muted hover:text-accent transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              ) : <span />}
              <div className="hidden lg:block"><SortSelect /></div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="skeleton aspect-[3/4] w-full rounded-lg" />
                    <div className="skeleton h-4 w-3/4 rounded" />
                    <div className="skeleton h-4 w-1/3 rounded" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-12 text-center">
                <div className="font-display text-xl font-semibold">Nothing matches yet</div>
                <p className="mt-2 text-sm text-muted">Try widening your filters or browse all categories.</p>
              </div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5"
              >
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </motion.div>
            )}

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <span className="text-sm text-muted">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet — glass treatment */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              ref={backdropRef}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              drag={prefersReduced ? false : 'y'}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              onDrag={(_, info) => {
                if (backdropRef.current && info.offset.y > 0) {
                  backdropRef.current.style.opacity = Math.max(0, 1 - info.offset.y / 240);
                }
              }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 200 || info.velocity.y > 400) {
                  setMobileOpen(false);
                } else if (backdropRef.current) {
                  backdropRef.current.style.opacity = '';
                }
              }}
              variants={bottomSheetVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-xl glass-strong lg:hidden"
            >
              <div className="flex justify-center pt-2.5 pb-0.5" aria-hidden="true">
                <div className="h-1 w-10 rounded-full bg-border/60" />
              </div>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <span className="font-semibold">Filters</span>
                <button onClick={() => setMobileOpen(false)} aria-label="Close filters"
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-highlight">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                <FilterPanel filters={filters} setFilters={setFilters} onApply={() => setMobileOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

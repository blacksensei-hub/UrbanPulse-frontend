import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';

import ProductCard from '../components/product/ProductCard.jsx';
import { Button } from '../components/ui/index.jsx';
import SEO from '../components/SEO.jsx';
import { productService } from '../services/index.js';
import { MetaRow } from '../components/ui/Instrument.jsx';
import { formatCurrency, titleCase } from '../utils/format.js';
import { staggerContainer } from '../lib/motion.js';
import Sheet from '../components/ui/Sheet.jsx';
import { usePullToRefresh } from '../hooks/usePullToRefresh.js';
import PullToRefreshIndicator from '../components/ui/PullToRefreshIndicator.jsx';
import { CATEGORIES as PRODUCT_CATEGORIES } from '../lib/categories.js';

const CATEGORIES = ['All', ...PRODUCT_CATEGORIES];
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
  minPrice: (v) => `Min: ${formatCurrency(v)}`,
  maxPrice: (v) => `Max: ${formatCurrency(v)}`,
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
                (filters.category || 'All') === c ? 'bg-accent text-on-accent' : 'hover:bg-highlight'
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
                filters.size === s ? 'border-accent bg-accent text-on-accent' : 'border-border hover:border-text'
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
                filters.color === c ? 'border-accent bg-accent text-on-accent' : 'border-border hover:border-text'
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
            filters.inStock ? 'border-accent bg-accent/10 text-accent-text' : 'border-border hover:border-text'
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

  // The URL is the single source of truth for filters · derived fresh every render
  // instead of mirrored into separate useState+effects. React Router doesn't remount
  // Shop on a query-only navigation (e.g. the mega-menu linking to /shop?category=X
  // while already on /shop), so a one-time useState initializer would go stale the
  // moment an external link changed the URL; a plain derived value can't go stale.
  const filters = useMemo(() => ({
    category: searchParams.get('category') ?? '',
    minPrice:  searchParams.get('minPrice')  ?? '',
    maxPrice:  searchParams.get('maxPrice')  ?? '',
    sort:      searchParams.get('sort')      ?? 'newest',
    size:      searchParams.get('size')      ?? '',
    color:     searchParams.get('color')     ?? '',
    inStock:   searchParams.get('inStock')   ?? '',
  }), [searchParams]);

  // Matches useState's setter signature (plain object OR updater function) so every
  // existing call site below reads exactly as it did when this was local state.
  function setFilters(update) {
    const next = typeof update === 'function' ? update(filters) : update;
    const params = {};
    if (next.category) params.category = next.category;
    if (next.minPrice) params.minPrice = next.minPrice;
    if (next.maxPrice) params.maxPrice = next.maxPrice;
    if (next.sort && next.sort !== 'newest') params.sort = next.sort;
    if (next.size)    params.size    = next.size;
    if (next.color)   params.color   = next.color;
    if (next.inStock) params.inStock = next.inStock;
    setSearchParams(params, { replace: true });
    setPage(1);
  }

  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [page, setPage]         = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const params = useMemo(() => ({ ...filters, page, limit: 24 }), [filters, page]);

  useEffect(() => {
    setLoading(true);
    setFetchFailed(false);
    setSlowLoad(false);
    const slowTimer = setTimeout(() => setSlowLoad(true), 5000);
    productService.list(params)
      .then((data) => { setProducts(data.items ?? []); setTotal(data.total ?? 0); })
      .catch(() => setFetchFailed(true))
      .finally(() => { setLoading(false); clearTimeout(slowTimer); });
    return () => clearTimeout(slowTimer);
  }, [params, refreshKey]);


  const { pulling, pullProgress, refreshing } = usePullToRefresh(
    () => setRefreshKey((k) => k + 1),
    { disabled: mobileOpen },
  );

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
      <SEO
        title={filters.category ? `Shop ${filters.category}` : 'Shop'}
        description="Browse all UrbanPulse products: clothing, accessories, and more. Filter by category, size, and colour."
        url="/shop"
      />

      <div className="container-site py-8 md:py-12">
        {/* Page header */}
        <MetaRow
          className="mb-7"
          left={filters.category ? `Catalogue / ${titleCase(filters.category)}` : 'Catalogue / Everything'}
          right={loading ? 'Counting' : `${total} ${total === 1 ? 'piece' : 'pieces'} in rotation`}
        />
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-h1 font-bold leading-[1.02] tracking-tight">
              <span className="block">{filters.category ? titleCase(filters.category) : 'Everything'}</span>
              <span className="block text-muted">in rotation.</span>
            </h1>
          </div>
          {/* Mobile controls */}
          <div className="flex items-center gap-2 lg:hidden">
            <SortSelect />
            <button
              onClick={() => setMobileOpen(true)}
              className="inline-flex items-center gap-2 rounded-pill border border-border px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent-text transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeChips.length > 0 && (
                <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">
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
                      className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-text transition-colors"
                    >
                      {label}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                  {activeChips.length > 1 && (
                    <button
                      onClick={() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort })}
                      className="px-1 text-xs text-muted hover:text-accent-text transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              ) : <span />}
              <div className="hidden lg:block"><SortSelect /></div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <div className="skeleton aspect-[3/4] w-full rounded-lg" />
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
              <div className="rounded-xl border border-border bg-surface p-12 text-center">
                <div className="font-display text-xl font-semibold">Couldn&apos;t load products</div>
                <p className="mt-2 text-sm text-muted">Something went wrong on our end.</p>
                <Button variant="outline" size="sm" className="mt-4"
                  onClick={() => setRefreshKey((k) => k + 1)}>
                  Retry
                </Button>
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

      {/* Mobile filters: the shared bottom sheet (follows the finger, projects
          the flick, closes downward at the finger's speed). */}
      <div className="lg:hidden">
        <Sheet
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          title="Filters"
          presentation="sheet"
          bodyClassName="!px-0"
        >
          <FilterPanel filters={filters} setFilters={setFilters} onApply={() => setMobileOpen(false)} />
        </Sheet>
      </div>
    </>
  );
}

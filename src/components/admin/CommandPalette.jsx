import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Search, Users, ShoppingBag, Package, RotateCcw,
  LayoutDashboard, ClockIcon, Zap, X,
} from 'lucide-react';
import { adminService } from '../../services/index.js';
import { scalePop, fadeIn } from '../../lib/motion.js';

const QUICK_ACTIONS = [
  { label: 'Today',               sublabel: 'Dashboard overview',           href: '/admin',                      icon: LayoutDashboard },
  { label: 'Processing orders',   sublabel: 'Orders awaiting fulfilment',   href: '/admin/orders?status=processing', icon: ShoppingBag },
  { label: 'Pending returns',     sublabel: 'Returns awaiting approval',    href: '/admin/returns?status=requested', icon: RotateCcw },
  { label: 'Add product',         sublabel: 'Create a new product listing', href: '/admin/products/new',         icon: Package },
];

const TYPE_ICONS = {
  customer: Users,
  order:    ShoppingBag,
  product:  Package,
  return:   RotateCcw,
};

const TYPE_LABELS = {
  customer: 'Customers',
  order:    'Orders',
  product:  'Products',
  return:   'Returns',
};

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem('urbanpulse-admin-recent') || '[]');
  } catch {
    return [];
  }
}

function saveRecent(item) {
  try {
    const prev = getRecent().filter(r => r.href !== item.href);
    const next = [item, ...prev].slice(0, 5);
    localStorage.setItem('urbanpulse-admin-recent', JSON.stringify(next));
  } catch {}
}

function groupByType(results) {
  const groups = {};
  for (const r of results) {
    if (!groups[r.type]) groups[r.type] = [];
    groups[r.type].push(r);
  }
  return groups;
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState([]);

  // Flatten all selectable items for keyboard nav
  const flatItems = q.trim().length >= 2
    ? results
    : q.trim().length === 0
      ? [...QUICK_ACTIONS, ...recent.map(r => ({ ...r, isRecent: true }))]
      : [];

  const handleSelect = useCallback((item) => {
    if (!item.href) return;
    saveRecent({ type: item.type ?? 'quick', label: item.label, sublabel: item.sublabel ?? '', href: item.href });
    navigate(item.href);
    onClose();
    setQ('');
    setResults([]);
    setActiveIndex(0);
  }, [navigate, onClose]);

  // Debounced search
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await adminService.search(term);
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [q]);

  // Reset + focus when opened
  useEffect(() => {
    if (open) {
      setQ('');
      setResults([]);
      setActiveIndex(0);
      setRecent(getRecent());
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[activeIndex]) handleSelect(flatItems[activeIndex]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, flatItems, activeIndex, handleSelect, onClose]);

  // Reset active index when results change
  useEffect(() => { setActiveIndex(0); }, [results, q]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const dialogVariants = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : scalePop;

  const backdropVariants = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : fadeIn;

  // Build display sections
  const showEmpty = q.trim().length === 0;
  const showNoResults = q.trim().length >= 2 && !loading && results.length === 0;
  const grouped = groupByType(results);
  const typeOrder = Object.keys(grouped);

  // Accumulate flat index offset per group for keyboard nav
  let flatOffset = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="palette-backdrop"
            variants={backdropVariants}
            initial="initial" animate="animate" exit="exit"
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            key="palette-dialog"
            variants={dialogVariants}
            initial="initial" animate="animate" exit="exit"
            className="fixed inset-x-3 top-[12vh] z-[91] mx-auto w-full max-w-2xl sm:inset-x-4 sm:top-[20vh]"
            role="dialog"
            aria-label="Command palette"
            aria-modal="true"
          >
            <div className="glass-strong rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[70vh] sm:max-h-[60vh]">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-muted" />
                <input
                  ref={inputRef}
                  type="text"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search customers, orders, products, returns…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
                  autoComplete="off"
                  spellCheck={false}
                />
                {q && (
                  <button
                    onClick={() => { setQ(''); inputRef.current?.focus(); }}
                    className="text-muted hover:text-text transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-highlight px-1.5 text-[10px] font-medium text-muted">
                  ESC
                </kbd>
              </div>

              {/* Results area */}
              <div ref={listRef} className="overflow-y-auto flex-1">
                {/* Loading skeleton */}
                {loading && (
                  <div className="space-y-1 p-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                        <div className="h-7 w-7 animate-pulse rounded-md bg-border" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-1/3 animate-pulse rounded bg-border" />
                          <div className="h-2.5 w-1/2 animate-pulse rounded bg-border" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search results grouped by type */}
                {!loading && q.trim().length >= 2 && typeOrder.map(type => {
                  const items = grouped[type];
                  const groupStartIndex = flatOffset;
                  flatOffset += items.length;
                  const Icon = TYPE_ICONS[type] ?? Package;

                  return (
                    <div key={type}>
                      <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
                        {TYPE_LABELS[type] ?? type}
                      </div>
                      {items.map((item, i) => {
                        const idx = groupStartIndex + i;
                        return (
                          <ResultRow
                            key={item.href}
                            item={item}
                            Icon={Icon}
                            active={idx === activeIndex}
                            onSelect={() => handleSelect(item)}
                            onHover={() => setActiveIndex(idx)}
                          />
                        );
                      })}
                    </div>
                  );
                })}

                {/* No results */}
                {showNoResults && (
                  <div className="px-4 py-8 text-center text-sm text-muted">
                    No results for <span className="font-medium text-text">"{q}"</span>
                  </div>
                )}

                {/* Empty state — quick actions + recent */}
                {showEmpty && !loading && (
                  <>
                    <div>
                      <div className="flex items-center gap-2 px-4 py-1.5">
                        <Zap className="h-3 w-3 text-muted" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Quick actions</span>
                      </div>
                      {QUICK_ACTIONS.map((item, i) => {
                        const Icon = item.icon;
                        return (
                          <ResultRow
                            key={item.href}
                            item={item}
                            Icon={Icon}
                            active={i === activeIndex}
                            onSelect={() => handleSelect(item)}
                            onHover={() => setActiveIndex(i)}
                          />
                        );
                      })}
                    </div>

                    {recent.length > 0 && (
                      <div className="border-t border-border">
                        <div className="flex items-center gap-2 px-4 py-1.5">
                          <ClockIcon className="h-3 w-3 text-muted" />
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Recent</span>
                        </div>
                        {recent.map((item, i) => {
                          const idx = QUICK_ACTIONS.length + i;
                          const Icon = TYPE_ICONS[item.type] ?? Package;
                          return (
                            <ResultRow
                              key={item.href}
                              item={item}
                              Icon={Icon}
                              active={idx === activeIndex}
                              onSelect={() => handleSelect(item)}
                              onHover={() => setActiveIndex(idx)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer hint */}
              <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted">
                <span><kbd className="font-sans">↑↓</kbd> navigate</span>
                <span><kbd className="font-sans">↵</kbd> select</span>
                <span><kbd className="font-sans">Esc</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ResultRow({ item, Icon, active, onSelect, onHover }) {
  return (
    <button
      type="button"
      data-active={active}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors mx-1 ${
        active ? 'bg-highlight text-text' : 'text-text hover:bg-highlight'
      }`}
      style={{ width: 'calc(100% - 8px)' }}
    >
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${active ? 'bg-accent/15 text-accent' : 'bg-border/60 text-muted'}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.label}</span>
        {item.sublabel && (
          <span className="block truncate text-xs text-muted">{item.sublabel}</span>
        )}
      </span>
    </button>
  );
}

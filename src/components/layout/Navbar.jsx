import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X, ShoppingBag, Search, User } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle.jsx';
import { productService } from '../../services/index.js';
import { useCartStore } from '../../stores/cartStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { easeOut } from '../../lib/motion.js';

/* Desktop nav — Shop gets the mega-menu */
const NAV_LINKS = [
  { to: '/shop', label: 'Shop', hasMegaMenu: true },
  { to: '/lookbook', label: 'Lookbook' },
  { to: '/faq', label: 'Support' },
];

/* Mobile drawer — preserves all category shortcuts */
const MOBILE_NAV = [
  { to: '/shop', label: 'Shop' },
  { to: '/shop?category=Outerwear', label: 'Outerwear' },
  { to: '/shop?category=Accessories', label: 'Accessories' },
  { to: '/lookbook', label: 'Lookbook' },
  { to: '/faq', label: 'Support' },
];

/* Mega-menu categories — TODO: swap `abbr` placeholders for first product image per category */
const MEGA_CATEGORIES = [
  { label: 'Tops',        to: '/shop?category=Tops',        abbr: 'T' },
  { label: 'Outerwear',   to: '/shop?category=Outerwear',   abbr: 'O' },
  { label: 'Bottoms',     to: '/shop?category=Bottoms',     abbr: 'B' },
  { label: 'Footwear',    to: '/shop?category=Footwear',    abbr: 'F' },
  { label: 'Accessories', to: '/shop?category=Accessories', abbr: 'A' },
];

export default function Navbar() {
  const [scrolled, setScrolled]         = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [q, setQ]                       = useState('');
  const [suggestions, setSuggestions]   = useState([]);
  const [activeIndex, setActiveIndex]   = useState(-1);
  const debounceRef  = useRef(null);
  const navigate     = useNavigate();
  const location     = useLocation();
  const itemCount    = useCartStore((s) => s.cart.items.reduce((n, it) => n + it.quantity, 0));
  const openDrawer   = useCartStore((s) => s.openDrawer);
  const bouncing     = useCartStore((s) => s.bouncing);
  const user         = useAuthStore((s) => s.user);
  const reducedMotion = useReducedMotion();

  // Wordmark reveal: animate once per session unless reducedMotion is set
  const [wordmarkShouldAnimate] = useState(() => {
    if (reducedMotion) return false;
    try { return !sessionStorage.getItem('urbanpulse-wordmark-seen'); } catch { return false; }
  });
  const [wordmarkVisible, setWordmarkVisible] = useState(!wordmarkShouldAnimate);

  useEffect(() => {
    if (!wordmarkShouldAnimate) return;
    // Start cascade almost immediately; transition.delay values handle the per-letter stagger
    const t1 = setTimeout(() => setWordmarkVisible(true), 80);
    // Save flag after last letter finishes: 80ms + (0.3 + 9*0.04)s delay + 0.3s duration + buffer
    const t2 = setTimeout(() => {
      try { sessionStorage.setItem('urbanpulse-wordmark-seen', '1'); } catch {}
    }, 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [wordmarkShouldAnimate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen || searchOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
  }, [mobileOpen, searchOpen]);

  /* Close mega-menu on route change */
  useEffect(() => {
    setMegaMenuOpen(false);
  }, [location.pathname, location.search]);

  /* Global Escape handler — covers mega-menu and search overlay */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMegaMenuOpen(false);
        setSearchOpen(false);
        setSuggestions([]);
        setActiveIndex(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      setSearchOpen(false);
      setQ('');
      setSuggestions([]);
      setActiveIndex(-1);
    }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const springTransition = reducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 320, damping: 32, mass: 0.8 };

  return (
    <>
      {/* Outer wrapper: fixed, padded from edges */}
      <div className="fixed inset-x-0 top-0 z-50 px-3 sm:px-4 pt-3 sm:pt-4 pointer-events-none">
        <motion.nav
          animate={{
            maxWidth: scrolled ? 1120 : 1400,
            borderRadius: scrolled ? 999 : 16,
            paddingTop: scrolled ? 9 : 14,
            paddingBottom: scrolled ? 9 : 14,
            boxShadow: scrolled ? 'var(--shadow-float)' : '0 0 0 rgba(0,0,0,0)',
          }}
          transition={springTransition}
          className="mx-auto w-full pointer-events-auto glass-strong"
        >
          <div className="px-4 sm:px-6 flex items-center justify-between gap-3">

            {/* Left: logo + desktop nav */}
            <div className="flex items-center gap-8">
              <Link to="/" className="font-display text-2xl font-bold tracking-tight">
                {'urban'.split('').map((ch, i) => (
                  <motion.span
                    key={`u${i}`}
                    initial={wordmarkShouldAnimate ? { opacity: 0 } : false}
                    animate={{ opacity: wordmarkVisible ? 1 : 0 }}
                    transition={{ delay: 0.3 + i * 0.04, duration: 0.3 }}
                  >{ch}</motion.span>
                ))}
                {'pulse'.split('').map((ch, i) => (
                  <motion.span
                    key={`p${i}`}
                    className="text-accent"
                    initial={wordmarkShouldAnimate ? { opacity: 0 } : false}
                    animate={{ opacity: wordmarkVisible ? 1 : 0 }}
                    transition={{ delay: 0.3 + (5 + i) * 0.04, duration: 0.3 }}
                  >{ch}</motion.span>
                ))}
              </Link>

              <nav className="hidden lg:flex items-center gap-7">
                {NAV_LINKS.map((l) => {
                  const base = l.to.split('?')[0];
                  const isActive = base === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(base);

                  if (l.hasMegaMenu) {
                    return (
                      <div
                        key={l.to}
                        className="relative"
                        onMouseEnter={() => setMegaMenuOpen(true)}
                        onMouseLeave={() => setMegaMenuOpen(false)}
                      >
                        <NavLink
                          to={l.to}
                          className="relative text-small font-medium hover:text-accent transition-colors py-1 inline-block"
                        >
                          {l.label}
                          {isActive && !reducedMotion && (
                            <motion.span
                              layoutId="nav-underline"
                              className="absolute inset-x-0 -bottom-0.5 h-[2px] bg-accent rounded-full"
                            />
                          )}
                        </NavLink>

                        <AnimatePresence>
                          {megaMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={reducedMotion ? { duration: 0 } : easeOut}
                              className="absolute left-0 top-full mt-4 w-[400px] glass-strong rounded-xl p-5 shadow-lg z-10"
                            >
                              <p className="eyebrow mb-4">Browse categories</p>
                              <div className="grid grid-cols-5 gap-2">
                                {MEGA_CATEGORIES.map((cat) => (
                                  <Link
                                    key={cat.to}
                                    to={cat.to}
                                    onClick={() => setMegaMenuOpen(false)}
                                    className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-highlight transition-colors group text-center"
                                  >
                                    {/* TODO: replace placeholder with first product image for this category */}
                                    <div className="w-10 h-10 rounded-md bg-border flex items-center justify-center text-xs font-bold text-muted group-hover:bg-surface transition-colors">
                                      {cat.abbr}
                                    </div>
                                    <span className="text-xs font-medium leading-tight">{cat.label}</span>
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      className="relative text-small font-medium hover:text-accent transition-colors py-1 inline-block"
                    >
                      {l.label}
                      {isActive && !reducedMotion && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute inset-x-0 -bottom-0.5 h-[2px] bg-accent rounded-full"
                        />
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="w-11 h-11 rounded-full hover:bg-highlight flex items-center justify-center transition-colors"
              >
                <Search size={18} />
              </button>
              <Link
                to={user ? '/account' : '/login'}
                aria-label="Account"
                className="hidden md:flex w-11 h-11 rounded-full hover:bg-highlight items-center justify-center transition-colors overflow-hidden"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name ?? ''}
                    className="w-7 h-7 rounded-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling?.removeAttribute('style'); }}
                  />
                ) : user ? (
                  <span className="w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-semibold flex items-center justify-center">
                    {user.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                ) : (
                  <User size={18} />
                )}
              </Link>
              <ThemeToggle />
              <motion.button
                onClick={openDrawer}
                aria-label={`Cart, ${itemCount} items`}
                className="relative w-11 h-11 rounded-full hover:bg-highlight flex items-center justify-center transition-colors"
                animate={bouncing && !reducedMotion ? { scale: [1, 1.15, 0.92, 1], rotate: [0, -8, 5, 0] } : {}}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <ShoppingBag size={18} />
                {itemCount > 0 && (
                  <motion.span
                    className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center overflow-hidden"
                    animate={bouncing && !reducedMotion ? { backgroundColor: ['#D85A30', '#FF7849', '#D85A30'] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    {reducedMotion ? (
                      itemCount
                    ) : (
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={itemCount}
                          initial={{ y: 12 }}
                          animate={{ y: 0 }}
                          exit={{ y: -12 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                          className="inline-block"
                        >
                          {itemCount}
                        </motion.span>
                      </AnimatePresence>
                    )}
                  </motion.span>
                )}
              </motion.button>
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className="lg:hidden w-11 h-11 rounded-full hover:bg-highlight flex items-center justify-center transition-colors"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </motion.nav>
      </div>

      {/* Mobile drawer — z-[60]/[70] clears z-50 nav */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              role="dialog" aria-modal="true" aria-label="Navigation menu"
              className="fixed top-0 right-0 z-[70] h-full w-[88vw] max-w-sm glass-strong p-6 flex flex-col"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-display text-xl font-bold">Menu</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="w-10 h-10 rounded-full hover:bg-highlight flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {MOBILE_NAV.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 text-h3 font-display font-semibold border-b border-border hover:text-accent transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  to={user ? '/account' : '/login'}
                  onClick={() => setMobileOpen(false)}
                  className="py-3 text-h3 font-display font-semibold border-b border-border hover:text-accent transition-colors"
                >
                  {user ? 'Account' : 'Sign in'}
                </Link>
              </nav>

              {/* Support & policy links */}
              <div className="mt-6 pt-6 border-t border-border overflow-y-auto">
                <p className="eyebrow mb-3">Support &amp; Policies</p>
                {[
                  { to: '/contact',        label: 'Contact us' },
                  { to: '/faq',            label: 'FAQ' },
                  { to: '/shipping',       label: 'Shipping info' },
                  { to: '/returns-policy', label: 'Returns' },
                  { to: '/privacy',        label: 'Privacy' },
                  { to: '/terms',          label: 'Terms' },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className="py-2 block text-sm text-muted hover:text-accent transition-colors border-b border-border/50"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Search overlay — z-[80] above everything */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="fixed inset-0 z-[80] bg-bg/95 backdrop-blur-md flex items-start justify-center pt-24 px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeSearch}
          >
            <motion.form
              onSubmit={submitSearch}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="w-full max-w-2xl"
            >
              <div className="flex items-center gap-3 border-b-2 border-text pb-3">
                <Search size={22} />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQ(val);
                    setActiveIndex(-1);
                    clearTimeout(debounceRef.current);
                    if (!val.trim()) { setSuggestions([]); return; }
                    debounceRef.current = setTimeout(() => {
                      productService.suggest(val.trim()).then(setSuggestions).catch(() => {});
                    }, 250);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(suggestions.length - 1, i + 1)); }
                    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => Math.max(-1, i - 1)); }
                    if (e.key === 'Enter' && activeIndex >= 0) {
                      e.preventDefault();
                      const hit = suggestions[activeIndex];
                      navigate(`/products/${hit.slug}`);
                      setSearchOpen(false); setQ(''); setSuggestions([]); setActiveIndex(-1);
                    }
                  }}
                  placeholder="Search for hoodies, denim, accessories…"
                  className="flex-1 bg-transparent text-h2 font-display outline-none placeholder:text-muted"
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Close search"
                  className="w-10 h-10 rounded-full hover:bg-border flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>
              {suggestions.length > 0 && (
                <ul className="mt-2 rounded-xl border border-border bg-bg overflow-hidden shadow-lg">
                  {suggestions.map((s, i) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => { navigate(`/products/${s.slug}`); setSearchOpen(false); setQ(''); setSuggestions([]); setActiveIndex(-1); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-surface transition-colors ${i === activeIndex ? 'bg-surface' : ''}`}
                      >
                        {s.images?.[0] && (
                          <img src={s.images[0]} alt="" loading="lazy" className="h-9 w-9 rounded-lg object-cover shrink-0" />
                        )}
                        <span className="font-medium">{s.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-small text-muted mt-3">
                {suggestions.length > 0 ? 'Arrow keys to navigate · Enter to select' : 'Hit Enter to search'}
              </p>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

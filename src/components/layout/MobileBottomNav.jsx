import { NavLink, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Home, Store, Search, ShoppingBag, User } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore.js';
import { cn } from '../../utils/format.js';

const TABS = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/shop', icon: Store, label: 'Shop' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/account', icon: User, label: 'Account' },
];

export default function MobileBottomNav() {
  const location      = useLocation();
  const prefersReduced = useReducedMotion();
  const itemCount     = useCartStore((s) => s.cart.items.reduce((n, it) => n + it.quantity, 0));
  const openDrawer    = useCartStore((s) => s.openDrawer);
  const drawerOpen    = useCartStore((s) => s.drawerOpen);

  if (drawerOpen) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden glass-strong"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-stretch">
        {TABS.map(({ to, icon: Icon, label, exact }) => {
          const isActive = exact
            ? location.pathname === to
            : location.pathname.startsWith(to) && location.pathname !== '/';
          return (
            <motion.div
              key={to}
              whileTap={prefersReduced ? undefined : { scale: 0.88 }}
              className="flex flex-1"
            >
              <NavLink
                to={to}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors',
                  isActive ? 'text-accent' : 'text-muted hover:text-text',
                )}
                aria-label={label}
              >
                <motion.span
                  animate={prefersReduced ? {} : { scale: isActive ? 1.15 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Icon size={20} />
                </motion.span>
                <span>{label}</span>
              </NavLink>
            </motion.div>
          );
        })}

        {/* Cart — opens drawer */}
        <motion.button
          onClick={openDrawer}
          whileTap={prefersReduced ? undefined : { scale: 0.88 }}
          aria-label={`Cart, ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold text-muted hover:text-text transition-colors"
        >
          <span className="relative">
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </span>
          <span>Cart</span>
        </motion.button>
      </div>
    </nav>
  );
}

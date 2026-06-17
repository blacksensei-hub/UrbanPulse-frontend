import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingBag, Users, TicketPercent,
  BarChart3, ScrollText, Settings, Menu, X, LogOut, Store,
  RotateCcw, UserCog, ChevronLeft, ChevronRight, Search, Activity,
} from 'lucide-react';
import { adminService } from '../services/index.js';
import AdminThemeToggle from '../components/admin/AdminThemeToggle.jsx';
import CommandPalette from '../components/admin/CommandPalette.jsx';
import { AdminThemeProvider, useAdminTheme } from '../lib/AdminThemeContext.jsx';
import { AdminMobileBarProvider, useAdminMobileBar } from '../lib/AdminMobileBarContext.jsx';
import { useAuthStore } from '../stores/authStore.js';
import { pageTransition, spring } from '../lib/motion.js';

const PAGE_TITLES = {
  '/admin': 'Today',
  '/admin/dashboard': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/orders': 'Orders',
  '/admin/returns': 'Returns',
  '/admin/users': 'Customers',
  '/admin/coupons': 'Coupons',
  '/admin/analytics': 'Analytics',
  '/admin/logs': 'Logs',
  '/admin/settings': 'Settings',
};

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname === '/admin/dashboard') return 'Dashboard';
  if (pathname.includes('/products/')) return 'Product';
  if (pathname.includes('/returns/')) return 'Return';
  if (pathname.includes('/customers/')) return 'Customer';
  return 'Admin';
}

const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { to: '/admin',           label: 'Today',     icon: LayoutDashboard, end: true },
      { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
      { to: '/admin/orders',    label: 'Orders',    icon: ShoppingBag },
      { to: '/admin/returns',   label: 'Returns',   icon: RotateCcw, badge: true },
      { to: '/admin/coupons',   label: 'Coupons',   icon: TicketPercent },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/admin/products',  label: 'Products',  icon: Package },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/users',     label: 'Customers', icon: Users },
      { to: '#', label: 'Staff', icon: UserCog, disabled: true, soon: true },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/admin/logs',      label: 'Logs',      icon: ScrollText },
      { to: '/admin/activity',  label: 'Activity',  icon: Activity },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/admin/settings',  label: 'Settings',  icon: Settings },
    ],
  },
];

function NavItem({ item, collapsed, onNavigate, pendingReturns }) {
  const { to, label, icon: Icon, end, badge, disabled, soon } = item;

  if (disabled) {
    return (
      <li>
        <div className="relative group">
          <span className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium cursor-not-allowed opacity-40 select-none">
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">{label}</span>
                {soon && (
                  <span className="rounded-full bg-border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted">
                    Soon
                  </span>
                )}
              </>
            )}
          </span>
          {collapsed && (
            <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-text px-2 py-1 text-xs text-bg opacity-0 transition-opacity group-hover:opacity-100 z-50">
              {label} (Coming soon)
            </span>
          )}
        </div>
      </li>
    );
  }

  return (
    <li>
      <div className="relative group">
        <NavLink
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-accent bg-highlight text-text pl-[calc(0.75rem-3px)]'
                : 'border-transparent pl-[calc(0.75rem-3px)] text-muted hover:bg-highlight hover:text-text'
            } ${collapsed ? 'justify-center px-0' : 'pr-3'}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`h-4 w-4 shrink-0 ${collapsed ? '' : ''} ${isActive ? 'text-accent' : ''}`} />
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  {badge && pendingReturns > 0 && (
                    <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-error px-1.5 text-[10px] font-bold text-white">
                      {pendingReturns}
                    </span>
                  )}
                </>
              )}
              {collapsed && badge && pendingReturns > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-error px-1 text-[9px] font-bold text-white">
                  {pendingReturns}
                </span>
              )}
            </>
          )}
        </NavLink>
        {collapsed && (
          <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-text px-2 py-1 text-xs text-bg opacity-0 transition-opacity group-hover:opacity-100 z-50">
            {label}
          </span>
        )}
      </div>
    </li>
  );
}

function SidebarBody({ onNavigate, pendingReturns, collapsed, onToggleCollapse }) {
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-full flex-col relative">
      {/* Collapse toggle — pinned to right edge */}
      <button
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-16 z-10 grid h-6 w-6 place-items-center rounded-full border border-border bg-surface shadow-sm text-muted hover:text-text hover:bg-highlight transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Brand */}
      <div className={`flex items-center border-b border-border px-4 py-4 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-white">
          <Store className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="text-eyebrow text-muted uppercase tracking-widest">Admin</div>
            <div className="truncate text-sm font-semibold font-display">{user?.name ?? 'Admin'}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <div className="px-3 pb-1 text-eyebrow text-muted uppercase tracking-widest opacity-60">
                {group.label}
              </div>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                  pendingReturns={pendingReturns}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-2">
        {/* 2FA warning */}
        {!collapsed && user?.role === 'admin' && !user?.totp_enabled && (
          <div className="rounded-md border border-warning/30 bg-warning/10 p-3">
            <p className="text-xs font-medium text-warning">
              Secure your account with two-factor authentication.
            </p>
            <Link
              to="/account/security"
              onClick={onNavigate}
              className="mt-1.5 inline-block text-xs font-semibold text-accent underline underline-offset-2"
            >
              Enable 2FA →
            </Link>
          </div>
        )}

        {/* User profile */}
        {collapsed ? (
          <div className="flex justify-center py-1">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                {user?.name?.[0]?.toUpperCase() ?? 'A'}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-md bg-highlight px-3 py-2">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                {user?.name?.[0]?.toUpperCase() ?? 'A'}
              </div>
            )}
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium">{user?.name}</div>
              <div className="truncate text-xs text-muted">{user?.email}</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={`flex items-center gap-2 ${collapsed ? 'flex-col' : ''}`}>
          {!collapsed && (
            <Link
              to="/"
              onClick={onNavigate}
              className="flex-1 rounded-md border border-border px-3 py-2 text-center text-xs font-medium text-muted transition-colors hover:bg-highlight hover:text-text"
            >
              View store
            </Link>
          )}
          <AdminThemeToggle />
          <button
            onClick={() => logout()}
            aria-label="Sign out"
            className="grid h-10 w-10 place-items-center rounded-md border border-border text-muted transition-colors hover:bg-highlight hover:text-text"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminLayoutInner({ open, setOpen, collapsed, setCollapsed, pendingReturns, onOpenPalette }) {
  const { adminTheme } = useAdminTheme();
  const { mobileAction } = useAdminMobileBar();
  const location = useLocation();

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('urbanpulse-admin-sidebar-collapsed', String(next)); } catch {}
  }

  return (
    <div className={`admin-theme-${adminTheme} flex min-h-screen bg-bg text-text`}>
      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 glass-strong border-r border-border lg:block transition-all duration-300 ease-out overflow-hidden ${
          collapsed ? 'w-[64px]' : 'w-[260px] 4xl:w-[300px]'
        }`}
      >
        <SidebarBody
          pendingReturns={pendingReturns}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={spring}
              className="fixed inset-y-0 left-0 z-50 w-[280px] glass-strong border-r border-border lg:hidden overflow-hidden"
            >
              <SidebarBody
                onNavigate={() => setOpen(false)}
                pendingReturns={pendingReturns}
                collapsed={false}
                onToggleCollapse={() => {}}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <header className="sticky top-0 z-30 flex items-center glass-strong border-b border-border px-4 py-3 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border hover:bg-highlight transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="flex-1 px-3 text-center font-display text-base font-semibold truncate">
            {getPageTitle(location.pathname)}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onOpenPalette}
              aria-label="Open command palette"
              className="grid h-10 w-10 place-items-center rounded-md border border-border hover:bg-highlight transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
            {mobileAction}
          </div>
        </header>

        <motion.main
          key={location.pathname}
          variants={pageTransition}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex-1 p-4 sm:p-6 lg:p-8 4xl:p-10"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('urbanpulse-admin-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [pendingReturns, setPendingReturns] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    adminService.returns({ status: 'requested' })
      .then((rows) => setPendingReturns(rows.length))
      .catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <AdminThemeProvider>
      <AdminMobileBarProvider>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <AdminLayoutInner
          open={open}
          setOpen={setOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          pendingReturns={pendingReturns}
          onOpenPalette={() => setPaletteOpen(true)}
        />
      </AdminMobileBarProvider>
    </AdminThemeProvider>
  );
}

import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAdminMobileBar } from '../../lib/AdminMobileBarContext.jsx';

const LABEL_MAP = {
  admin: 'Admin',
  products: 'Products',
  orders: 'Orders',
  returns: 'Returns',
  users: 'Customers',
  customers: 'Customers',
  dashboard: 'Dashboard',
  coupons: 'Coupons',
  analytics: 'Analytics',
  loyalty: 'Loyalty',
  logs: 'Logs',
  activity: 'Activity',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
};

function buildBreadcrumbs(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (/^\d+$/.test(seg)) continue;
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = LABEL_MAP[seg] ?? (seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '));
    crumbs.push({ label, href });
  }
  return crumbs;
}

export default function AdminPageHeader({ title, subtitle, actions, breadcrumbs }) {
  const location = useLocation();
  const crumbs = breadcrumbs ?? buildBreadcrumbs(location.pathname);
  const { setMobileAction } = useAdminMobileBar();

  // Register the page's primary action in the mobile topbar on mount
  useEffect(() => {
    setMobileAction(actions ?? null);
    return () => setMobileAction(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="border-b border-border pb-6 mb-6">
      {crumbs.length > 1 && (
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-eyebrow text-muted select-none">/</span>}
              {crumb.href && i < crumbs.length - 1 ? (
                <Link
                  to={crumb.href}
                  className="text-eyebrow text-muted hover:text-text transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-eyebrow text-muted">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-h1 font-bold leading-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && (
          <div className="hidden md:flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

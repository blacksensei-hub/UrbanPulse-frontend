import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import Harmattan from '../components/ui/Harmattan.jsx';
import TopHud from '../components/layout/TopHud.jsx';
import Footer from '../components/layout/Footer.jsx';
import CartDrawer from '../components/cart/CartDrawer.jsx';
import MobileBottomNav from '../components/layout/MobileBottomNav.jsx';
import ScrollProgress from '../components/layout/ScrollProgress.jsx';
import BackToTop from '../components/layout/BackToTop.jsx';
import PageTransition from '../components/layout/PageTransition.jsx';
import { useSettingsStore } from '../stores/settingsStore.js';

// Scroll-progress only makes sense on long-form reading pages · everywhere else
// (auth, checkout, cart, account, home, search, admin, 404) it stays hidden.
const SCROLL_PROGRESS_STATIC_PATHS = new Set(['/about', '/privacy', '/terms', '/returns-policy', '/shipping']);
function showsScrollProgress(pathname) {
  if (SCROLL_PROGRESS_STATIC_PATHS.has(pathname)) return true;
  if (pathname === '/shop') return true;
  if (pathname.startsWith('/products/')) return true;
  if (pathname === '/lookbook' || pathname.startsWith('/lookbook/')) return true;
  return false;
}

export default function MainLayout() {
  const location = useLocation();
  const settings = useSettingsStore(s => s.settings);
  const inMaintenance = settings.maintenance_mode === 'true';
  const maintenanceMsg = settings.maintenance_message || "We're undergoing scheduled maintenance. Some features may be temporarily unavailable.";

  return (
    <div className="relative flex min-h-screen flex-col bg-bg text-text">
      <Harmattan />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--color-on-accent)]"
      >
        Skip to content
      </a>
      {showsScrollProgress(location.pathname) && <ScrollProgress />}
      {/* Content sits above the Harmattan layer. */}
      {inMaintenance && (
        <div className="sticky top-0 z-[150] border-b-2 border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm text-warning">
          <span className="font-medium">Maintenance:</span> {maintenanceMsg}
        </div>
      )}
      <TopHud />
      <Navbar />
      <div aria-hidden className="h-[calc(5rem+var(--hud-h))] sm:h-[calc(6rem+var(--hud-h))]" />
      <PageTransition id="main-content" className="above-harmattan flex-1">
        <Outlet />
      </PageTransition>
      <div className="above-harmattan"><Footer /></div>
      <CartDrawer />
      <MobileBottomNav />
      <BackToTop />
    </div>
  );
}

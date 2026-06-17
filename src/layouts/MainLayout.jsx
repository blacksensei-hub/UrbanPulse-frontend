import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar.jsx';
import Footer from '../components/layout/Footer.jsx';
import CartDrawer from '../components/cart/CartDrawer.jsx';
import MobileBottomNav from '../components/layout/MobileBottomNav.jsx';
import ScrollProgress from '../components/layout/ScrollProgress.jsx';
import BackToTop from '../components/layout/BackToTop.jsx';
import { pageTransition } from '../lib/motion.js';
import { useSettingsStore } from '../stores/settingsStore.js';
import { useLoadingStore } from '../stores/loadingStore.js';

const AUTH_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset-password']);

export default function MainLayout() {
  const location = useLocation();
  const settings = useSettingsStore(s => s.settings);
  const doneLoading = useLoadingStore(s => s.done);
  const loadingActive = useLoadingStore(s => s.active);
  const inMaintenance = settings.maintenance_mode === 'true';
  const maintenanceMsg = settings.maintenance_message || "We're undergoing scheduled maintenance. Some features may be temporarily unavailable.";
  const isAuthPage = AUTH_PATHS.has(location.pathname);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      {!loadingActive && !isAuthPage && <ScrollProgress />}
      {inMaintenance && (
        <div className="sticky top-0 z-[150] border-b-2 border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm text-warning">
          <span className="font-medium">Maintenance:</span> {maintenanceMsg}
        </div>
      )}
      <Navbar />
      <div aria-hidden className="h-20 sm:h-24" />
      <motion.main
        key={location.pathname}
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        onAnimationComplete={doneLoading}
        className="flex-1"
      >
        <Outlet />
      </motion.main>
      <Footer />
      <CartDrawer />
      <MobileBottomNav />
      <BackToTop />
    </div>
  );
}

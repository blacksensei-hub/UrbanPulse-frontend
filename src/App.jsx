import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import ViewAsBanner from './components/ViewAsBanner.jsx';
import LoadingBar from './components/layout/LoadingBar.jsx';
import CookieConsent from './components/CookieConsent.jsx';
import { AnimatePresence } from 'framer-motion';

import MainLayout from './layouts/MainLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';

import { useAuthStore } from './stores/authStore.js';
import { useCartStore } from './stores/cartStore.js';
import { useWishlistStore } from './stores/wishlistStore.js';
import { useSettingsStore } from './stores/settingsStore.js';
import { useLoadingStore } from './stores/loadingStore.js';
import { storeRefCode } from './utils/referral.js';

const Home           = lazy(() => import('./pages/Home.jsx'));
const Shop           = lazy(() => import('./pages/Shop.jsx'));
const ProductDetail  = lazy(() => import('./pages/ProductDetail.jsx'));
const Cart           = lazy(() => import('./pages/Cart.jsx'));
const Checkout       = lazy(() => import('./pages/Checkout.jsx'));
const OrderSuccess   = lazy(() => import('./pages/OrderSuccess.jsx'));
const SearchResults  = lazy(() => import('./pages/SearchResults.jsx'));
const Account        = lazy(() => import('./pages/Account.jsx'));
const FAQ            = lazy(() => import('./pages/FAQ.jsx'));
const Login          = lazy(() => import('./pages/Login.jsx'));
const Register       = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword  = lazy(() => import('./pages/ResetPassword.jsx'));
const NotFound       = lazy(() => import('./pages/NotFound.jsx'));
const Lookbook       = lazy(() => import('./pages/Lookbook.jsx'));
const LookbookDetail = lazy(() => import('./pages/Lookbook.jsx').then((m) => ({ default: m.LookbookDetail })));
const About          = lazy(() => import('./pages/About.jsx'));
const PrivacyPolicy  = lazy(() => import('./pages/legal/PrivacyPolicy.jsx'));
const Terms          = lazy(() => import('./pages/legal/Terms.jsx'));
const ReturnsPolicy  = lazy(() => import('./pages/legal/ReturnsPolicy.jsx'));
const ShippingInfo   = lazy(() => import('./pages/legal/ShippingInfo.jsx'));
const Contact        = lazy(() => import('./pages/legal/Contact.jsx'));

const AdminToday       = lazy(() => import('./pages/admin/AdminToday.jsx'));
const AdminDashboard   = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminProducts    = lazy(() => import('./pages/admin/AdminProducts.jsx'));
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm.jsx'));
const AdminOrders      = lazy(() => import('./pages/admin/AdminOrders.jsx'));
const AdminUsers       = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminCoupons     = lazy(() => import('./pages/admin/AdminCoupons.jsx'));
const AdminAnalytics   = lazy(() => import('./pages/admin/AdminAnalytics.jsx'));
const AdminLoyalty     = lazy(() => import('./pages/admin/AdminLoyalty.jsx'));
const AdminLogs        = lazy(() => import('./pages/admin/AdminLogs.jsx'));
const AdminSettings    = lazy(() => import('./pages/admin/AdminSettings.jsx'));
const AdminReturns        = lazy(() => import('./pages/admin/AdminReturns.jsx'));
const AdminCustomerDetail = lazy(() => import('./pages/admin/AdminCustomerDetail.jsx'));
const AdminActivity       = lazy(() => import('./pages/admin/AdminActivity.jsx'));
const AdminOrderDetail    = lazy(() => import('./pages/admin/AdminOrderDetail.jsx'));
const AdminTemplates      = lazy(() => import('./pages/admin/AdminTemplates.jsx'));

function PageSkeleton() {
  return (
    <div className="container-site space-y-4 py-10">
      <div className="skeleton h-8 w-1/3 rounded" />
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="skeleton h-64 w-full rounded" />
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuthStore();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const location = useLocation();
  const initAuth = useAuthStore((s) => s.init);
  const refreshCart = useCartStore((s) => s.refresh);
  const refreshWishlist = useWishlistStore((s) => s.refresh);
  const loadSettings = useSettingsStore((s) => s.load);
  const startLoading = useLoadingStore((s) => s.start);

  useEffect(() => {
    initAuth();
    refreshCart();
    refreshWishlist();
    loadSettings();
    // Capture referral code from URL on any page load and persist for 30 days
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) storeRefCode(ref);
  }, [initAuth, refreshCart, refreshWishlist, loadSettings]);

  useEffect(() => {
    startLoading();
  }, [location.pathname, startLoading]);

  return (
    <>
    <LoadingBar />
    <ViewAsBanner />
    <CookieConsent />
    <Suspense fallback={<PageSkeleton />}>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          {/* Customer */}
          <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="products/:slug" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order-success" element={<OrderSuccess />} />
            <Route path="search" element={<SearchResults />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="about"          element={<About />} />
            <Route path="privacy"        element={<PrivacyPolicy />} />
            <Route path="terms"          element={<Terms />} />
            <Route path="returns-policy" element={<ReturnsPolicy />} />
            <Route path="shipping"       element={<ShippingInfo />} />
            <Route path="contact"        element={<Contact />} />
            <Route path="lookbook" element={<Lookbook />} />
            <Route path="lookbook/:slug" element={<LookbookDetail />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="account/*" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Admin */}
          <Route
            path="admin"
            element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}
          >
            <Route index element={<AdminToday />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="returns" element={<AdminReturns />} />
            <Route path="returns/:id" element={<AdminReturns />} />
            <Route path="customers/:id" element={<AdminCustomerDetail />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="loyalty" element={<AdminLoyalty />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="settings/templates" element={<AdminTemplates />} />
            <Route path="activity" element={<AdminActivity />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </Suspense>
    </>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  User, Package, MapPin, LogOut, ShieldCheck, ChevronDown, Heart,
  Gift, Copy, Check, RotateCcw, X, Lock, Smartphone, AlertTriangle,
  Download, Loader2, KeyRound, Award, Fingerprint,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import { Button, Input } from '../components/ui/index.jsx';
import Modal from '../components/ui/Modal.jsx';
import GoogleSignInButton from '../components/auth/GoogleSignInButton.jsx';
import { useAuthStore } from '../stores/authStore.js';
import { useCartStore } from '../stores/cartStore.js';
import { useWishlistStore } from '../stores/wishlistStore.js';
import { orderService, authService, referralService, returnService, loyaltyService } from '../services/index.js';
import { useFeature } from '../stores/settingsStore.js';
import { formatCurrency, formatDate, pluralize, sanitizePhone } from '../utils/format.js';
import { cn } from '../utils/format.js';
import { showUndoToast } from '../utils/undoToast.jsx';
import { clearSessionHint } from '../utils/sessionHint.js';
import { staggerContainer, fadeInUp } from '../lib/motion.js';
import { usePullToRefresh } from '../hooks/usePullToRefresh.js';
import PullToRefreshIndicator from '../components/ui/PullToRefreshIndicator.jsx';

const REASON_OPTIONS = [
  { value: 'damaged',          label: 'Damaged or defective' },
  { value: 'wrong_item',       label: 'Wrong item received' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'change_of_mind',   label: 'Change of mind' },
  { value: 'quality_issue',    label: 'Quality issue' },
];

const STATUS_COLORS = {
  requested: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  approved:  'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  rejected:  'bg-red-500/15 text-red-600 dark:text-red-400',
  received:  'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  refunded:  'bg-green-500/15 text-green-700 dark:text-green-400',
};

const TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
const TIER_COLORS = {
  bronze:   'bg-amber-700/15 text-amber-800 dark:text-amber-500',
  silver:   'bg-slate-400/20 text-slate-600 dark:text-slate-300',
  gold:     'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  platinum: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
};
// TODO: real tier benefits beyond points still need to be designed — these are aspirational copy for now.
const TIER_BENEFITS = {
  bronze:   'Earn points on every order, right from your first purchase.',
  silver:   'Everything in Bronze, plus priority customer support.',
  gold:     'Everything in Silver, plus early access to new drops.',
  platinum: 'Everything in Gold, plus first pick on limited releases.',
};

function isEligibleForReturn(order) {
  if (order.payment_status !== 'paid' || order.status !== 'delivered') return false;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return new Date(order.updated_at) >= cutoff;
}

// ─── Return request modal ────────────────────────────────────────────────────

function ReturnRequestModal({ orderId, onClose }) {
  const [orderDetail, setOrderDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState({}); // { order_item_id: { checked, quantity, reason_code } }
  const [resolution, setResolution] = useState('refund');
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rma, setRma] = useState(null);

  useEffect(() => {
    orderService.get(orderId).then((o) => {
      setOrderDetail(o);
      const init = {};
      (o.items ?? []).forEach((item) => {
        init[item.id] = { checked: false, quantity: 1, reason_code: 'damaged' };
      });
      setSelections(init);
      setLoading(false);
    }).catch(() => { toast.error('Could not load order'); onClose(); });
  }, [orderId]);

  function toggleItem(id) {
    setSelections((s) => ({ ...s, [id]: { ...s[id], checked: !s[id].checked } }));
  }

  function setQty(id, qty, max) {
    setSelections((s) => ({ ...s, [id]: { ...s[id], quantity: Math.min(Math.max(1, qty), max) } }));
  }

  function setReason(id, reason_code) {
    setSelections((s) => ({ ...s, [id]: { ...s[id], reason_code } }));
  }

  async function submit() {
    const items = (orderDetail.items ?? [])
      .filter((item) => selections[item.id]?.checked)
      .map((item) => ({
        order_item_id: item.id,
        quantity: selections[item.id].quantity,
        reason_code: selections[item.id].reason_code,
      }));

    if (items.length === 0) return toast.error('Select at least one item to return');
    setSubmitting(true);
    try {
      const result = await returnService.create({
        order_id: orderId,
        items,
        resolution,
        customer_note: customerNote || undefined,
      });
      setRma(result.rma_number);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not submit return request');
    } finally {
      setSubmitting(false);
    }
  }

  if (rma) {
    return (
      <Modal open onClose={onClose} title="Return requested">
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <Check className="h-7 w-7 text-success" />
          </div>
          <p className="font-medium text-lg">Return request submitted</p>
          <p className="mt-1 text-sm text-muted">Your RMA number is</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-accent">{rma}</p>
          <p className="mt-3 text-xs text-muted">
            We'll review your request and be in touch within 1–2 business days.
          </p>
          <Button className="mt-6 w-full" onClick={onClose}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Request a return" maxWidth="560px">
      {loading ? (
        <p className="py-6 text-center text-sm text-muted">Loading…</p>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            Select the items you'd like to return and choose a resolution. Returns must be
            requested within 30 days of delivery.
          </p>

          <div className="space-y-3">
            {(orderDetail?.items ?? []).map((item) => {
              const sel = selections[item.id] ?? {};
              return (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-lg border p-4 transition-colors',
                    sel.checked ? 'border-accent bg-accent/5' : 'border-border',
                  )}
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={!!sel.checked}
                      onChange={() => toggleItem(item.id)}
                      className="mt-0.5 accent-accent"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.product_name}</div>
                      <div className="text-xs text-muted">{item.variant_description}</div>
                    </div>
                    <div className="text-sm font-semibold shrink-0">
                      {formatCurrency(item.unit_price)}
                    </div>
                  </label>

                  {sel.checked && (
                    <div className="mt-3 grid grid-cols-2 gap-3 pl-7">
                      <div>
                        <label className="text-xs text-muted">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          max={item.quantity}
                          value={sel.quantity}
                          onChange={(e) => setQty(item.id, Number(e.target.value), item.quantity)}
                          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted">Reason</label>
                        <select
                          value={sel.reason_code}
                          onChange={(e) => setReason(item.id, e.target.value)}
                          className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-sm"
                        >
                          {REASON_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Resolution</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'refund', label: 'Refund' },
                { value: 'store_credit', label: 'Store credit' },
                { value: 'exchange', label: 'Exchange' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex cursor-pointer items-center justify-center rounded-lg border p-3 text-sm font-medium transition-colors',
                    resolution === opt.value ? 'border-accent bg-accent/5 text-accent' : 'border-border hover:border-text',
                  )}
                >
                  <input
                    type="radio"
                    name="resolution"
                    value={opt.value}
                    checked={resolution === opt.value}
                    onChange={() => setResolution(opt.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Additional notes (optional)</label>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              rows={3}
              placeholder="Any details that may help us process your return…"
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm resize-none focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} loading={submitting}>Submit request</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Account layout ──────────────────────────────────────────────────────────

function AccountLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const loyaltyEnabled = useFeature('loyalty');

  const NAV = [
    { to: '', label: 'Dashboard', icon: User, end: true },
    { to: 'orders', label: 'Orders', icon: Package },
    { to: 'wishlist', label: 'Wishlist', icon: Heart },
    { to: 'referrals', label: 'Referrals', icon: Gift },
    ...(loyaltyEnabled ? [{ to: 'rewards', label: 'Rewards', icon: Award }] : []),
    { to: 'returns', label: 'Returns', icon: RotateCcw },
    { to: 'security', label: 'Security', icon: Lock },
    { to: 'profile', label: 'Profile', icon: ShieldCheck },
    { to: 'addresses', label: 'Addresses', icon: MapPin },
    { to: 'privacy', label: 'Privacy', icon: Fingerprint },
  ];

  return (
    <div className="container-site py-8 md:py-12">
      <div className="mb-8 flex items-center gap-4">
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name ?? ''}
            className="h-14 w-14 rounded-full object-cover shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : user ? (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xl font-semibold text-accent">
            {user.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="eyebrow mb-1">Your account</p>
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="truncate max-w-full font-display text-h1 font-bold">
              {user?.name ? `Hey, ${user.name.split(' ')[0]}.` : 'Account'}
            </h1>
            {loyaltyEnabled && user?.loyalty_tier && (
              <span className="group relative inline-flex">
                <span
                  className={cn(
                    'cursor-default rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    TIER_COLORS[user.loyalty_tier] ?? TIER_COLORS.bronze,
                  )}
                >
                  {TIER_LABELS[user.loyalty_tier] ?? user.loyalty_tier}
                </span>
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-surface p-3 text-xs text-text opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {TIER_BENEFITS[user.loyalty_tier] ?? 'You earn rewards on every order.'}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-border bg-surface p-3">
          <nav className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={label}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-accent text-white' : 'text-text/80 hover:bg-bg',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="mt-2 flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm font-medium"
              >
                <ShieldCheck className="h-4 w-4" /> Admin console
              </Link>
            )}
            <button
              onClick={async () => { await logout(); navigate('/'); }}
              className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-bg hover:text-error"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </nav>
        </aside>

        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard() {
  const { user } = useAuthStore();
  const loyaltyEnabled = useFeature('loyalty');
  const [orders, setOrders] = useState([]);
  const [ledger, setLedger] = useState([]);

  useEffect(() => {
    orderService.mine().then((d) => setOrders(d.slice(0, 5))).catch(() => {});
    referralService.ledger().then(setLedger).catch(() => {});
  }, []);

  const credit = Number(user?.store_credit_ghs ?? 0);

  return (
    <div className="space-y-6">
      <div className={cn('grid gap-4 sm:grid-cols-2', loyaltyEnabled ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
        <div className="card p-5">
          <p className="eyebrow">Orders</p>
          <div className="mt-2 font-display text-2xl font-bold">{orders.length}</div>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Recent spend</p>
          <div className="mt-2 font-mono text-2xl font-bold">
            {formatCurrency(orders.reduce((s, o) => s + Number(o.total), 0))}
          </div>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Store credit</p>
          <div className={`mt-2 font-mono text-2xl font-bold ${credit > 0 ? 'text-success' : ''}`}>
            {formatCurrency(credit)}
          </div>
        </div>
        {loyaltyEnabled && (
          <Link to="rewards" className="card p-5 transition-colors hover:border-accent">
            <p className="eyebrow">Loyalty points</p>
            <div className="mt-2 font-mono text-2xl font-bold">{user?.loyalty_points ?? 0}</div>
          </Link>
        )}
        <div className="card p-5">
          <p className="eyebrow">Status</p>
          <div className="mt-2 font-display text-2xl font-bold">Active</div>
        </div>
      </div>

      {/* Quick-link cards to sub-pages */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { to: 'orders',   icon: Package,   label: 'My orders' },
          { to: 'wishlist', icon: Heart,     label: 'Wishlist' },
          { to: 'returns',  icon: RotateCcw, label: 'Returns' },
          { to: 'profile',  icon: User,      label: 'Profile' },
        ].map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="card p-4 flex items-center gap-3 hover:border-accent transition-colors group"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent/10 text-accent">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium group-hover:text-accent transition-colors">{label}</span>
          </Link>
        ))}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent orders</h2>
          <Link to="orders" className="text-sm text-accent">View all</Link>
        </div>
        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No orders yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-semibold">{o.order_number}</div>
                  <div className="text-xs text-muted">{formatDate(o.created_at)}</div>
                </div>
                <div className="font-display font-bold">{formatCurrency(o.total)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {ledger.length > 0 && (
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Credit activity</h2>
          <ul className="mt-4 divide-y divide-border">
            {ledger.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">{entry.reason}</div>
                  <div className="text-xs text-muted">{formatDate(entry.created_at)}</div>
                </div>
                <div className={`font-display font-bold ${entry.amount_ghs >= 0 ? 'text-success' : 'text-error'}`}>
                  {entry.amount_ghs >= 0 ? '+' : ''}{formatCurrency(Math.abs(entry.amount_ghs))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── DownloadReceiptButton ────────────────────────────────────────────────────

function DownloadReceiptButton({ orderId, orderNumber }) {
  const [downloading, setDownloading] = useState(false);
  async function download() {
    setDownloading(true);
    try { await orderService.downloadReceipt(orderId, orderNumber); }
    catch { toast.error('Could not download receipt. Please try again.'); }
    finally { setDownloading(false); }
  }
  return (
    <button
      type="button"
      onClick={download}
      disabled={downloading}
      className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {downloading
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Download className="h-3.5 w-3.5" />}
      {downloading ? 'Downloading…' : 'Download receipt (PDF)'}
    </button>
  );
}

// ─── Orders ──────────────────────────────────────────────────────────────────

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [histories, setHistories] = useState({});
  const [orderDetails, setOrderDetails] = useState({});
  const [returningOrderId, setReturningOrderId] = useState(null);
  const prefersReduced = useReducedMotion();

  const load = useCallback(() => {
    setLoading(true);
    return orderService.mine().then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const { pulling, pullProgress, refreshing } = usePullToRefresh(
    () => setRefreshKey((k) => k + 1),
  );

  const ptrIndicator = (
    <PullToRefreshIndicator pulling={pulling} pullProgress={pullProgress} refreshing={refreshing} />
  );

  function toggle(id) {
    setExpanded((prev) => (prev === id ? null : id));
    if (!histories[id]) {
      orderService.history(id).then((rows) => setHistories((h) => ({ ...h, [id]: rows }))).catch(() => {});
    }
    if (!orderDetails[id]) {
      orderService.get(id).then((order) => setOrderDetails((d) => ({ ...d, [id]: order }))).catch(() => {});
    }
  }

  if (loading) return <>{ptrIndicator}<div className="text-sm text-muted">Loading…</div></>;
  if (orders.length === 0)
    return (
      <>
        {ptrIndicator}
        <div className="card p-10 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <Package className="h-7 w-7 text-accent" />
          </div>
          <p className="mt-4 font-display text-lg font-semibold">No orders yet</p>
          <p className="mt-1 text-sm text-muted">When you place your first order, it&apos;ll show up here.</p>
          <Link to="/shop" className="mt-5"><Button>Start shopping</Button></Link>
        </div>
      </>
    );

  return (
    <>
      {ptrIndicator}
      <ul className="space-y-3">
        {orders.map((o) => (
          <motion.li key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display text-base font-semibold">{o.order_number}</div>
                <div className="text-xs text-muted">{formatDate(o.created_at)}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase text-accent">
                  {o.status}
                </span>
                {o.payment_method === 'cod' && (
                  <span className="rounded-full bg-border px-3 py-1 text-xs font-semibold text-text">Cash on delivery</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="font-display text-base font-bold">{formatCurrency(o.total)}</div>
                {isEligibleForReturn(o) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); setReturningOrderId(o.id); }}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Return
                  </Button>
                )}
                <button
                  onClick={() => toggle(o.id)}
                  aria-label="Toggle order timeline"
                  className="rounded-full p-1 transition-colors hover:bg-border"
                >
                  <motion.span
                    animate={{ rotate: expanded === o.id ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="block"
                  >
                    <ChevronDown size={16} />
                  </motion.span>
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expanded === o.id && (
                <motion.div
                  key="timeline"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 border-t border-border pt-4">
                    {!histories[o.id] ? (
                      <p className="text-xs text-muted">Loading…</p>
                    ) : histories[o.id].length === 0 ? (
                      <p className="text-xs text-muted">No history yet.</p>
                    ) : (
                      <motion.ol variants={staggerContainer} initial="initial" animate="animate" className="space-y-0">
                        {histories[o.id].map((h, i) => {
                          const isDelivered = o.status === 'delivered' && h.status === 'delivered';
                          return (
                          <motion.li key={h.id} variants={fadeInUp} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              {isDelivered ? (
                                <motion.div
                                  className="relative mt-0.5 h-4 w-4 shrink-0 rounded-full bg-accent flex items-center justify-center"
                                  animate={prefersReduced ? {} : { scale: [0.8, 1.2, 1] }}
                                  transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                                >
                                  {!prefersReduced && (
                                    <motion.span
                                      className="absolute inset-0 rounded-full bg-accent"
                                      initial={{ scale: 1, opacity: 0.6 }}
                                      animate={{ scale: 2.2, opacity: 0 }}
                                      transition={{ duration: 0.7, delay: 0.3 }}
                                    />
                                  )}
                                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                                    <motion.path
                                      d="M1 4L3 6L7 2"
                                      stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                                      initial={{ pathLength: prefersReduced ? 1 : 0 }}
                                      animate={{ pathLength: 1 }}
                                      transition={prefersReduced ? {} : { duration: 0.4, delay: 0.5, ease: 'easeOut' }}
                                    />
                                  </svg>
                                </motion.div>
                              ) : (
                                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                              )}
                              {i < histories[o.id].length - 1 && <span className="my-1 w-px flex-1 bg-border" />}
                            </div>
                            <div className="pb-3">
                              <div className="text-xs font-semibold capitalize">{h.status}</div>
                              {h.note && <div className="text-xs text-muted">{h.note}</div>}
                              <div className="text-xs text-muted">{formatDate(h.created_at)}</div>
                            </div>
                          </motion.li>
                          );
                        })}
                      </motion.ol>
                    )}
                  {/* Preorder items summary */}
                  {orderDetails[o.id]?.items?.filter(i => i.is_preorder).length > 0 && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wider">Pre-order items</p>
                      <ul className="space-y-1">
                        {orderDetails[o.id].items.filter(i => i.is_preorder).map(item => (
                          <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="min-w-0 truncate text-text" title={item.product_name}>
                              {item.product_name} × {item.quantity}
                            </span>
                            {item.preorder_ships_at && (
                              <span className="shrink-0 text-accent">Ships {formatDate(item.preorder_ships_at)}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Receipt download — only for paid / COD-delivered orders */}
                  {(() => {
                    const isPaid  = o.payment_status === 'paid';
                    const isCOD   = o.payment_method === 'cod';
                    const codDone = isCOD && ['delivered', 'paid'].includes(o.status);
                    if (!isPaid && !codDone) return null;
                    return (
                      <div className="mt-3 border-t border-border pt-3">
                        <DownloadReceiptButton orderId={o.id} orderNumber={o.order_number} />
                      </div>
                    );
                  })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        ))}
      </ul>

      {returningOrderId && (
        <ReturnRequestModal orderId={returningOrderId} onClose={() => setReturningOrderId(null)} />
      )}
    </>
  );
}

// ─── Returns ─────────────────────────────────────────────────────────────────

function ReturnsList() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    return returnService.mine().then(setReturns).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const { pulling, pullProgress, refreshing } = usePullToRefresh(
    () => setRefreshKey((k) => k + 1),
  );
  const ptrIndicator = (
    <PullToRefreshIndicator pulling={pulling} pullProgress={pullProgress} refreshing={refreshing} />
  );

  if (loading) return <>{ptrIndicator}<div className="text-sm text-muted">Loading…</div></>;

  if (returns.length === 0)
    return (
      <>
        {ptrIndicator}
        <div className="card p-10 text-center">
          <RotateCcw className="mx-auto h-10 w-10 text-muted" />
          <h2 className="mt-4 font-display text-lg font-semibold">No returns yet</h2>
          <p className="mt-2 text-sm text-muted">
            Returns you request will appear here. Items can be returned within 30 days of delivery.
          </p>
        </div>
      </>
    );

  return (
    <>
      {ptrIndicator}
    <ul className="space-y-3">
      {returns.map((r) => (
        <motion.li key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <Link to={`/account/returns/${r.id}`} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono font-semibold text-sm">{r.rma_number}</div>
              <div className="text-xs text-muted mt-0.5">{r.item_count} {pluralize(r.item_count, 'item')} · {r.resolution} · {formatDate(r.created_at)}</div>
            </div>
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold capitalize', STATUS_COLORS[r.status])}>
              {r.status}
            </span>
          </Link>
        </motion.li>
      ))}
    </ul>
    </>
  );
}

function ReturnDetail() {
  const { id } = useParams();
  const [ret, setRet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    returnService.get(id).then(setRet).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-sm text-muted">Loading…</div>;
  if (!ret) return <div className="text-sm text-muted">Return not found.</div>;

  const TIMELINE = [
    { key: 'requested', label: 'Return requested', date: ret.created_at },
    { key: 'approved',  label: 'Approved',          date: ret.approved_at },
    { key: 'received',  label: 'Items received',     date: ret.received_at },
    ret.status === 'rejected'
      ? { key: 'rejected', label: 'Rejected',       date: ret.rejected_at }
      : { key: 'refunded', label: ret.resolution === 'store_credit' ? 'Credit issued' : 'Refund issued', date: ret.refunded_at },
  ];

  const statusOrder = ['requested', 'approved', 'received', 'refunded'];
  const currentIdx = ret.status === 'rejected' ? 1 : statusOrder.indexOf(ret.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/account/returns" className="text-sm text-muted hover:text-text">← Returns</Link>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-xl font-bold tracking-wider">{ret.rma_number}</div>
            <div className="mt-1 text-xs text-muted">
              {ret.resolution} · requested {formatDate(ret.created_at)}
            </div>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-xs font-semibold capitalize', STATUS_COLORS[ret.status])}>
            {ret.status}
          </span>
        </div>

        {/* Timeline */}
        <div className="mt-6 flex gap-0">
          {TIMELINE.map((step, i) => {
            const done = ret.status === 'rejected'
              ? (i === 0 || (i === 3 && ret.status === 'rejected'))
              : i <= currentIdx;
            return (
              <div key={step.key} className="flex-1">
                <div className="flex items-center">
                  <div className={cn(
                    'h-2.5 w-2.5 rounded-full shrink-0',
                    done ? 'bg-accent' : 'bg-border'
                  )} />
                  {i < TIMELINE.length - 1 && (
                    <div className={cn('h-px flex-1', i < currentIdx && ret.status !== 'rejected' ? 'bg-accent' : 'bg-border')} />
                  )}
                </div>
                <div className="mt-2 pr-2">
                  <div className="text-xs font-medium">{step.label}</div>
                  {step.date && <div className="text-xs text-muted">{formatDate(step.date)}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Items */}
      <div className="card p-6">
        <h3 className="font-display text-base font-semibold mb-4">Items being returned</h3>
        <div className="divide-y divide-border">
          {(ret.items ?? []).map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-3">
              {item.product_image && (
                <img src={item.product_image} alt="" className="h-12 w-10 rounded object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate" title={item.product_name}>{item.product_name}</div>
                <div className="text-xs text-muted">{item.variant_description} · qty {item.quantity}</div>
                {item.reason_code && (
                  <div className="text-xs text-muted capitalize">Reason: {item.reason_code.replace(/_/g, ' ')}</div>
                )}
              </div>
              <div className="text-sm font-semibold">{formatCurrency(item.unit_price)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {(ret.customer_note || ret.admin_note || ret.refund_amount_ghs) && (
        <div className="card p-6 space-y-3">
          {ret.customer_note && (
            <div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wider">Your note</div>
              <p className="mt-1 text-sm">{ret.customer_note}</p>
            </div>
          )}
          {ret.admin_note && (
            <div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wider">From our team</div>
              <p className="mt-1 text-sm">{ret.admin_note}</p>
            </div>
          )}
          {ret.refund_amount_ghs && (
            <div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wider">
                {ret.resolution === 'store_credit' ? 'Credit issued' : 'Refund issued'}
              </div>
              <p className="mt-1 text-sm font-semibold text-success">
                {formatCurrency(ret.refund_amount_ghs)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Referrals ───────────────────────────────────────────────────────────────

function Referrals() {
  const referralsEnabled = useFeature('referrals');
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (referralsEnabled) referralService.me().then(setData).catch(() => {});
  }, [referralsEnabled]);

  if (!referralsEnabled) {
    return (
      <div className="card p-10 text-center text-sm text-muted">
        The referral program is currently paused.
      </div>
    );
  }

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(data.share_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    if (!data) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(data.share_text)}`, '_blank');
  }

  const STATUS_LABEL = {
    pending:   'signed up',
    qualified: 'completed first order',
    rewarded:  `earned ${formatCurrency(50)}`,
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold">Your referral code</h2>
        <p className="mt-1 text-sm text-muted">
          Share your link — when a friend signs up and completes their first order, you both get {formatCurrency(50)} in store credit.
        </p>

        {data ? (
          <>
            <div className="mt-5 flex items-center gap-3 rounded-lg border border-border bg-bg px-4 py-3">
              <span className="flex-1 font-mono text-xl font-bold tracking-widest text-accent">{data.code}</span>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            <div className="mt-4">
              <Button onClick={shareWhatsApp} variant="outline" size="sm">Share on WhatsApp</Button>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                { label: 'Signed up', value: data.stats.signed_up },
                { label: 'Qualified', value: data.stats.qualified },
                { label: 'Earned', value: formatCurrency(data.stats.earned_ghs) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-border p-4 text-center">
                  <div className="font-display text-2xl font-bold">{value}</div>
                  <div className="mt-1 text-xs text-muted">{label}</div>
                </div>
              ))}
            </div>
            {data.referrals.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Recent referrals</h3>
                <ul className="divide-y divide-border">
                  {data.referrals.map((r, i) => (
                    <li key={i} className="flex items-center justify-between py-3 text-sm">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted">{STATUS_LABEL[r.status] ?? r.status} · {formatDate(r.date)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="mt-4 text-sm text-muted">Loading…</div>
        )}
      </div>
    </div>
  );
}

// ─── Rewards ─────────────────────────────────────────────────────────────────

function Rewards() {
  const loyaltyEnabled = useFeature('loyalty');
  const [data, setData] = useState(null);
  const [entries, setEntries] = useState([]);
  const [nextBefore, setNextBefore] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!loyaltyEnabled) return;
    loyaltyService.me().then(setData).catch(() => {});
    loyaltyService.ledger({ limit: 10 }).then((d) => {
      setEntries(d.entries);
      setNextBefore(d.next_before);
    }).catch(() => {});
  }, [loyaltyEnabled]);

  async function loadMore() {
    if (!nextBefore) return;
    setLoadingMore(true);
    try {
      const d = await loyaltyService.ledger({ limit: 10, before: nextBefore });
      setEntries((prev) => [...prev, ...d.entries]);
      setNextBefore(d.next_before);
    } finally {
      setLoadingMore(false);
    }
  }

  if (!loyaltyEnabled) {
    return (
      <div className="card p-10 text-center text-sm text-muted">
        Rewards is currently paused.
      </div>
    );
  }

  if (!data) return <div className="text-sm text-muted">Loading…</div>;

  const tierColor = TIER_COLORS[data.tier] ?? TIER_COLORS.bronze;
  const cediValue = formatCurrency(data.balance * data.redeem_rate_ghs);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', tierColor)}>
              {TIER_LABELS[data.tier] ?? data.tier}
            </span>
            <span className="text-sm text-muted">{data.lifetime} lifetime points</span>
          </div>
          {data.next_tier && (
            <span className="text-xs text-muted">
              {data.next_tier_points_needed} more points to {TIER_LABELS[data.next_tier]}
            </span>
          )}
        </div>
        {data.next_tier && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${data.next_tier_progress_pct}%` }}
            />
          </div>
        )}

        <div className="mt-6">
          <p className="eyebrow">Your balance</p>
          <p className="mt-1 font-display text-2xl font-bold">
            {data.balance} points <span className="text-muted font-normal">= {cediValue} in rewards</span>
          </p>
        </div>

        {data.expiring_soon.points > 0 && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
            {data.expiring_soon.points} points expire on {formatDate(data.expiring_soon.expires_at)}. Use them before they&apos;re gone.
          </div>
        )}

        <details className="mt-6 rounded-lg border border-border">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">How it works</summary>
          <div className="space-y-1.5 border-t border-border px-4 py-3 text-sm text-muted">
            <p>Earn {data.settings_snapshot.earn_rate} point per GH₵10 spent on paid orders.</p>
            <p>Redeem {data.min_redeem_points}+ points at checkout — each point is worth {formatCurrency(data.redeem_rate_ghs)}.</p>
            <p>Points expire {data.settings_snapshot.points_expire_days} days after they're earned.</p>
          </div>
        </details>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold">Activity</h2>
        {entries.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No activity yet.</p>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-border">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium">{entry.label}</span>
                  <span className="text-xs text-muted">{formatDate(entry.created_at)}</span>
                </li>
              ))}
            </ul>
            {nextBefore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-4 text-sm text-accent disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Profile / Addresses / Wishlist ──────────────────────────────────────────

function Profile() {
  const { user } = useAuthStore();
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' });
  const [saving, setSaving] = useState(false);
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try { await authService.updateMe(form); toast.success('Profile updated'); }
    catch { toast.error('Could not save changes'); }
    finally { setSaving(false); }
  }
  return (
    <form onSubmit={save} className="card max-w-lg space-y-5 p-6">
      <Input label="Name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input label="Phone" autoComplete="tel" inputMode="tel"
        value={form.phone} onChange={(e) => setForm({ ...form, phone: sanitizePhone(e.target.value) })} />
      <Input label="Email" value={user?.email ?? ''} disabled />
      <Button type="submit" loading={saving}>Save changes</Button>
    </form>
  );
}

function Addresses() {
  return (
    <div className="card p-8 text-center">
      <MapPin className="mx-auto h-10 w-10 text-muted" />
      <h2 className="mt-4 font-display text-lg font-semibold">No addresses yet</h2>
      <p className="mt-2 text-sm text-muted">Addresses you use at checkout will appear here.</p>
    </div>
  );
}

// ─── Privacy ─────────────────────────────────────────────────────────────────

const MARKETING_PREFS_KEY = 'urbanpulse-marketing-prefs';

function readMarketingPrefs() {
  try {
    const raw = localStorage.getItem(MARKETING_PREFS_KEY);
    return raw ? { email_marketing: true, ...JSON.parse(raw) } : { email_marketing: true };
  } catch {
    return { email_marketing: true };
  }
}

function writeMarketingPrefs(next) {
  try {
    localStorage.setItem(MARKETING_PREFS_KEY, JSON.stringify({ ...next, updated_at: new Date().toISOString() }));
  } catch {}
}

const PRIVACY_EVENT_LABELS = {
  'user.data_export': 'Downloaded a copy of your data',
  'user.account_deleted': 'Account deleted',
  'user.consent_updated': 'Updated cookie/marketing preferences',
  'user.marketing_unsubscribed': 'Unsubscribed from marketing emails',
  'user.google_linked': 'Linked Google sign-in',
  'user.google_unlinked': 'Removed Google sign-in',
  'user.password_set': 'Password set or changed',
  'user.password_set_via_reset': 'Password reset',
};

function Privacy() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  const [exporting, setExporting] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [marketingPrefs, setMarketingPrefs] = useState(() => readMarketingPrefs());
  const [unsubscribing, setUnsubscribing] = useState(false);

  const [events, setEvents] = useState(null);

  useEffect(() => {
    authService.privacyEvents().then(setEvents).catch(() => setEvents([]));
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      await authService.dataExport();
      toast.success('Your data export has started downloading.');
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Could not export your data — try again in an hour.');
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await authService.deleteAccount(deletePassword);
      setUser(null);
      clearSessionHint();
      navigate('/');
      toast.success('Your account has been deleted.');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not delete account');
    } finally {
      setDeleting(false);
    }
  }

  function toggleMarketing() {
    const next = { ...marketingPrefs, email_marketing: !marketingPrefs.email_marketing };
    setMarketingPrefs(next);
    writeMarketingPrefs(next);
    authService.logConsentUpdate({ marketing: next.email_marketing }).catch(() => {});
  }

  async function handleUnsubscribe() {
    setUnsubscribing(true);
    try {
      const { url } = await authService.unsubscribeLink();
      window.open(url, '_blank');
    } catch {
      toast.error('Could not generate an unsubscribe link');
    } finally {
      setUnsubscribing(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold">Download my data</h2>
        <p className="mt-1 text-sm text-muted">
          A complete export of the data we have about you, as required by Ghana&rsquo;s Data Protection Act.
        </p>
        <Button className="mt-4" loading={exporting} onClick={handleExport}>
          <Download className="h-4 w-4 mr-1.5" /> Download my data (JSON)
        </Button>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold">Communication preferences</h2>
        <p className="mt-1 text-sm text-muted">Order updates are always sent — they&rsquo;re required to keep you informed about your purchase.</p>
        <label className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm">Marketing emails (offers, new drops)</span>
          <input
            type="checkbox"
            checked={!!marketingPrefs.email_marketing}
            onChange={toggleMarketing}
            className="h-5 w-5 accent-accent"
          />
        </label>
        <button
          type="button"
          onClick={handleUnsubscribe}
          disabled={unsubscribing}
          className="mt-3 text-xs text-muted underline hover:text-accent disabled:opacity-50"
        >
          Unsubscribe from marketing emails
        </button>
        <p className="mt-1 text-xs text-muted">
          This preference is stored on this device and doesn&rsquo;t yet stop every automated email
          (e.g. abandoned-cart reminders) — full server-side enforcement is on the way.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold">Recent privacy events</h2>
        {events === null ? (
          <p className="mt-3 text-sm text-muted">Loading…</p>
        ) : events.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No privacy events in the last 90 days.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {events.map((e, i) => (
              <li key={i} className="flex items-center justify-between py-3 text-sm">
                <span>{PRIVACY_EVENT_LABELS[e.action] ?? e.action}</span>
                <span className="text-xs text-muted">{formatDate(e.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-error">Delete my account</h2>
        <p className="mt-1 text-sm text-muted">
          Permanently deletes your profile data. Your orders will remain for tax and accounting purposes but will be anonymized.
        </p>
        {!user?.has_password ? (
          <p className="mt-4 text-sm">
            Your account uses Google sign-in only.{' '}
            <Link to="/account/security" className="text-accent hover:text-accent-hover">Set a password first</Link> to enable account deletion.
          </p>
        ) : (
          <Button variant="danger" className="mt-4" onClick={() => setDeleteModal(true)}>
            Delete my account
          </Button>
        )}
      </div>

      <Modal
        open={deleteModal}
        onClose={() => { setDeleteModal(false); setDeletePassword(''); setDeleteConfirmText(''); }}
        title="Delete your account"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            This will anonymize your profile, sign you out everywhere, and cannot be undone.
            Orders and returns are kept for accounting purposes but are no longer linked to your name.
          </p>
          <Input
            floating
            label="Password"
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
          <Input
            label='Type "DELETE MY ACCOUNT" to confirm'
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setDeleteModal(false); setDeletePassword(''); setDeleteConfirmText(''); }}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={handleDelete}
              disabled={!deletePassword || deleteConfirmText !== 'DELETE MY ACCOUNT'}
              title={!deletePassword ? 'Enter your password' : deleteConfirmText !== 'DELETE MY ACCOUNT' ? 'Type DELETE MY ACCOUNT to confirm' : undefined}
            >
              Delete account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Wishlist() {
  const wishlistEnabled = useFeature('wishlist');
  if (!wishlistEnabled) {
    return (
      <div className="card p-10 text-center text-sm text-muted">
        Wishlists are currently disabled.
      </div>
    );
  }
  const { items, loading, refresh, remove, add } = useWishlistStore();
  const addToCart = useCartStore((s) => s.add);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => { refresh(); }, [refresh]);

  const { pulling, pullProgress, refreshing } = usePullToRefresh(refresh);
  const ptrIndicator = (
    <PullToRefreshIndicator pulling={pulling} pullProgress={pullProgress} refreshing={refreshing} />
  );

  async function handleAddToCart(item) {
    const inStock = (item.variants ?? []).find((v) => v.stock > 0);
    if (!inStock) return toast.error('No variants in stock');
    setAddingId(item.id);
    try { await addToCart(inStock.id, 1); toast.success('Added to cart'); }
    catch { toast.error('Could not add to cart'); }
    finally { setAddingId(null); }
  }

  function handleRemove(item) {
    remove(item.id);
    showUndoToast({
      message: 'Removed from wishlist',
      onUndo: () => add(item.product_id),
    });
  }

  if (loading) return <>{ptrIndicator}<div className="text-sm text-muted">Loading…</div></>;
  if (items.length === 0)
    return (
      <>
        {ptrIndicator}
        <div className="card p-10 text-center">
          <Heart className="mx-auto h-10 w-10 text-muted" />
          <h2 className="mt-4 font-display text-lg font-semibold">Your wishlist is empty</h2>
          <p className="mt-2 text-sm text-muted">Save items you love and come back to them any time.</p>
          <Link to="/shop" className="mt-4 inline-block"><Button>Browse shop</Button></Link>
        </div>
      </>
    );

  return (
    <>
      {ptrIndicator}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const hasInStock = (item.variants ?? []).some((v) => v.stock > 0);
        const hasDiscount = item.compare_at_price && Number(item.compare_at_price) > Number(item.price);
        return (
          <motion.div key={item.id} variants={fadeInUp} initial="hidden" animate="show" className="card overflow-hidden">
            <Link to={`/products/${item.slug}`}>
              <div className="aspect-[4/3] overflow-hidden bg-border">
                {item.images?.[0] && (
                  <img src={item.images[0]} alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
                )}
              </div>
            </Link>
            <div className="p-4">
              <p className="text-xs text-muted">{item.category}</p>
              <Link to={`/products/${item.slug}`}>
                <h3 className="mt-0.5 font-medium leading-snug hover:text-accent">{item.name}</h3>
              </Link>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-semibold">{formatCurrency(item.price)}</span>
                {hasDiscount && <span className="text-xs text-muted line-through">{formatCurrency(item.compare_at_price)}</span>}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1"
                  disabled={!hasInStock || addingId === item.id} loading={addingId === item.id}
                  onClick={() => handleAddToCart(item)}>
                  {hasInStock ? 'Add to cart' : 'Out of stock'}
                </Button>
                <button onClick={() => handleRemove(item)} aria-label="Remove from wishlist"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-error hover:text-error transition-colors">
                  Remove
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
    </>
  );
}

// ─── Security ────────────────────────────────────────────────────────────────

function Security() {
  const { user, setUser } = useAuthStore();

  // TOTP state
  const [setupData, setSetupData] = useState(null);
  const [setupStep, setSetupStep] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [codesAcked, setCodesAcked] = useState(false);
  const [disableModal, setDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  // Google link state
  const [unlinkModal, setUnlinkModal] = useState(false);
  const [unlinkPassword, setUnlinkPassword] = useState('');

  // Password set/change state
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Sessions / history
  const [sessions, setSessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    authService.sessions().then(setSessions).catch(() => {});
    authService.loginHistory().then(setHistory).catch(() => {});
  }, []);

  async function reloadUser() {
    try {
      const { user: fresh } = await authService.me();
      setUser(fresh);
    } catch {}
  }

  async function startSetup() {
    setActing(true);
    try {
      const data = await authService.totpSetup();
      setSetupData(data);
      setSetupStep('scan');
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Setup failed'); }
    finally { setActing(false); }
  }

  async function confirmEnable() {
    setActing(true);
    try {
      await authService.totpEnable(verifyCode);
      setSetupStep('codes');
      setUser({ ...user, totp_enabled: true });
      toast.success('Two-factor authentication enabled');
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Invalid code'); }
    finally { setActing(false); setVerifyCode(''); }
  }

  async function disableTotp() {
    setActing(true);
    try {
      await authService.totpDisable(disablePassword);
      setUser({ ...user, totp_enabled: false });
      setDisableModal(false);
      setDisablePassword('');
      toast.success('Two-factor authentication disabled');
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Incorrect password'); }
    finally { setActing(false); }
  }

  async function handleLinkGoogle(credential) {
    try {
      await authService.linkGoogle(credential);
      toast.success('Google account linked');
      await reloadUser();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not link Google account');
    }
  }

  async function handleUnlinkGoogle() {
    setActing(true);
    try {
      await authService.unlinkGoogle(unlinkPassword);
      toast.success('Google sign-in removed');
      setUnlinkModal(false);
      setUnlinkPassword('');
      await reloadUser();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not remove Google sign-in');
    } finally { setActing(false); }
  }

  async function handleSetPassword() {
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    setActing(true);
    try {
      await authService.setPassword(newPassword);
      toast.success(user?.has_password ? 'Password updated' : 'Password set');
      setPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      await reloadUser();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not set password');
    } finally { setActing(false); }
  }

  async function revokeSession(id) {
    try {
      await authService.revokeSession(id);
      setSessions((s) => s.filter((x) => x.id !== id));
      toast.success('Session signed out');
    } catch { toast.error('Could not revoke session'); }
  }

  async function revokeAll() {
    try {
      await authService.revokeAllOthers();
      setSessions((s) => s.filter((x) => x.is_current));
      toast.success('All other sessions signed out');
    } catch { toast.error('Could not revoke sessions'); }
  }

  const totpEnabled = user?.totp_enabled;

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Google sign-in ── */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Google sign-in</h2>
            <p className="mt-1 text-sm text-muted">
              Sign in with one tap using your Google account.
            </p>
          </div>
          <span className={cn(
            'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
            user?.has_google
              ? 'bg-green-500/15 text-green-700 dark:text-green-400'
              : 'bg-border text-muted'
          )}>
            {user?.has_google ? 'Connected' : 'Not connected'}
          </span>
        </div>

        <div className="mt-5">
          {user?.has_google ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">Google account: {user.email}</span>
              {user?.has_password ? (
                <Button variant="outline" size="sm" onClick={() => setUnlinkModal(true)}>
                  Remove Google sign-in
                </Button>
              ) : (
                <p className="text-xs text-muted italic">Set a password first to remove Google sign-in.</p>
              )}
            </div>
          ) : (
            <div className="max-w-xs">
              <p className="mb-3 text-sm text-muted">Link your Google account for one-click sign-in.</p>
              <GoogleSignInButton text="signin_with" onCredential={handleLinkGoogle} />
            </div>
          )}
        </div>
      </div>

      {/* ── Password ── */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Password</h2>
            <p className="mt-1 text-sm text-muted">
              {user?.has_password
                ? 'Update the password used to sign in with your email.'
                : 'Set a password so you can also sign in with email.'}
            </p>
          </div>
          <KeyRound className="mt-1 h-5 w-5 shrink-0 text-muted" />
        </div>
        <div className="mt-5">
          <Button size="sm" variant="outline" onClick={() => setPasswordModal(true)}>
            {user?.has_password ? 'Change password' : 'Set a password'}
          </Button>
        </div>
      </div>

      {/* ── Two-factor authentication ── */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Two-factor authentication</h2>
            <p className="mt-1 text-sm text-muted">
              Add a second layer of security to your account using an authenticator app.
            </p>
          </div>
          <span className={cn(
            'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
            totpEnabled ? 'bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-border text-muted'
          )}>
            {totpEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {/* Setup flow */}
        {setupStep === 'scan' && setupData && (
          <div className="mt-6 space-y-4 border-t border-border pt-6">
            <p className="text-sm font-medium">Step 1 — Scan this QR code with your authenticator app</p>
            <div className="flex justify-center">
              <img src={setupData.qr_data_url} alt="TOTP QR code" className="h-48 w-48 rounded-lg" />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setSetupStep(null)}>Cancel</Button>
              <Button onClick={() => setSetupStep('verify')}>I've scanned it</Button>
            </div>
          </div>
        )}

        {setupStep === 'verify' && (
          <div className="mt-6 space-y-4 border-t border-border pt-6">
            <p className="text-sm font-medium">Step 2 — Enter the 6-digit code from your app to confirm</p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] focus:border-accent focus:outline-none"
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setSetupStep('scan')}>Back</Button>
              <Button loading={acting} disabled={verifyCode.length < 6} onClick={confirmEnable}
                title={verifyCode.length < 6 ? 'Enter the 6-digit code' : undefined}>
                Enable 2FA
              </Button>
            </div>
          </div>
        )}

        {setupStep === 'codes' && setupData && (
          <div className="mt-6 space-y-4 border-t border-border pt-6">
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Save these recovery codes somewhere safe. They are shown <strong>once only</strong> and cannot be retrieved again.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-bg p-4 font-mono text-sm">
              {setupData.recovery_codes.map((code) => (
                <div key={code} className="rounded bg-border/50 px-3 py-1.5 text-center tracking-widest">
                  {code}
                </div>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={codesAcked} onChange={(e) => setCodesAcked(e.target.checked)} className="accent-accent h-4 w-4" />
              <span className="text-sm">I've saved my recovery codes in a safe place</span>
            </label>
            <Button disabled={!codesAcked} className="w-full" onClick={() => { setSetupStep(null); setSetupData(null); setCodesAcked(false); }}>
              Done
            </Button>
          </div>
        )}

        {!setupStep && (
          <div className="mt-5 flex gap-3">
            {totpEnabled ? (
              <Button variant="danger" size="sm" onClick={() => setDisableModal(true)}>Disable 2FA</Button>
            ) : (
              <Button size="sm" loading={acting} onClick={startSetup}>Enable two-factor authentication</Button>
            )}
          </div>
        )}
      </div>

      {/* ── Active sessions ── */}
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Active sessions</h2>
            <p className="mt-1 text-sm text-muted">Devices currently signed in to your account.</p>
          </div>
          {sessions.filter((s) => !s.is_current).length > 0 && (
            <Button variant="outline" size="sm" onClick={revokeAll}>Sign out everywhere else</Button>
          )}
        </div>
        <div className="mt-5 divide-y divide-border">
          {sessions.length === 0 ? (
            <p className="py-4 text-sm text-muted">No active sessions found.</p>
          ) : sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 shrink-0 text-muted" />
                <div>
                  <div className="text-sm font-medium">
                    {s.device}
                    {s.is_current && (
                      <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        This device
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted">{s.ip_address} · Last seen {formatDate(s.last_seen_at)}</div>
                </div>
              </div>
              {!s.is_current && (
                <button
                  onClick={() => revokeSession(s.id)}
                  className="text-xs text-muted hover:text-error transition-colors"
                >
                  Sign out
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Login activity ── */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold">Recent login activity</h2>
        <p className="mt-1 text-sm text-muted">Last 30 days of sign-in events.</p>
        <div className="mt-5 divide-y divide-border">
          {history.length === 0 ? (
            <p className="py-4 text-sm text-muted">No login events recorded yet.</p>
          ) : history.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {e.device}
                  {e.via_google && (
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                      via Google
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted">{e.ip_address} · {formatDate(e.created_at)}</div>
              </div>
              <span className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                e.success ? 'bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'
              )}>
                {e.success ? 'Success' : 'Failed'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Disable 2FA modal */}
      <Modal open={disableModal} onClose={() => { setDisableModal(false); setDisablePassword(''); }} title="Disable two-factor authentication">
        <div className="space-y-4">
          <p className="text-sm text-muted">Enter your password to confirm you want to disable 2FA.</p>
          <Input
            floating
            label="Password"
            type="password"
            autoComplete="current-password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setDisableModal(false); setDisablePassword(''); }}>Cancel</Button>
            <Button variant="danger" loading={acting} onClick={disableTotp} disabled={!disablePassword}
              title={!disablePassword ? 'Enter your password' : undefined}>
              Disable 2FA
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Google sign-in modal */}
      <Modal open={unlinkModal} onClose={() => { setUnlinkModal(false); setUnlinkPassword(''); }} title="Remove Google sign-in">
        <div className="space-y-4">
          <p className="text-sm text-muted">Enter your password to confirm.</p>
          <Input
            floating
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={unlinkPassword}
            onChange={(e) => setUnlinkPassword(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setUnlinkModal(false); setUnlinkPassword(''); }}>Cancel</Button>
            <Button variant="danger" loading={acting} onClick={handleUnlinkGoogle} disabled={!unlinkPassword}
              title={!unlinkPassword ? 'Enter your password' : undefined}>
              Remove
            </Button>
          </div>
        </div>
      </Modal>

      {/* Set / change password modal */}
      <Modal open={passwordModal} onClose={() => { setPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }} title={user?.has_password ? 'Change password' : 'Set a password'}>
        <div className="space-y-4">
          <Input
            floating
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            floating
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }}>Cancel</Button>
            <Button loading={acting} onClick={handleSetPassword} disabled={!newPassword || !confirmPassword}
              title={!newPassword || !confirmPassword ? 'Fill in both password fields' : undefined}>
              {user?.has_password ? 'Update password' : 'Set password'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Root export ─────────────────────────────────────────────────────────────

export default function Account() {
  return (
    <>
      <Helmet>
        <title>Account — UrbanPulse</title>
      </Helmet>
      <Routes>
        <Route element={<AccountLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="returns" element={<ReturnsList />} />
          <Route path="returns/:id" element={<ReturnDetail />} />
          <Route path="security" element={<Security />} />
          <Route path="profile" element={<Profile />} />
          <Route path="addresses" element={<Addresses />} />
          <Route path="privacy" element={<Privacy />} />
        </Route>
      </Routes>
    </>
  );
}

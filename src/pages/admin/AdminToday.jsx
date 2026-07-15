import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  RefreshCw, Phone, CheckCircle, X, Package, RotateCcw,
  Truck, AlertTriangle, Clock, ShoppingCart, ChevronRight,
  Plus, Minus,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { adminService } from '../../services/index.js';
import { formatCurrency, formatRelativeDate, formatDate, cn } from '../../utils/format.js';
import { Button, Input } from '../../components/ui/index.jsx';
import Modal from '../../components/ui/Modal.jsx';
import BottomSheet from '../../components/admin/BottomSheet.jsx';
import { staggerContainer, fadeInUp } from '../../lib/motion.js';

// ── Greeting ─────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Row exit animation ────────────────────────────────────────────

const rowExit = {
  opacity: 0,
  height: 0,
  paddingTop: 0,
  paddingBottom: 0,
  marginBottom: 0,
  overflow: 'hidden',
};

// ── QueueSection ─────────────────────────────────────────────────

function QueueSection({ title, subtitle, count, totalCount, viewAllTo, children, emptyLabel = 'All caught up.' }) {
  const showViewAll = totalCount > (count ?? 0) && viewAllTo;
  return (
    <motion.section variants={fadeInUp} className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-eyebrow text-muted uppercase tracking-widest">{title}</span>
            {totalCount > 0 && (
              <span className="rounded-full bg-error px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
                {totalCount}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {showViewAll && (
          <Link to={viewAllTo} className="flex items-center gap-1 text-xs text-accent hover:underline">
            View all ({totalCount}) <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {totalCount === 0 ? (
        <div className="flex items-center gap-2 px-5 py-6 text-sm text-muted">
          <CheckCircle className="h-4 w-4 text-success shrink-0" />
          {emptyLabel}
        </div>
      ) : (
        <div className="divide-y divide-border">
          <AnimatePresence mode="popLayout">
            {children}
          </AnimatePresence>
        </div>
      )}
    </motion.section>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────

function QueueSkeleton({ rows = 3 }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-5 py-4 space-y-1.5">
        <div className="skeleton h-3.5 w-28" />
        <div className="skeleton h-3 w-44" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-4 border-b border-border last:border-0">
          <div className="space-y-1.5">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-3 w-40" />
          </div>
          <div className="skeleton h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ── COD Queue ────────────────────────────────────────────────────

function CodRow({ item, onDone }) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  async function confirmCOD() {
    setConfirming(true);
    try {
      await adminService.confirmCOD(item.id);
      toast.success(`${item.order_number} confirmed`);
      onDone();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not confirm');
    } finally { setConfirming(false); }
  }

  async function cancelCOD() {
    if (!window.confirm(`Cancel order ${item.order_number}?`)) return;
    setCancelling(true);
    try {
      await adminService.cancelCOD(item.id);
      toast.success(`${item.order_number} cancelled`);
      onDone();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not cancel');
    } finally { setCancelling(false); }
  }

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={rowExit} transition={{ duration: 0.22 }}
      className="px-5 py-4"
    >
      {/* Desktop */}
      <div className="hidden md:flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{item.order_number}</span>
            <span className="text-sm text-muted">·</span>
            <span className="text-sm font-medium truncate">{item.customer_name}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            <span className="tabular-nums font-display font-bold text-text">{formatCurrency(item.total_ghs)}</span>
            <span>·</span>
            <span>{item.items_count} item{item.items_count !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{formatRelativeDate(item.created_at)}</span>
            {item.customer_phone && <><span>·</span><span className="font-mono">{item.customer_phone}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.customer_phone && (
            <a href={`tel:${item.customer_phone}`}
              className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted hover:bg-highlight hover:text-text transition-colors"
              title="Call customer"
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
          <Button size="sm-dense" onClick={confirmCOD} loading={confirming}>Confirm</Button>
          <button onClick={cancelCOD} disabled={cancelling}
            className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-error/10 hover:text-error transition-colors disabled:opacity-50"
            title="Cancel order"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-mono text-sm font-semibold">{item.order_number}</div>
            <div className="text-sm font-medium">{item.customer_name}</div>
            <div className="text-xs text-muted mt-0.5">
              <span className="tabular-nums font-display font-bold text-text">{formatCurrency(item.total_ghs)}</span>
              {' · '}{item.items_count} items{' · '}{formatRelativeDate(item.created_at)}
            </div>
          </div>
          <button onClick={() => setActionsOpen(true)} className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted shrink-0">
            <Phone className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={confirmCOD} loading={confirming}>Confirm COD</Button>
          <Button size="sm" variant="ghost" onClick={cancelCOD} loading={cancelling}>Cancel</Button>
        </div>
      </div>

      <BottomSheet open={actionsOpen} onClose={() => setActionsOpen(false)} title={item.order_number}>
        <div className="space-y-1">
          {item.customer_phone && (
            <a href={`tel:${item.customer_phone}`} className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-highlight">
              <Phone className="h-4 w-4 text-muted" /> Call {item.customer_phone}
            </a>
          )}
          <button onClick={() => { confirmCOD(); setActionsOpen(false); }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-highlight">
            <CheckCircle className="h-4 w-4 text-success" /> Confirm COD
          </button>
          <button onClick={() => { cancelCOD(); setActionsOpen(false); }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-error hover:bg-error/10">
            <X className="h-4 w-4" /> Cancel order
          </button>
        </div>
      </BottomSheet>
    </motion.div>
  );
}

// ── Ship Queue ───────────────────────────────────────────────────

function ShipRow({ item, onDone }) {
  const [showForm, setShowForm] = useState(false);
  const [tracking, setTracking] = useState('');
  const [shipping, setShipping] = useState(false);

  async function markShipped() {
    setShipping(true);
    try {
      await adminService.updateOrderStatus(item.id, 'shipped', { tracking_number: tracking || undefined });
      toast.success(`${item.order_number} marked as shipped`);
      onDone();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not update');
    } finally { setShipping(false); }
  }

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={rowExit} transition={{ duration: 0.22 }}
      className="px-5 py-4"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{item.order_number}</span>
            {item.has_preorder && (
              <span className="rounded-pill bg-accent/15 px-2 py-0.5 text-eyebrow text-accent">Pre-order</span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            <span className="font-medium text-text">{item.customer_name}</span>
            {' · '}<span className="tabular-nums font-display font-bold text-text">{formatCurrency(item.total_ghs)}</span>
            {' · '}{item.items_count} item{item.items_count !== 1 ? 's' : ''}
            {' · '}Paid {formatRelativeDate(item.created_at)}
          </div>
        </div>
        <div className="shrink-0">
          {!showForm
            ? <Button size="sm-dense" onClick={() => setShowForm(true)}>Mark shipped</Button>
            : <button onClick={() => setShowForm(false)} className="text-xs text-muted hover:text-text">Cancel</button>
          }
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 flex gap-2 overflow-hidden"
          >
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Tracking number (optional)"
              className="input flex-1 text-sm py-1.5"
              onKeyDown={(e) => e.key === 'Enter' && markShipped()}
              autoFocus
            />
            <Button size="sm-dense" onClick={markShipped} loading={shipping}>Ship</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Returns Approve Queue ─────────────────────────────────────────

function ReturnApproveRow({ item, onDone }) {
  const [approving, setApproving] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const navigate = useNavigate();

  async function approve() {
    setApproving(true);
    try {
      await adminService.approveReturn(item.id);
      toast.success(`${item.rma_number} approved`);
      onDone();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not approve');
    } finally { setApproving(false); }
  }

  async function reject() {
    setRejecting(true);
    try {
      await adminService.rejectReturn(item.id, { admin_note: rejectNote });
      toast.success(`${item.rma_number} rejected`);
      onDone();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not reject');
    } finally { setRejecting(false); }
  }

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={rowExit} transition={{ duration: 0.22 }}
      className="px-5 py-4"
    >
      <div className="flex items-start justify-between gap-4">
        <button onClick={() => navigate(`/admin/returns/${item.id}`)} className="flex-1 min-w-0 text-left">
          <div className="font-mono text-sm font-semibold">{item.rma_number}</div>
          <div className="mt-0.5 text-xs text-muted">
            <span className="font-medium text-text">{item.customer_name}</span>
            {' · '}Order #{item.order_number}
            {' · '}{item.items_count} item{item.items_count !== 1 ? 's' : ''}
            {' · '}Requested {formatRelativeDate(item.created_at)}
            {item.reason_summary && <> · <span className="capitalize">{item.reason_summary.replace(/_/g, ' ')}</span></>}
          </div>
        </button>
        <div className="flex gap-2 shrink-0">
          <Button size="sm-dense" onClick={approve} loading={approving}>Approve</Button>
          <Button size="sm-dense" variant="outline" onClick={() => setShowReject(v => !v)}>Reject</Button>
        </div>
      </div>

      <AnimatePresence>
        {showReject && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 space-y-2 overflow-hidden"
          >
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={2}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm resize-none focus:border-accent focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm-dense" variant="danger" onClick={reject} loading={rejecting}>Confirm rejection</Button>
              <Button size="sm-dense" variant="ghost" onClick={() => setShowReject(false)}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Returns Refund Queue ──────────────────────────────────────────

function ReturnRefundRow({ item, onDone }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [restock, setRestock] = useState(true);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (item.refund_amount_ghs) setAmount(String(parseFloat(item.refund_amount_ghs).toFixed(2)));
  }, [item.refund_amount_ghs]);

  async function issueRefund() {
    setProcessing(true);
    try {
      await adminService.refundReturn(item.id, { refund_amount_ghs: parseFloat(amount), restock });
      toast.success(`Refund issued for ${item.rma_number}`);
      setModalOpen(false);
      onDone();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Refund failed');
    } finally { setProcessing(false); }
  }

  const resolutionLabel = { refund: 'Refund', store_credit: 'Store credit', exchange: 'Exchange' }[item.resolution] ?? item.resolution;

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={rowExit} transition={{ duration: 0.22 }}
      className="px-5 py-4"
    >
      <div className="flex items-center justify-between gap-4">
        <button onClick={() => navigate(`/admin/returns/${item.id}`)} className="flex-1 min-w-0 text-left">
          <div className="font-mono text-sm font-semibold">{item.rma_number}</div>
          <div className="mt-0.5 text-xs text-muted">
            <span className="font-medium text-text">{item.customer_name}</span>
            {' · '}{resolutionLabel}
            {item.refund_amount_ghs && <> · <span className="tabular-nums font-display font-bold text-text">{formatCurrency(item.refund_amount_ghs)}</span></>}
            {' · '}Received {formatRelativeDate(item.received_at)}
          </div>
        </button>
        <Button size="sm-dense" onClick={() => setModalOpen(true)} className="shrink-0">Issue refund</Button>
      </div>

      <Modal open={modalOpen} onClose={() => !processing && setModalOpen(false)} title={`Refund — ${item.rma_number}`}>
        <div className="space-y-4">
          <p className="text-sm text-muted">Resolution: <strong>{resolutionLabel}</strong></p>
          <div>
            <label className="text-sm font-medium block mb-1">Amount (GH₵)</label>
            <input
              type="number" min="0.01" step="0.01"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="input w-full"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="accent-accent h-4 w-4" />
            <span className="text-sm">Restock returned items</span>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={processing}>Cancel</Button>
            <Button onClick={issueRefund} loading={processing} disabled={!amount}>Issue refund</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

// ── Stock Queue ───────────────────────────────────────────────────

function StockRow({ item }) {
  const [stock, setStock] = useState(item.stock);
  const [saving, setSaving] = useState(false);

  async function adjustStock(delta) {
    const newStock = Math.max(0, stock + delta);
    const prev = stock;
    setStock(newStock);
    setSaving(true);
    try {
      await adminService.updateVariant(item.variant_id, { stock: newStock });
    } catch {
      toast.error('Could not update stock');
      setStock(prev);
    } finally { setSaving(false); }
  }

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={rowExit} transition={{ duration: 0.22 }}
      className="flex items-center justify-between gap-4 px-5 py-4"
    >
      <div className="min-w-0 flex-1">
        <Link to={`/admin/products/${item.product_id}/edit`}
          className="text-sm font-semibold hover:text-accent transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {item.product_name}
        </Link>
        <div className="mt-0.5 text-xs text-muted">
          {[item.size, item.color].filter(Boolean).join(' / ')}
          {item.sku && <> · SKU {item.sku}</>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={cn('font-display text-base font-bold tabular-nums', stock === 0 ? 'text-error' : 'text-warning')}>
          {stock}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => adjustStock(-1)}
            disabled={saving || stock === 0}
            className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted hover:bg-highlight disabled:opacity-40 transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => adjustStock(1)}
            disabled={saving}
            className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted hover:bg-highlight disabled:opacity-40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Pre-order Queue ───────────────────────────────────────────────

function PreorderRow({ item }) {
  const navigate = useNavigate();
  const daysUntil = Math.ceil((new Date(item.preorder_ships_at) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={rowExit} transition={{ duration: 0.22 }}
      className="flex items-center justify-between gap-4 px-5 py-4"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{item.name}</div>
        <div className="mt-0.5 text-xs text-muted">
          {item.preorder_count} pre-orders · Ships {formatDate(item.preorder_ships_at)}
          {daysUntil <= 0
            ? <span className="ml-1 text-error font-semibold">· Overdue!</span>
            : daysUntil <= 3
            ? <span className="ml-1 text-warning font-semibold">· {daysUntil}d away</span>
            : <span className="ml-1">· {daysUntil}d away</span>
          }
        </div>
      </div>
      <Button
        size="sm-dense"
        variant="outline"
        onClick={() => navigate(`/admin/products/${item.product_id}/edit`)}
      >
        Release stock
      </Button>
    </motion.div>
  );
}

// ── Stat Tile ─────────────────────────────────────────────────────

function StatTile({ label, value, sub, to, onClick }) {
  const inner = (
    <div className="card p-4 h-full">
      <div className="text-eyebrow text-muted mb-2">{label}</div>
      <div className="font-display text-2xl font-bold leading-none tabular-nums">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-muted">{sub}</div>}
    </div>
  );
  if (to) return <Link to={to} className="block hover:opacity-80 transition-opacity">{inner}</Link>;
  if (onClick) return <button onClick={onClick} className="block w-full text-left hover:opacity-80 transition-opacity">{inner}</button>;
  return inner;
}

// ── Main Page ─────────────────────────────────────────────────────

export default function AdminToday() {
  const prefersReduced = useReducedMotion();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-today'],
    queryFn: adminService.today,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  // Local state: track optimistically removed items per queue
  const [removed, setRemoved] = useState({
    cod: new Set(),
    ship: new Set(),
    approve: new Set(),
    refund: new Set(),
  });

  // Reset removed sets when fresh data arrives (items gone from server won't reappear)
  useEffect(() => {
    if (data) setRemoved({ cod: new Set(), ship: new Set(), approve: new Set(), refund: new Set() });
  }, [data]);

  function removeItem(queue, id) {
    setRemoved(prev => ({ ...prev, [queue]: new Set([...prev[queue], id]) }));
  }

  const q = data?.queues ?? {};
  const totals = data?.totals ?? {};

  // Filter out optimistically removed items
  const codItems    = (q.cod_awaiting_confirmation ?? []).filter(o => !removed.cod.has(o.id));
  const shipItems   = (q.orders_to_ship ?? []).filter(o => !removed.ship.has(o.id));
  const approveItems = (q.returns_awaiting_approval ?? []).filter(r => !removed.approve.has(r.id));
  const refundItems = (q.returns_awaiting_refund ?? []).filter(r => !removed.refund.has(r.id));

  // Adjusted counts (local)
  const codCount    = Math.max(0, (q.cod_count ?? 0) - removed.cod.size);
  const shipCount   = Math.max(0, (q.orders_to_ship_count ?? 0) - removed.ship.size);
  const approveCount = Math.max(0, (q.returns_awaiting_approval_count ?? 0) - removed.approve.size);
  const refundCount = Math.max(0, (q.returns_awaiting_refund_count ?? 0) - removed.refund.size);

  const stockCount  = (q.out_of_stock_count ?? 0) + (q.low_stock_count ?? 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="skeleton h-8 w-52 mb-2" />
            <div className="skeleton h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        {[1,2,3].map(i => <QueueSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={prefersReduced ? {} : staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex items-end justify-between gap-4">
        <div>
          <div className="text-eyebrow text-muted mb-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <h1 className="font-display text-h1 font-bold leading-tight">
            {getGreeting()}, {data?.greeting_name?.split(' ')[0] ?? 'Admin'}
          </h1>
        </div>
        <button
          onClick={() => refetch()}
          className={cn('grid h-9 w-9 place-items-center rounded-md border border-border text-muted hover:bg-highlight transition-colors', isFetching && 'text-accent')}
          title="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </button>
      </motion.div>

      {/* Stats strip */}
      <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label="Today's revenue"
          value={formatCurrency(totals.today_revenue_ghs ?? 0)}
          sub={`${totals.today_orders ?? 0} orders today`}
          to="/admin/orders"
        />
        <StatTile
          label="Orders today"
          value={totals.today_orders ?? 0}
          to="/admin/orders"
        />
        <StatTile
          label="New customers"
          value={totals.today_new_customers ?? 0}
          sub="Registered today"
          to="/admin/users"
        />
        <StatTile
          label="7-day revenue"
          value={formatCurrency(totals.week_revenue_ghs ?? 0)}
          sub="Paid orders, rolling"
          to="/admin/analytics"
        />
      </motion.div>

      {/* Queue 1 — COD */}
      <QueueSection
        title="Call to confirm"
        subtitle="Customers waiting to confirm their COD order."
        count={codItems.length}
        totalCount={codCount}
        viewAllTo="/admin/orders"
        emptyLabel="No COD orders waiting."
      >
        {codItems.map(o => (
          <CodRow key={o.id} item={o} onDone={() => removeItem('cod', o.id)} />
        ))}
      </QueueSection>

      {/* Queue 2 — Ready to ship */}
      <QueueSection
        title="Ready to ship"
        subtitle="Paid orders in processing — pack and dispatch."
        count={shipItems.length}
        totalCount={shipCount}
        viewAllTo="/admin/orders"
        emptyLabel="No orders waiting to ship."
      >
        {shipItems.map(o => (
          <ShipRow key={o.id} item={o} onDone={() => removeItem('ship', o.id)} />
        ))}
      </QueueSection>

      {/* Queue 3 — Returns to approve */}
      <QueueSection
        title="Returns to review"
        subtitle="Customer return requests waiting for your decision."
        count={approveItems.length}
        totalCount={approveCount}
        viewAllTo="/admin/returns"
        emptyLabel="No returns pending review."
      >
        {approveItems.map(r => (
          <ReturnApproveRow key={r.id} item={r} onDone={() => removeItem('approve', r.id)} />
        ))}
      </QueueSection>

      {/* Queue 4 — Returns to refund */}
      <QueueSection
        title="Returns to refund"
        subtitle="Items received and ready for refund or credit."
        count={refundItems.length}
        totalCount={refundCount}
        viewAllTo="/admin/returns"
        emptyLabel="No returns awaiting refund."
      >
        {refundItems.map(r => (
          <ReturnRefundRow key={r.id} item={r} onDone={() => removeItem('refund', r.id)} />
        ))}
      </QueueSection>

      {/* Queue 5 — Low / out of stock */}
      <QueueSection
        title="Stock alerts"
        subtitle="Variants at 0–5 units — consider restocking."
        count={(q.low_stock_variants ?? []).length}
        totalCount={stockCount}
        viewAllTo="/admin/products"
        emptyLabel="All variants are well stocked."
      >
        {(q.low_stock_variants ?? []).map(v => (
          <StockRow key={v.variant_id} item={v} />
        ))}
      </QueueSection>

      {/* Queue 6 — Pre-orders */}
      {(q.pending_preorders_ready_to_release ?? []).length > 0 && (
        <QueueSection
          title="Pre-orders shipping soon"
          subtitle="Release stock for pre-orders shipping within 7 days."
          count={(q.pending_preorders_ready_to_release ?? []).length}
          totalCount={(q.pending_preorders_ready_to_release ?? []).length}
          viewAllTo="/admin/orders"
          emptyLabel="No pre-orders due soon."
        >
          {(q.pending_preorders_ready_to_release ?? []).map(p => (
            <PreorderRow key={p.product_id} item={p} />
          ))}
        </QueueSection>
      )}

      {/* Footer */}
      {(q.abandoned_carts_72h ?? 0) > 0 && (
        <motion.div variants={fadeInUp} className="flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm text-muted">
          <ShoppingCart className="h-4 w-4 shrink-0" />
          <span>
            <strong className="text-text tabular-nums">{q.abandoned_carts_72h}</strong> abandoned cart{q.abandoned_carts_72h !== 1 ? 's' : ''} in the last 72 hours — these customers may need a nudge.
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

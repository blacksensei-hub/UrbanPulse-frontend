import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, CheckCircle, RotateCcw, Check, X, XCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import { Button } from '../../components/ui/index.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { adminService } from '../../services/index.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { cn } from '../../utils/format.js';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import BottomActionBar from '../../components/admin/BottomActionBar.jsx';
import CustomerLink from '../../components/admin/CustomerLink.jsx';
import { usePullToRefresh } from '../../hooks/usePullToRefresh.js';
import { useLongPress } from '../../hooks/useLongPress.js';
import { useTableSelection } from '../../hooks/useTableSelection.js';
import BulkSelectionBar from '../../components/admin/BulkSelectionBar.jsx';

const STATUSES = ['all', 'requested', 'approved', 'rejected', 'received', 'refunded'];

const STATUS_COLORS = {
  requested: 'bg-warning/15 text-warning',
  approved:  'bg-info/15 text-info',
  rejected:  'bg-error/15 text-error',
  received:  'bg-accent/15 text-accent',
  refunded:  'bg-success/15 text-success',
};

const RESOLUTION_LABELS = {
  refund:       'Refund',
  store_credit: 'Store credit',
  exchange:     'Exchange',
};

// ─── Return detail ────────────────────────────────────────────────────────────

function ReturnDetail({ returnId, onBack }) {
  const [ret, setRet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [refundModal, setRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [restock, setRestock] = useState(true);
  const [acting, setActing] = useState(false);

  function load() {
    setLoading(true);
    adminService.getReturn(returnId).then((r) => { setRet(r); setLoading(false); }).catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, [returnId]);

  // Pre-fill refund amount with sum of item prices
  useEffect(() => {
    if (ret?.items?.length && !refundAmount) {
      const total = ret.items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
      setRefundAmount(total.toFixed(2));
    }
  }, [ret]);

  async function act(fn, successMsg) {
    setActing(true);
    try {
      const updated = await fn();
      setRet(updated);
      toast.success(successMsg);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Action failed');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <div className="py-10 text-center text-sm text-muted">Loading…</div>;
  if (!ret) return <div className="py-10 text-center text-sm text-muted">Return not found.</div>;

  const TIMELINE = [
    { label: 'Requested',    date: ret.created_at },
    { label: 'Approved',     date: ret.approved_at },
    { label: 'Items received', date: ret.received_at },
    ret.status === 'rejected'
      ? { label: 'Rejected', date: ret.rejected_at }
      : { label: ret.resolution === 'store_credit' ? 'Credit issued' : 'Refund issued', date: ret.refunded_at },
  ];

  const statusOrder = ['requested', 'approved', 'received', 'refunded'];
  const currentIdx = ret.status === 'rejected' ? 1 : statusOrder.indexOf(ret.status);

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors">
        <ArrowLeft className="h-4 w-4" /> All returns
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-2xl font-bold">{ret.rma_number}</div>
          <div className="mt-1 text-sm text-muted">
            <CustomerLink customerId={ret.user_id} name={ret.customer_name} /> · {ret.customer_email} · Order{' '}
            <span className="font-mono">{ret.order_number}</span>
          </div>
          <div className="mt-1 text-xs text-muted">
            Resolution: <strong>{RESOLUTION_LABELS[ret.resolution]}</strong> · {formatDate(ret.created_at)}
          </div>
        </div>
        <span className={cn('rounded-full px-4 py-1.5 text-sm font-semibold capitalize', STATUS_COLORS[ret.status])}>
          {ret.status}
        </span>
      </div>

      {/* Timeline */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-5">Timeline</h3>
        <div className="flex gap-0">
          {TIMELINE.map((step, i) => {
            const done = ret.status === 'rejected'
              ? (i === 0 || (i === 3 && ret.status === 'rejected'))
              : i <= currentIdx;
            return (
              <div key={i} className="flex-1">
                <div className="flex items-center">
                  <div className={cn('h-3 w-3 rounded-full shrink-0', done ? 'bg-accent' : 'bg-border')} />
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
        <h3 className="font-display text-base font-semibold mb-4">Return items</h3>
        <div className="divide-y divide-border">
          {(ret.items ?? []).map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-3">
              {item.product_image && (
                <img src={item.product_image} alt="" className="h-12 w-10 rounded object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{item.product_name}</div>
                <div className="text-xs text-muted">{item.variant_description}</div>
                {item.reason_code && (
                  <div className="text-xs text-muted capitalize">
                    {item.reason_code.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold">× {item.quantity}</div>
                {item.restocked && (
                  <span className="text-xs text-success font-medium">Restocked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {(ret.customer_note || ret.admin_note || ret.refund_amount_ghs) && (
        <div className="card p-6 space-y-4">
          {ret.customer_note && (
            <div>
              <div className="text-xs text-muted uppercase tracking-wider font-semibold">Customer note</div>
              <p className="mt-1 text-sm">{ret.customer_note}</p>
            </div>
          )}
          {ret.admin_note && (
            <div>
              <div className="text-xs text-muted uppercase tracking-wider font-semibold">Rejection reason</div>
              <p className="mt-1 text-sm">{ret.admin_note}</p>
            </div>
          )}
          {ret.refund_amount_ghs && (
            <div>
              <div className="text-xs text-muted uppercase tracking-wider font-semibold">Amount issued</div>
              <p className="mt-1 text-lg font-bold text-success">
                {formatCurrency(ret.refund_amount_ghs)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Desktop inline actions */}
      <div className="hidden md:block space-y-3">
        {ret.status === 'requested' && (
          <div className="flex gap-3">
            <Button loading={acting} onClick={() => act(() => adminService.approveReturn(ret.id), 'Return approved')}>Approve</Button>
            <Button variant="danger" onClick={() => setRejectModal(true)}>Reject</Button>
          </div>
        )}
        {ret.status === 'approved' && (
          <Button loading={acting} onClick={() => act(() => adminService.receiveReturn(ret.id), 'Items marked as received')}>Mark items received</Button>
        )}
        {ret.status === 'received' && (
          <Button onClick={() => setRefundModal(true)}>Issue refund / credit</Button>
        )}
      </div>

      {/* Mobile bottom action bar */}
      {(ret.status === 'requested' || ret.status === 'approved' || ret.status === 'received') && (
        <BottomActionBar className="md:hidden">
          {ret.status === 'requested' && (
            <>
              <Button className="flex-1" loading={acting} onClick={() => act(() => adminService.approveReturn(ret.id), 'Return approved')}>Approve</Button>
              <Button variant="danger" onClick={() => setRejectModal(true)}>Reject</Button>
            </>
          )}
          {ret.status === 'approved' && (
            <Button className="flex-1" loading={acting} onClick={() => act(() => adminService.receiveReturn(ret.id), 'Items marked as received')}>Mark items received</Button>
          )}
          {ret.status === 'received' && (
            <Button className="flex-1" onClick={() => setRefundModal(true)}>Issue refund / credit</Button>
          )}
        </BottomActionBar>
      )}

      {/* Reject modal */}
      <Modal open={rejectModal} onClose={() => setRejectModal(false)} title="Reject return">
        <div className="space-y-4">
          <p className="text-sm text-muted">Provide a reason — it will be sent to the customer.</p>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={4}
            placeholder="e.g. Return window has expired, item shows signs of use beyond described…"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm resize-none focus:border-accent focus:outline-none"
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={acting}
              onClick={async () => {
                await act(
                  () => adminService.rejectReturn(ret.id, { admin_note: rejectNote }),
                  'Return rejected'
                );
                setRejectModal(false);
              }}
            >
              Confirm rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Refund modal */}
      <Modal open={refundModal} onClose={() => setRefundModal(false)} title="Issue refund">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Resolution: <strong>{RESOLUTION_LABELS[ret.resolution]}</strong>
            {ret.resolution === 'refund' && ret.payment_method !== 'cod' && ' via Paystack'}
            {ret.resolution === 'refund' && ret.payment_method === 'cod' && ' — cash handled manually'}
          </p>
          <div>
            <label className="text-sm font-medium">Amount (GH₵)</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              className="accent-accent h-4 w-4"
            />
            <span className="text-sm">Restock returned items</span>
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setRefundModal(false)}>Cancel</Button>
            <Button
              loading={acting}
              onClick={async () => {
                await act(
                  () => adminService.refundReturn(ret.id, {
                    refund_amount_ghs: Number(refundAmount),
                    restock,
                  }),
                  'Refund issued'
                );
                setRefundModal(false);
              }}
            >
              Issue {ret.resolution === 'store_credit' ? 'store credit' : 'refund'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Returns list ─────────────────────────────────────────────────────────────

function MobileReturnCard({ r, onClick, onLongPress, isSelected }) {
  const prefersReduced = useReducedMotion();
  const [dragX, setDragX] = useState(0);
  const SNAP_THRESHOLD = 60;
  const REVEAL_WIDTH = 96;
  const lpHandlers = useLongPress(onLongPress ?? (() => {}));

  const showActions = r.status === 'requested';

  return (
    <div className={cn('relative overflow-hidden rounded-xl', isSelected && 'ring-2 ring-accent')}>
      {/* Actions behind the card — only for "requested" status */}
      {showActions && (
        <div className="absolute right-0 top-0 h-full flex items-center gap-2 px-3 bg-highlight">
          <span className="text-xs text-muted font-medium">→</span>
        </div>
      )}
      <motion.div
        drag={(!prefersReduced && showActions) ? 'x' : false}
        dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
        dragElastic={0.1}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={(_, info) => {
          if (info.offset.x < -SNAP_THRESHOLD) setDragX(-REVEAL_WIDTH);
          else setDragX(0);
        }}
        animate={{ x: dragX }}
        onClick={dragX === 0 ? onClick : undefined}
        {...lpHandlers}
        className={cn('card p-4 space-y-2 relative bg-surface cursor-pointer', isSelected && 'bg-accent/5')}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-sm font-semibold">{r.rma_number}</div>
            <div className="text-xs text-muted">
              <CustomerLink customerId={r.user_id} name={r.customer_name} />
            </div>
          </div>
          <span className={cn('rounded-pill px-2 py-0.5 text-eyebrow shrink-0 capitalize', STATUS_COLORS[r.status])}>
            {r.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
          <span>{RESOLUTION_LABELS[r.resolution] ?? r.resolution}</span>
          <span>·</span>
          <span>{r.item_count} item{r.item_count !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{formatDate(r.created_at)}</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminReturns() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(routeId ? Number(routeId) : null);

  useEffect(() => {
    if (routeId) setSelectedId(Number(routeId));
  }, [routeId]);

  function loadList() {
    setLoading(true);
    const params = statusFilter !== 'all' ? { status: statusFilter } : {};
    adminService.returns(params)
      .then(setReturns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadList(); }, [statusFilter]);

  const requestedCount = returns.filter((r) => r.status === 'requested').length;

  const { selectedArray, count, toggle, toggleAll, clear, isSelected, isAllSelected } = useTableSelection();
  const [confirmAction, setConfirmAction] = useState(null);

  async function handleBulkReturns(action) {
    try {
      const { succeeded, failed } = await adminService.bulkReturns({ ids: selectedArray, action });
      const LABELS = { approve: 'Approve', reject: 'Reject' };
      toast.success(`${LABELS[action]}: ${succeeded.length} succeeded${failed.length ? `, ${failed.length} failed` : ''}`);
      if (failed.length) toast.error(failed.slice(0, 3).map(f => f.reason).join(' · '), { duration: 5000 });
      clear();
      loadList();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Bulk action failed');
    }
  }

  const BULK_ACTIONS = [
    { label: 'Approve', icon: CheckCircle, onClick: () => handleBulkReturns('approve') },
    { label: 'Reject',  icon: XCircle,     destructive: true, onClick: () => setConfirmAction({ action: 'reject', label: `Reject ${count} return${count !== 1 ? 's' : ''}?` }) },
  ];

  if (selectedId) {
    return (
      <div className="space-y-6">
        <Helmet><title>Return detail — UrbanPulse Admin</title></Helmet>
        <ReturnDetail
          returnId={selectedId}
          onBack={() => { setSelectedId(null); navigate('/admin/returns'); loadList(); }}
        />
      </div>
    );
  }

  const { isPulling, isRefreshing } = usePullToRefresh(loadList);

  return (
    <div className="space-y-6">
      <Helmet><title>Returns — UrbanPulse Admin</title></Helmet>

      {(isPulling || isRefreshing) && (
        <div className="flex justify-center py-2 md:hidden" style={{ marginTop: -16 }}>
          <div className={`h-5 w-5 rounded-full border-2 border-accent ${isRefreshing ? 'animate-spin border-t-transparent' : 'opacity-50'}`} />
        </div>
      )}

      <AdminPageHeader
        title="Returns"
        subtitle="Manage customer return requests."
        actions={requestedCount > 0 ? (
          <span className="rounded-full bg-error px-3 py-1 text-xs font-semibold text-white">
            {requestedCount} pending review
          </span>
        ) : undefined}
      />

      {/* Status filter — scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:pb-0">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors',
              statusFilter === s
                ? 'bg-accent text-white'
                : 'bg-surface border border-border text-text/70 hover:border-accent',
            )}
          >
            {s === 'all' ? 'All' : s}
            {s === 'requested' && requestedCount > 0 && (
              <span className="ml-1.5 rounded-full bg-error/20 px-1.5 text-xs text-error font-bold">
                {requestedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <>
          {/* Mobile skeletons */}
          <div className="md:hidden space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="flex justify-between"><div className="skeleton h-5 w-24 font-mono" /><div className="skeleton h-5 w-16 rounded-full" /></div>
                <div className="skeleton h-4 w-36" />
                <div className="skeleton h-4 w-24" />
              </div>
            ))}
          </div>
          <p className="hidden md:block text-sm text-muted py-6">Loading…</p>
        </>
      ) : returns.length === 0 ? (
        <div className="card p-12 text-center">
          <RotateCcw className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-4 font-display text-lg font-semibold">No returns found</p>
          <p className="mt-1 text-sm text-muted">
            {statusFilter === 'all' ? 'No returns have been requested yet.' : `No ${statusFilter} returns.`}
          </p>
        </div>
      ) : (
        <>
        {/* Mobile swipeable cards */}
        <div className="md:hidden space-y-3">
          {returns.map((r) => (
            <MobileReturnCard
              key={r.id}
              r={r}
              onClick={() => { setSelectedId(r.id); navigate(`/admin/returns/${r.id}`); }}
              onLongPress={() => toggle(r.id)}
              isSelected={isSelected(r.id)}
            />
          ))}
        </div>

        <BulkSelectionBar count={count} onClear={clear} actions={BULK_ACTIONS} />

        {/* Desktop table */}
        <div className="hidden md:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-border bg-surface">
                <tr className="text-left">
                  <th className="px-5 py-3 w-10 font-medium text-xs uppercase tracking-wider text-muted">
                    <input
                      type="checkbox"
                      className="rounded accent-accent"
                      aria-label="Select all returns"
                      checked={isAllSelected(returns.map(r => r.id))}
                      onChange={() => toggleAll(returns.map(r => r.id))}
                    />
                  </th>
                  {['RMA', 'Customer', 'Order', 'Items', 'Resolution', 'Status', 'Date'].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {returns.map((r) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => { setSelectedId(r.id); navigate(`/admin/returns/${r.id}`); }}
                    className={cn('cursor-pointer hover:bg-highlight transition-colors', isSelected(r.id) && 'bg-accent/5')}
                  >
                    <td className="px-5 py-3 w-10">
                      <input
                        type="checkbox"
                        className="rounded accent-accent"
                        aria-label={`Select return ${r.rma_number}`}
                        checked={isSelected(r.id)}
                        onChange={() => toggle(r.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-5 py-3 font-mono text-xs font-semibold">{r.rma_number}</td>
                    <td className="px-5 py-3">
                      <CustomerLink customerId={r.user_id} name={r.customer_name} className="font-medium" />
                      <div className="text-xs text-muted">{r.customer_email}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{r.order_number}</td>
                    <td className="px-5 py-3 text-center tabular-nums">{r.item_count}</td>
                    <td className="px-5 py-3 capitalize">{RESOLUTION_LABELS[r.resolution] ?? r.resolution}</td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-pill px-2.5 py-0.5 text-eyebrow capitalize', STATUS_COLORS[r.status])}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted text-xs">{formatDate(r.created_at)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.label}>
        <p className="text-sm text-muted mb-4">This will affect {count} return{count !== 1 ? 's' : ''}. This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button
            className="bg-error text-white hover:bg-error/90"
            onClick={() => { handleBulkReturns(confirmAction.action); setConfirmAction(null); }}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}

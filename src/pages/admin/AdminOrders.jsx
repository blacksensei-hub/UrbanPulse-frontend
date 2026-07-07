import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { adminService, orderService } from '../../services/index.js';
import { Ban, ChevronLeft, ChevronRight, Download, Loader2, PackageCheck, Plus, Search, ShoppingBag, Truck, X } from 'lucide-react';
import { formatCurrency, formatDate, formatRelativeDate } from '../../utils/format.js';
import { cn } from '../../utils/format.js';
import { Button, Input } from '../../components/ui/index.jsx';
import Modal from '../../components/ui/Modal.jsx';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import CustomerLink from '../../components/admin/CustomerLink.jsx';
import { usePullToRefresh } from '../../hooks/usePullToRefresh.js';
import { useTableSelection } from '../../hooks/useTableSelection.js';
import BulkSelectionBar from '../../components/admin/BulkSelectionBar.jsx';
import { exportCsv } from '../../utils/exportCsv.js';

const STATUSES = ['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

const ORDER_STATUS_STYLES = {
  pending:               'bg-warning/15 text-warning',
  awaiting_confirmation: 'bg-info/15 text-info',
  paid:                  'bg-info/15 text-info',
  processing:            'bg-info/15 text-info',
  shipped:               'bg-accent/15 text-accent',
  delivered:             'bg-success/15 text-success',
  cancelled:             'bg-error/15 text-error',
  refunded:              'bg-muted/15 text-muted',
};
const STATUS_NEXT = ['pending', 'awaiting_confirmation', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function AdminOrders() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preorderItems, setPreorderItems] = useState([]);
  const [preorderLoading, setPreorderLoading] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refunding, setRefunding] = useState(false);
  const [codQueueCount, setCodQueueCount] = useState(0);
  const [codConfirmTarget, setCodConfirmTarget] = useState(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  const [codCancelTarget, setCodCancelTarget] = useState(null);
  const [cashTarget, setCashTarget] = useState(null);
  const [codConfirming, setCodConfirming] = useState(false);
  const [codCancelling, setCodCancelling] = useState(false);
  const [cashCollecting, setCashCollecting] = useState(false);

  // Manual order modal
  const [manualOpen, setManualOpen] = useState(false);
  const [manualStep, setManualStep] = useState(1);
  const [manualCreating, setManualCreating] = useState(false);
  const [customerMode, setCustomerMode] = useState('existing');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [manualItems, setManualItems] = useState([]);
  const [manualAddress, setManualAddress] = useState({ name: '', address_line1: '', city: '', region: '', phone: '' });
  const [manualPayment, setManualPayment] = useState('cod');
  const [manualNotes, setManualNotes] = useState('');
  const [productSearchQ, setProductSearchQ] = useState('');
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [expandedProductData, setExpandedProductData] = useState(null);
  const productSearchTimer = useRef(null);

  function resetManualOrder() {
    setManualStep(1);
    setCustomerMode('existing');
    setCustomerEmail('');
    setCustomerName('');
    setCustomerPhone('');
    setManualItems([]);
    setManualAddress({ name: '', address_line1: '', city: '', region: '', phone: '' });
    setManualPayment('cod');
    setManualNotes('');
    setProductSearchQ('');
    setProductSearchResults([]);
    setExpandedProductId(null);
    setExpandedProductData(null);
  }

  function handleProductSearch(q) {
    setProductSearchQ(q);
    clearTimeout(productSearchTimer.current);
    if (!q.trim()) { setProductSearchResults([]); return; }
    setProductSearchLoading(true);
    productSearchTimer.current = setTimeout(async () => {
      try {
        const data = await adminService.products({ q });
        setProductSearchResults(data.items ?? data ?? []);
      } catch { setProductSearchResults([]); }
      finally { setProductSearchLoading(false); }
    }, 350);
  }

  async function expandProduct(productId) {
    if (expandedProductId === productId) {
      setExpandedProductId(null); setExpandedProductData(null); return;
    }
    setExpandedProductId(productId);
    setExpandedProductData(null);
    try {
      const p = await adminService.getProduct(productId);
      setExpandedProductData(p);
    } catch { toast.error('Could not load variants'); }
  }

  function addManualItem(variantId, productName, variantLabel, unitPrice) {
    setManualItems(prev => {
      const ex = prev.find(i => i.variant_id === variantId);
      if (ex) return prev.map(i => i.variant_id === variantId ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { variant_id: variantId, product_name: productName, variant_label: variantLabel, quantity: 1, unit_price: unitPrice }];
    });
  }

  async function submitManualOrder() {
    setManualCreating(true);
    try {
      const customer = customerMode === 'existing'
        ? { email: customerEmail.trim() }
        : { email: customerEmail.trim(), name: customerName.trim(), phone: customerPhone.trim() };
      const body = {
        customer,
        items: manualItems.map(({ variant_id, quantity }) => ({ variant_id, quantity })),
        shipping_address: manualAddress,
        payment_method: manualPayment,
        notes: manualNotes.trim() || undefined,
      };
      const { order } = await adminService.createManualOrder(body);
      toast.success(`Order ${order.order_number} created`);
      setManualOpen(false);
      resetManualOrder();
      navigate(`/admin/orders/${order.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Could not create order');
    } finally {
      setManualCreating(false);
    }
  }

  const { selectedArray, count, toggle, toggleAll, clear, isSelected, isAllSelected } = useTableSelection();
  const [confirmAction, setConfirmAction] = useState(null);

  async function load() {
    setLoading(true);
    try {
      let params = {};
      if (status === '__cod_queue__') {
        params = { payment_method: 'cod', status: 'awaiting_confirmation' };
      } else if (status === '__preorders__') {
        params = { has_preorder: true };
      } else if (status !== 'all') {
        params = { status };
      }
      if (status === '__preorder_items__') {
        setPreorderLoading(true);
        adminService.preorderItems().then(setPreorderItems).catch(() => {}).finally(() => setPreorderLoading(false));
        setLoading(false);
        return;
      }
      const data = await adminService.orders(params);
      setOrders(data.items ?? data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    adminService.orders({ payment_method: 'cod', status: 'awaiting_confirmation' })
      .then((d) => setCodQueueCount((d.items ?? []).length))
      .catch(() => {});
  }, []);

  async function update(id, next) {
    try {
      await adminService.updateOrderStatus(id, next);
      toast.success(`Marked as ${next}`);
      load();
    } catch {
      toast.error('Could not update');
    }
  }

  async function confirmRefund() {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      await adminService.refundOrder(refundTarget.id);
      toast.success(`Order ${refundTarget.order_number} refunded`);
      setRefundTarget(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Refund failed');
    } finally {
      setRefunding(false);
    }
  }

  async function confirmCOD() {
    if (!codConfirmTarget) return;
    setCodConfirming(true);
    try {
      await adminService.confirmCOD(codConfirmTarget.id);
      toast.success(`Order ${codConfirmTarget.order_number} confirmed`);
      setCodConfirmTarget(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not confirm');
    } finally { setCodConfirming(false); }
  }

  async function cancelCOD() {
    if (!codCancelTarget) return;
    setCodCancelling(true);
    try {
      await adminService.cancelCOD(codCancelTarget.id);
      toast.success(`Order ${codCancelTarget.order_number} cancelled`);
      setCodCancelTarget(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not cancel');
    } finally { setCodCancelling(false); }
  }

  async function downloadReceipt(o) {
    setDownloadingReceiptId(o.id);
    try { await orderService.downloadReceipt(o.id, o.order_number); }
    catch { toast.error('Could not download receipt.'); }
    finally { setDownloadingReceiptId(null); }
  }

  async function markCash() {
    if (!cashTarget) return;
    setCashCollecting(true);
    try {
      await adminService.markCashCollected(cashTarget.id);
      toast.success(`Cash collected for ${cashTarget.order_number}`);
      setCashTarget(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not mark paid');
    } finally { setCashCollecting(false); }
  }

  async function handleBulkOrders(action) {
    try {
      const { succeeded, failed } = await adminService.bulkOrders({ ids: selectedArray, action });
      const LABELS = { mark_shipped: 'Mark shipped', mark_delivered: 'Mark delivered', cancel: 'Cancel' };
      toast.success(`${LABELS[action]}: ${succeeded.length} succeeded${failed.length ? `, ${failed.length} failed` : ''}`);
      if (failed.length) toast.error(failed.slice(0, 3).map(f => f.reason).join(' · '), { duration: 5000 });
      clear();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Bulk action failed');
    }
  }

  function exportOrdersCsv() {
    exportCsv(
      orders.filter(o => isSelected(o.id)),
      [
        { label: 'Order #', key: 'order_number' },
        { label: 'Customer', key: 'customer_email' },
        { label: 'Status', key: 'status' },
        { label: 'Total', key: 'total' },
        { label: 'Payment', key: 'payment_method' },
        { label: 'Date', key: 'created_at' },
      ],
      'orders.csv'
    );
  }

  const BULK_ACTIONS = [
    { label: 'Mark shipped',   icon: Truck,        onClick: () => handleBulkOrders('mark_shipped') },
    { label: 'Mark delivered', icon: PackageCheck,  onClick: () => handleBulkOrders('mark_delivered') },
    { label: 'Cancel',         icon: Ban,           destructive: true, onClick: () => setConfirmAction({ action: 'cancel', label: `Cancel ${count} order${count !== 1 ? 's' : ''}?` }) },
    { label: 'Export CSV',     icon: Download,      onClick: exportOrdersCsv },
  ];

  const { isPulling, isRefreshing, pullY } = usePullToRefresh(load);

  return (
    <div className="space-y-6">
      {/* Pull-to-refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div className="flex justify-center py-2 md:hidden" style={{ marginTop: -16 }}>
          <Loader2 className={`h-5 w-5 text-accent ${isRefreshing ? 'animate-spin' : 'opacity-50'}`} />
        </div>
      )}

      <AdminPageHeader
        title="Orders"
        subtitle={loading ? 'Loading…' : `${orders.length} orders`}
        actions={
          <Button size="sm" onClick={() => { resetManualOrder(); setManualOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New order
          </Button>
        }
      />

      <div className="card p-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:pb-0">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold uppercase transition-colors',
                status === s
                  ? 'bg-accent text-white'
                  : 'bg-bg text-muted hover:bg-surface hover:text-text',
              )}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => setStatus('__cod_queue__')}
            className={cn(
              'relative rounded-full px-3 py-1.5 text-xs font-semibold uppercase transition-colors',
              status === '__cod_queue__'
                ? 'bg-accent text-white'
                : 'bg-bg text-muted hover:bg-surface hover:text-text',
            )}
          >
            Awaiting (COD)
            {codQueueCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                {codQueueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatus('__preorders__')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold uppercase transition-colors',
              status === '__preorders__'
                ? 'bg-accent text-white'
                : 'bg-bg text-muted hover:bg-surface hover:text-text',
            )}
          >
            Pre-orders
          </button>
          <button
            onClick={() => setStatus('__preorder_items__')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold uppercase transition-colors',
              status === '__preorder_items__'
                ? 'bg-accent text-white'
                : 'bg-bg text-muted hover:bg-surface hover:text-text',
            )}
          >
            Pending fulfillment
          </button>
        </div>
      </div>

      {/* Filter chip — shown when a non-default status is active */}
      {status !== 'all' && status !== '__preorder_items__' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-eyebrow text-muted">Filters:</span>
          <button
            onClick={() => setStatus('all')}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/25 transition-colors"
          >
            {status === '__cod_queue__' ? 'Awaiting COD' : status === '__preorders__' ? 'Pre-orders' : status}
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {status === '__preorder_items__' ? (
        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-semibold">Pre-order items pending fulfillment</h2>
            <p className="mt-0.5 text-xs text-muted">Paid, non-shipped pre-order lines across all orders.</p>
          </div>
          {preorderLoading ? (
            <p className="p-6 text-sm text-muted">Loading…</p>
          ) : preorderItems.length === 0 ? (
            <p className="p-6 text-sm text-muted">No pending pre-order items.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {['Product', 'Variant', 'Qty', 'Order', 'Customer', 'Ships'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preorderItems.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{item.product_name}</td>
                    <td className="px-4 py-3 text-muted">{item.variant_description}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.order_number}</td>
                    <td className="px-4 py-3 text-muted">{item.customer_name}</td>
                    <td className="px-4 py-3 text-accent text-xs">
                      {item.preorder_ships_at ? formatDate(item.preorder_ships_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
      <>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="flex justify-between"><div className="skeleton h-5 w-28" /><div className="skeleton h-5 w-16 rounded-full" /></div>
              <div className="skeleton h-4 w-48" />
              <div className="skeleton h-4 w-32" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="card p-10 flex flex-col items-center gap-3">
            <ShoppingBag className="h-10 w-10 text-muted opacity-40" />
            <p className="text-eyebrow text-muted">No orders found</p>
            <p className="text-sm text-muted">{status !== 'all' ? 'Try changing the status filter.' : 'Orders will appear here when customers place them.'}</p>
          </div>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="card p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/admin/orders/${o.id}`} className="font-mono text-sm font-semibold hover:text-accent transition-colors" onClick={e => e.stopPropagation()}>{o.order_number}</Link>
                  <div className="text-xs text-muted truncate">
                    <CustomerLink customerId={o.user_id} name={o.customer_email ?? o.email} />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('rounded-pill px-2 py-0.5 text-eyebrow shrink-0', ORDER_STATUS_STYLES[o.status] ?? 'bg-border text-muted')}>
                    {o.status}
                  </span>
                  {(o.payment_status === 'paid' || (o.payment_method === 'cod' && ['delivered', 'paid'].includes(o.status))) && (
                    <button
                      onClick={() => downloadReceipt(o)}
                      disabled={downloadingReceiptId === o.id}
                      className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-bg disabled:opacity-50"
                    >
                      {downloadingReceiptId === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>
              {/* Data row */}
              <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
                <span className="font-display font-bold text-text tabular-nums">{formatCurrency(o.total)}</span>
                <span>·</span>
                <span>{formatRelativeDate(o.created_at)}</span>
                <span>·</span>
                <span className={o.payment_method === 'cod' ? 'font-semibold text-text' : ''}>{o.payment_method === 'cod' ? 'COD' : 'Paystack'}</span>
              </div>
              {/* Status update */}
              <select value={o.status} onChange={(e) => update(o.id, e.target.value)} className="select text-xs py-1.5 w-full">
                {STATUS_NEXT.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {/* Primary COD/action buttons — always visible on mobile */}
              {o.payment_method === 'cod' && o.status === 'awaiting_confirmation' && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => setCodConfirmTarget(o)}>Confirm COD</Button>
                  <Button size="sm" variant="ghost" onClick={() => setCodCancelTarget(o)}>Cancel</Button>
                </div>
              )}
              {o.payment_method === 'cod' && o.status === 'processing' && o.payment_status !== 'paid' && (
                <Button size="sm" className="w-full" onClick={() => setCashTarget(o)}>Mark cash collected</Button>
              )}
              {o.payment_status === 'paid' && o.payment_method !== 'cod' && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => setRefundTarget(o)}>Refund</Button>
              )}
            </div>
          ))
        )}
      </div>

      <BulkSelectionBar count={count} onClear={clear} actions={BULK_ACTIONS} />

      {/* Desktop table */}
      <div className="hidden md:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 w-10 font-medium">
                  <input
                    type="checkbox"
                    className="rounded accent-accent"
                    aria-label="Select all orders"
                    checked={isAllSelected(orders.map(o => o.id))}
                    onChange={() => toggleAll(orders.map(o => o.id))}
                  />
                </th>
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Total</th>
                <th className="px-5 py-3 font-medium">Placed</th>
                <th className="px-5 py-3 font-medium">Payment</th>
                <th className="px-5 py-3 font-medium text-right">Update</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3 w-10"><div className="skeleton h-4 w-4 rounded" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-24 font-mono" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-32" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-5 w-16 rounded-full" /></td>
                    <td className="px-5 py-3 text-right"><div className="skeleton h-4 w-16 ml-auto" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-20" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-5 w-12 rounded-full" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-6 w-20 ml-auto" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-6 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16">
                    <div className="flex flex-col items-center gap-3">
                      <ShoppingBag className="h-10 w-10 text-muted opacity-40" />
                      <p className="text-eyebrow text-muted">No orders found</p>
                      <p className="text-sm text-muted">
                        {status !== 'all' ? 'Try changing the status filter.' : 'Orders will appear here when customers place them.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((o, i) => (
                  <motion.tr
                    key={o.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn('hover:bg-highlight transition-colors', isSelected(o.id) && 'bg-accent/5')}
                  >
                    <td className="px-5 py-3 w-10">
                      <input
                        type="checkbox"
                        className="rounded accent-accent"
                        aria-label={`Select order ${o.order_number}`}
                        checked={isSelected(o.id)}
                        onChange={() => toggle(o.id)}
                      />
                    </td>
                    <td className="px-5 py-3 font-mono text-xs font-semibold">
                      <Link to={`/admin/orders/${o.id}`} className="hover:text-accent transition-colors">{o.order_number}</Link>
                      {o.source === 'admin_manual' && (
                        <span className="ml-1.5 rounded-full bg-accent/10 text-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase">Manual</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      <CustomerLink customerId={o.user_id} name={o.customer_email ?? o.email} />
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-pill px-2.5 py-0.5 text-eyebrow', ORDER_STATUS_STYLES[o.status] ?? 'bg-border text-muted')}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-display font-bold">{formatCurrency(o.total)}</td>
                    <td className="px-5 py-3 text-muted text-xs">{formatRelativeDate(o.created_at)}</td>
                    <td className="px-5 py-3">
                      {o.payment_method === 'cod'
                        ? <span className="rounded-pill bg-border px-2 py-0.5 text-eyebrow text-text">COD</span>
                        : <span className="text-xs text-muted">Paystack</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <select
                        value={o.status}
                        onChange={(e) => update(o.id, e.target.value)}
                        className="select py-1 text-xs"
                      >
                        {STATUS_NEXT.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {o.payment_method === 'cod' && o.status === 'awaiting_confirmation' && (
                          <>
                            <button onClick={() => setCodConfirmTarget(o)}
                              className="rounded-md px-2.5 py-1.5 text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors min-h-[30px]">
                              Confirm COD
                            </button>
                            <button onClick={() => setCodCancelTarget(o)}
                              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-border transition-colors min-h-[30px]">
                              Cancel
                            </button>
                          </>
                        )}
                        {o.payment_method === 'cod' && o.status === 'processing' && o.payment_status !== 'paid' && (
                          <button onClick={() => setCashTarget(o)}
                            className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-success hover:bg-success/10 transition-colors min-h-[30px]">
                            Mark cash collected
                          </button>
                        )}
                        {o.payment_status === 'paid' && o.payment_method !== 'cod' && (
                          <button onClick={() => setRefundTarget(o)}
                            className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-error hover:bg-error/10 transition-colors min-h-[30px]">
                            Refund
                          </button>
                        )}
                        {(o.payment_status === 'paid' || (o.payment_method === 'cod' && ['delivered', 'paid'].includes(o.status))) && (
                          <button
                            onClick={() => downloadReceipt(o)}
                            disabled={downloadingReceiptId === o.id}
                            aria-label="Download receipt"
                            className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-border disabled:opacity-50 inline-flex items-center gap-1 transition-colors min-h-[30px]"
                          >
                            {downloadingReceiptId === o.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Download className="h-3 w-3" />}
                            Receipt
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      </>
      )}

      {/* Manual order modal */}
      <Modal open={manualOpen} onClose={() => !manualCreating && (setManualOpen(false), resetManualOrder())} title={`New order — Step ${manualStep} of 5`} maxWidth="max-w-lg">
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex gap-1">
            {[1,2,3,4,5].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= manualStep ? 'bg-accent' : 'bg-border'}`} />
            ))}
          </div>

          {/* Step 1: Customer */}
          {manualStep === 1 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Customer</h3>
              <div className="flex gap-3">
                {['existing', 'new'].map(m => (
                  <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="customer_mode" value={m} checked={customerMode === m} onChange={() => setCustomerMode(m)} className="accent-accent" />
                    {m === 'existing' ? 'Existing customer' : 'New customer'}
                  </label>
                ))}
              </div>
              <Input label="Email" floating type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
              {customerMode === 'new' && (
                <>
                  <Input label="Name" floating value={customerName} onChange={e => setCustomerName(e.target.value)} />
                  <Input label="Phone" floating value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                </>
              )}
            </div>
          )}

          {/* Step 2: Items */}
          {manualStep === 2 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Items</h3>
              {manualItems.length > 0 && (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {manualItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-xs text-muted">{item.variant_label} · {formatCurrency(item.unit_price)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setManualItems(prev => prev.map((x, idx) => idx === i ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))} className="h-6 w-6 rounded border border-border flex items-center justify-center text-xs">−</button>
                        <span className="w-6 text-center tabular-nums">{item.quantity}</span>
                        <button onClick={() => setManualItems(prev => prev.map((x, idx) => idx === i ? { ...x, quantity: x.quantity + 1 } : x))} className="h-6 w-6 rounded border border-border flex items-center justify-center text-xs">+</button>
                        <button onClick={() => setManualItems(prev => prev.filter((_, idx) => idx !== i))} className="text-muted hover:text-error ml-1"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                <input value={productSearchQ} onChange={e => handleProductSearch(e.target.value)} placeholder="Search products to add…" className="input pl-9" />
              </div>
              {productSearchLoading && <p className="text-xs text-muted text-center py-1">Searching…</p>}
              {productSearchResults.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {productSearchResults.map(p => (
                    <div key={p.id}>
                      <button onClick={() => expandProduct(p.id)} className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-highlight">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-muted">{formatCurrency(p.price)}</span>
                      </button>
                      {expandedProductId === p.id && (
                        <div className="bg-surface border-t border-border">
                          {!expandedProductData ? (
                            <p className="px-3 py-2 text-xs text-muted">Loading…</p>
                          ) : expandedProductData.variants?.map(v => (
                            <button key={v.id} onClick={() => { addManualItem(v.id, p.name, [v.size, v.color].filter(Boolean).join(' / ') || v.sku || 'Default', Number(expandedProductData.price) + Number(v.price_adjustment || 0)); setProductSearchQ(''); setProductSearchResults([]); setExpandedProductId(null); }} className="w-full flex items-center justify-between px-4 py-2 text-xs hover:bg-highlight text-left">
                              <span className="text-muted">{[v.size, v.color].filter(Boolean).join(' / ') || v.sku || 'Default'}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-muted">Stock: {v.stock}</span>
                                <span className="font-medium">{formatCurrency(Number(expandedProductData.price) + Number(v.price_adjustment || 0))}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {manualItems.length > 0 && (
                <div className="text-right text-sm font-semibold">
                  Subtotal: {formatCurrency(manualItems.reduce((s, i) => s + i.unit_price * i.quantity, 0))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Shipping */}
          {manualStep === 3 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Shipping address</h3>
              {['name','address_line1','city','region','phone'].map(field => (
                <Input key={field} label={field.replace('_', ' ')} floating value={manualAddress[field]} onChange={e => setManualAddress(prev => ({ ...prev, [field]: e.target.value }))} />
              ))}
            </div>
          )}

          {/* Step 4: Payment */}
          {manualStep === 4 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Payment method</h3>
              {[
                { value: 'cod', label: 'Cash on delivery' },
                { value: 'manual_cash', label: 'Cash (collected in person)' },
                { value: 'manual_momo', label: 'Mobile money (collected)' },
                { value: 'paystack', label: 'Paystack (send link to customer)' },
              ].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="manual_payment" value={value} checked={manualPayment === value} onChange={() => setManualPayment(value)} className="accent-accent" />
                  {label}
                </label>
              ))}
              <div>
                <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Admin notes (optional)</label>
                <textarea value={manualNotes} onChange={e => setManualNotes(e.target.value)} rows={2} className="textarea" placeholder="Internal notes for this order…" />
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {manualStep === 5 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Review & confirm</h3>
              <div className="rounded-lg border border-border divide-y divide-border text-sm">
                <div className="px-4 py-3">
                  <span className="text-muted text-xs uppercase tracking-wider">Customer</span>
                  <div className="mt-0.5">{customerEmail}{customerMode === 'new' && customerName ? ` (${customerName})` : ''}</div>
                </div>
                <div className="px-4 py-3">
                  <span className="text-muted text-xs uppercase tracking-wider">Items ({manualItems.length})</span>
                  {manualItems.map((item, i) => (
                    <div key={i} className="mt-0.5">{item.product_name} × {item.quantity} — {formatCurrency(item.unit_price * item.quantity)}</div>
                  ))}
                </div>
                <div className="px-4 py-3">
                  <span className="text-muted text-xs uppercase tracking-wider">Ship to</span>
                  <div className="mt-0.5">{manualAddress.address_line1}, {manualAddress.city}</div>
                </div>
                <div className="px-4 py-3">
                  <span className="text-muted text-xs uppercase tracking-wider">Payment</span>
                  <div className="mt-0.5 capitalize">{manualPayment.replace('_', ' ')}</div>
                </div>
                <div className="px-4 py-3 font-semibold flex justify-between">
                  <span>Total</span>
                  <span>{formatCurrency(manualItems.reduce((s, i) => s + i.unit_price * i.quantity, 0))}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => manualStep === 1 ? (setManualOpen(false), resetManualOrder()) : setManualStep(s => s - 1)} disabled={manualCreating}>
              {manualStep === 1 ? 'Cancel' : <><ChevronLeft className="h-4 w-4 mr-1" /> Back</>}
            </Button>
            {manualStep < 5 ? (
              <Button onClick={() => setManualStep(s => s + 1)} disabled={
                (manualStep === 1 && !customerEmail.trim()) ||
                (manualStep === 2 && manualItems.length === 0) ||
                (manualStep === 3 && (!manualAddress.address_line1 || !manualAddress.city))
              }>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={submitManualOrder} loading={manualCreating}>Confirm & create order</Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.label}>
        <p className="text-sm text-muted mb-4">This will affect {count} order{count !== 1 ? 's' : ''}. This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button
            className="bg-error text-white hover:bg-error/90"
            onClick={() => { handleBulkOrders(confirmAction.action); setConfirmAction(null); }}
          >
            Confirm
          </Button>
        </div>
      </Modal>

      <Modal open={!!refundTarget} onClose={() => !refunding && setRefundTarget(null)}>
        <div className="w-full max-w-sm space-y-4 p-6">
          <h2 className="font-display text-xl font-bold">Refund order?</h2>
          <p className="text-sm text-muted">
            This will refund <strong>{formatCurrency(refundTarget?.total)}</strong> for order{' '}
            <strong>{refundTarget?.order_number}</strong> to the customer's original payment
            method. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setRefundTarget(null)}
              disabled={refunding}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRefund}
              loading={refunding}
              className="bg-error text-white hover:bg-error/90"
            >
              Confirm refund
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!codConfirmTarget} onClose={() => !codConfirming && setCodConfirmTarget(null)}>
        <div className="w-full max-w-sm space-y-4 p-6">
          <h2 className="font-display text-xl font-bold">Confirm COD order?</h2>
          <p className="text-sm text-muted">
            Confirm order <strong>{codConfirmTarget?.order_number}</strong>. This will notify the
            customer that their order is being prepared for dispatch.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCodConfirmTarget(null)} disabled={codConfirming}>Cancel</Button>
            <Button onClick={confirmCOD} loading={codConfirming}>Confirm order</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!codCancelTarget} onClose={() => !codCancelling && setCodCancelTarget(null)}>
        <div className="w-full max-w-sm space-y-4 p-6">
          <h2 className="font-display text-xl font-bold">Cancel COD order?</h2>
          <p className="text-sm text-muted">
            Cancel order <strong>{codCancelTarget?.order_number}</strong>. Reserved stock will be
            returned to inventory. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCodCancelTarget(null)} disabled={codCancelling}>Back</Button>
            <Button onClick={cancelCOD} loading={codCancelling} className="bg-error text-white hover:bg-error/90">
              Cancel order
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!cashTarget} onClose={() => !cashCollecting && setCashTarget(null)}>
        <div className="w-full max-w-sm space-y-4 p-6">
          <h2 className="font-display text-xl font-bold">Mark cash collected?</h2>
          <p className="text-sm text-muted">
            Confirm that <strong>{formatCurrency(cashTarget?.total)}</strong> cash was collected for
            order <strong>{cashTarget?.order_number}</strong>. This marks the order as paid and delivered.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCashTarget(null)} disabled={cashCollecting}>Cancel</Button>
            <Button onClick={markCash} loading={cashCollecting}>Confirm collection</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, ChevronDown, ChevronUp, History,
  Minus, Plus, Search, X, Send,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, Input } from '../../components/ui/index.jsx';
import Modal from '../../components/ui/Modal.jsx';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import CustomerLink from '../../components/admin/CustomerLink.jsx';
import MessageComposer from '../../components/admin/MessageComposer.jsx';
import { adminService } from '../../services/index.js';
import { cn, formatCurrency, formatDate, formatRelativeDate } from '../../utils/format.js';

const ALL_STATUSES = ['pending', 'awaiting_confirmation', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

const STATUS_STYLES = {
  pending:               'bg-warning/15 text-warning',
  awaiting_confirmation: 'bg-info/15 text-info',
  paid:                  'bg-info/15 text-info',
  processing:            'bg-info/15 text-info',
  shipped:               'bg-accent/15 text-accent',
  delivered:             'bg-success/15 text-success',
  cancelled:             'bg-error/15 text-error',
  refunded:              'bg-muted/15 text-muted',
};

function parseAddr(a) {
  if (!a) return {};
  if (typeof a === 'string') { try { return JSON.parse(a); } catch { return {}; } }
  return a;
}

function isUnusualTransition(from, to) {
  return ALL_STATUSES.indexOf(to) < ALL_STATUSES.indexOf(from);
}

export default function AdminOrderDetail() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editShipping, setEditShipping] = useState({});
  const [editNotes, setEditNotes] = useState('');
  const [editTotalOverride, setEditTotalOverride] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [pendingDiff, setPendingDiff] = useState([]);

  // Item picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState('');
  const [pickerResults, setPickerResults] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [expandedPId, setExpandedPId] = useState(null);
  const [expandedPData, setExpandedPData] = useState(null);
  const pickerTimer = useRef(null);

  // Force status
  const [forceStatus, setForceStatus] = useState('');
  const [forceReason, setForceReason] = useState('');
  const [forcing, setForcing] = useState(false);
  const [showForceModal, setShowForceModal] = useState(false);

  // Manual refund
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('store_credit');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  // Edit history panel
  const [historyOpen, setHistoryOpen] = useState(false);

  // Message composer
  const [msgOpen, setMsgOpen] = useState(false);

  async function loadOrder() {
    setLoading(true);
    try {
      setOrder(await adminService.getOrder(id));
    } catch {
      toast.error('Could not load order');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOrder(); }, [id]);

  function enterEditMode() {
    if (!order) return;
    setEditStatus(order.status);
    setEditShipping(parseAddr(order.shipping_address));
    setEditNotes('');
    setEditTotalOverride('');
    setEditItems([]);
    setEditReason('');
    setIsEditing(true);
  }

  // Compute effective quantity for an existing item (after pending update_qty)
  function effQty(item) {
    const p = editItems.find(e => e.order_item_id === item.id && e.action === 'update_qty');
    return p ? p.quantity : item.quantity;
  }

  function isRemoved(item) {
    return editItems.some(e => e.order_item_id === item.id && e.action === 'remove');
  }

  function changeQty(item, delta) {
    const current = effQty(item);
    const next = current + delta;
    if (next < 1) return;
    setEditItems(prev => {
      const without = prev.filter(e => !(e.order_item_id === item.id && e.action === 'update_qty'));
      if (next === item.quantity) return without;
      return [...without, { action: 'update_qty', order_item_id: item.id, quantity: next }];
    });
  }

  function removeItem(item) {
    setEditItems(prev => [
      ...prev.filter(e => !(e.order_item_id === item.id)),
      { action: 'remove', order_item_id: item.id },
    ]);
  }

  function addPendingItem(variantId, productName, variantLabel, unitPrice) {
    setEditItems(prev => {
      const ex = prev.find(e => e.action === 'add' && e.variant_id === variantId);
      if (ex) return prev.map(e => e === ex ? { ...e, quantity: e.quantity + 1 } : e);
      return [...prev, { action: 'add', variant_id: variantId, quantity: 1, _name: productName, _label: variantLabel, _price: unitPrice }];
    });
    setPickerOpen(false);
    setPickerQ('');
    setPickerResults([]);
  }

  function buildDiff() {
    const diff = [];
    if (!order) return diff;
    if (editStatus !== order.status) diff.push(`Status: ${order.status} → ${editStatus}`);
    const orig = parseAddr(order.shipping_address);
    if (JSON.stringify(editShipping) !== JSON.stringify(orig)) diff.push('Shipping address updated');
    if (editNotes.trim()) diff.push('Admin note appended');
    if (editTotalOverride !== '') diff.push(`Total override: ${formatCurrency(editTotalOverride)}`);
    const removes = editItems.filter(e => e.action === 'remove');
    const adds = editItems.filter(e => e.action === 'add');
    const qtys = editItems.filter(e => e.action === 'update_qty');
    if (removes.length) diff.push(`${removes.length} item(s) removed`);
    if (adds.length) diff.push(`${adds.length} item(s) added`);
    if (qtys.length) diff.push(`${qtys.length} item qty changed`);
    return diff;
  }

  function handleSaveClick() {
    if (!editReason.trim()) { toast.error('Reason is required'); return; }
    const diff = buildDiff();
    if (!diff.length) { toast.error('No changes to save'); return; }
    setPendingDiff(diff);
    setShowDiffModal(true);
  }

  async function confirmSave() {
    setSaving(true);
    try {
      const body = { reason: editReason };
      if (editStatus !== order.status) body.status = editStatus;
      const orig = parseAddr(order.shipping_address);
      if (JSON.stringify(editShipping) !== JSON.stringify(orig)) body.shipping_address = editShipping;
      if (editNotes.trim()) body.admin_notes = editNotes.trim();
      if (editTotalOverride !== '') body.total_override = Number(editTotalOverride);
      const itemChanges = editItems.filter(e => e.action !== undefined).map(e => {
        const { _name, _label, _price, ...rest } = e;
        return rest;
      });
      if (itemChanges.length) body.items = itemChanges;
      await adminService.editOrder(id, body);
      toast.success('Order updated');
      setIsEditing(false);
      setShowDiffModal(false);
      loadOrder();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleForce() {
    setForcing(true);
    try {
      await adminService.forceOrderStatus(id, { status: forceStatus, reason: forceReason });
      toast.success(`Status forced to ${forceStatus}`);
      setShowForceModal(false);
      setForceStatus('');
      setForceReason('');
      loadOrder();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Force failed');
    } finally {
      setForcing(false);
    }
  }

  async function handleRefund() {
    setRefunding(true);
    try {
      await adminService.manualRefund(id, {
        amount_ghs: Number(refundAmount),
        method: refundMethod,
        reason: refundReason,
      });
      toast.success('Refund recorded');
      setRefundOpen(false);
      setRefundAmount('');
      setRefundReason('');
      loadOrder();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Refund failed');
    } finally {
      setRefunding(false);
    }
  }

  // Product search for item picker
  function handlePickerSearch(q) {
    setPickerQ(q);
    clearTimeout(pickerTimer.current);
    if (!q.trim()) { setPickerResults([]); return; }
    setPickerLoading(true);
    pickerTimer.current = setTimeout(async () => {
      try {
        const data = await adminService.products({ q });
        setPickerResults(data.items ?? data ?? []);
      } catch { setPickerResults([]); }
      finally { setPickerLoading(false); }
    }, 350);
  }

  async function expandPicker(pId) {
    if (expandedPId === pId) { setExpandedPId(null); setExpandedPData(null); return; }
    setExpandedPId(pId);
    setExpandedPData(null);
    try { setExpandedPData(await adminService.getProduct(pId)); }
    catch { toast.error('Could not load variants'); }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="card p-6 space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-4 rounded" style={{ width: `${70 - i*10}%` }} />)}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card p-10 text-center space-y-2">
        <p className="text-muted">Order not found.</p>
        <Link to="/admin/orders" className="text-accent text-sm">← Back to orders</Link>
      </div>
    );
  }

  const shipping = parseAddr(order.shipping_address);

  return (
    <div className="space-y-6 pb-24">
      <AdminPageHeader
        title={order.order_number}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Orders', href: '/admin/orders' },
          { label: order.order_number },
        ]}
        actions={
          !isEditing && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setMsgOpen(true)}>
                <Send className="h-3.5 w-3.5 mr-1" /> Send message
              </Button>
              <Button size="sm" variant="outline" onClick={enterEditMode}>Edit order</Button>
            </div>
          )
        }
      />

      {/* Order header */}
      <div className="card p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-pill px-3 py-1 text-eyebrow', STATUS_STYLES[order.status] ?? 'bg-border text-muted')}>
            {order.status}
          </span>
          {order.source === 'admin_manual' && (
            <span className="rounded-pill bg-accent/10 text-accent px-2 py-0.5 text-eyebrow">Manual</span>
          )}
          <span className="text-xs text-muted">{formatRelativeDate(order.created_at)}</span>
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          <div>
            <div className="text-xs text-muted uppercase tracking-wider">Customer</div>
            <div className="mt-0.5">
              <CustomerLink customerId={order.user_id} name={order.customer_name ?? order.user_email ?? order.email ?? '—'} />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted uppercase tracking-wider">Total</div>
            <div className="mt-0.5 font-display font-bold tabular-nums">{formatCurrency(order.total)}</div>
          </div>
          <div>
            <div className="text-xs text-muted uppercase tracking-wider">Payment</div>
            <div className="mt-0.5 capitalize">{order.payment_method?.replace('_', ' ')} · {order.payment_status}</div>
          </div>
        </div>
        {order.admin_notes && (
          <div className="rounded-lg bg-warning/5 border border-warning/20 px-3 py-2">
            <div className="text-xs font-semibold text-warning uppercase tracking-wider mb-1">Admin notes</div>
            <div className="text-sm whitespace-pre-wrap">{order.admin_notes}</div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-semibold">Items</h2>
          {isEditing && (
            <Button size="sm" variant="outline" onClick={() => { setPickerOpen(true); setPickerQ(''); setPickerResults([]); setExpandedPId(null); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add item
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider text-right">Qty</th>
                <th className="px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider text-right">Unit</th>
                <th className="px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider text-right">Line</th>
                {isEditing && <th className="px-4 py-3 w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.items.filter(item => !isRemoved(item)).map(item => {
                const qty = effQty(item);
                return (
                  <tr key={item.id} className="hover:bg-highlight">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-xs text-muted">{[item.size, item.color].filter(Boolean).join(' / ')}{item.sku ? ` · ${item.sku}` : ''}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => changeQty(item, -1)} className="h-6 w-6 rounded border border-border inline-flex items-center justify-center hover:bg-highlight"><Minus className="h-3 w-3" /></button>
                          <span className="w-8 text-center tabular-nums">{qty}</span>
                          <button onClick={() => changeQty(item, 1)} className="h-6 w-6 rounded border border-border inline-flex items-center justify-center hover:bg-highlight"><Plus className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <span className="tabular-nums">{item.quantity}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{formatCurrency(item.unit_price)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(item.unit_price * qty)}</td>
                    {isEditing && (
                      <td className="px-4 py-3">
                        <button onClick={() => removeItem(item)} className="text-muted hover:text-error transition-colors"><X className="h-4 w-4" /></button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Pending added items */}
              {isEditing && editItems.filter(e => e.action === 'add').map((e, i) => (
                <tr key={`add-${i}`} className="bg-success/5">
                  <td className="px-4 py-3">
                    <div className="font-medium text-success">{e._name}</div>
                    <div className="text-xs text-muted">{e._label}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => setEditItems(prev => e.quantity <= 1 ? prev.filter(x => x !== e) : prev.map(x => x === e ? { ...x, quantity: x.quantity - 1 } : x))} className="h-6 w-6 rounded border border-border inline-flex items-center justify-center hover:bg-highlight"><Minus className="h-3 w-3" /></button>
                      <span className="w-8 text-center tabular-nums">{e.quantity}</span>
                      <button onClick={() => setEditItems(prev => prev.map(x => x === e ? { ...x, quantity: x.quantity + 1 } : x))} className="h-6 w-6 rounded border border-border inline-flex items-center justify-center hover:bg-highlight"><Plus className="h-3 w-3" /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{formatCurrency(e._price)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-success">{formatCurrency(e._price * e.quantity)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditItems(prev => prev.filter(x => x !== e))} className="text-muted hover:text-error transition-colors"><X className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-right text-sm">
          <span className="text-muted mr-4">Order total</span>
          <span className="font-display font-bold tabular-nums">{formatCurrency(order.total)}</span>
        </div>
      </div>

      {/* Edit controls */}
      {isEditing && (
        <div className="card p-5 space-y-4">
          <h2 className="font-display font-semibold">Edit details</h2>

          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Status</label>
            <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="select">
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{s}{isUnusualTransition(order.status, s) && s !== order.status ? ' ⚠️' : ''}</option>
              ))}
            </select>
            {editStatus !== order.status && isUnusualTransition(order.status, editStatus) && (
              <p className="text-xs text-warning mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Unusual transition from {order.status}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Shipping address</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {['name', 'address_line1', 'city', 'region', 'phone'].map(f => (
                <input key={f} value={editShipping[f] ?? ''} onChange={e => setEditShipping(prev => ({ ...prev, [f]: e.target.value }))} placeholder={f.replace('_', ' ')} className="input" />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Append admin note</label>
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} className="textarea" placeholder="Appended with timestamp…" />
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Total override (leave blank to auto-recompute from items)</label>
            <input type="number" step="0.01" value={editTotalOverride} onChange={e => setEditTotalOverride(e.target.value)} className="input max-w-xs" placeholder={`Current: ${order.total}`} />
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
              Reason <span className="text-error">*</span>
            </label>
            <textarea value={editReason} onChange={e => setEditReason(e.target.value)} rows={2} className="textarea" placeholder="Required — logged to audit trail" />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSaveClick} disabled={!editReason.trim()}>Save changes</Button>
          </div>
        </div>
      )}

      {/* Shipping address (view mode) */}
      {!isEditing && (
        <div className="card p-5">
          <h2 className="font-display font-semibold mb-3">Shipping address</h2>
          <div className="text-sm space-y-0.5 text-muted">
            {shipping.name && <div className="font-medium text-text">{shipping.name}</div>}
            {shipping.address_line1 && <div>{shipping.address_line1}</div>}
            {(shipping.city || shipping.region) && <div>{[shipping.city, shipping.region].filter(Boolean).join(', ')}</div>}
            {shipping.phone && <div>{shipping.phone}</div>}
            {!Object.keys(shipping).length && <div className="italic">No address on file</div>}
          </div>
        </div>
      )}

      {/* Status timeline */}
      {order.status_history?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-semibold mb-3">Status history</h2>
          <div className="space-y-3">
            {order.status_history.map((h, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', (STATUS_STYLES[h.status] ?? 'bg-muted').split(' ')[0])} />
                <div>
                  <span className="font-medium capitalize">{h.status}</span>
                  {h.note && <span className="text-muted text-xs ml-2">{h.note}</span>}
                  <div className="text-xs text-muted">
                    {new Date(h.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Force status */}
      <div className="card p-5 border border-error/30">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-error" />
          <h2 className="font-display font-semibold text-error">Force status</h2>
        </div>
        <p className="text-sm text-muted mb-3">Bypass the normal state machine. Every force is logged.</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1">Set to</label>
            <select value={forceStatus} onChange={e => setForceStatus(e.target.value)} className="select">
              <option value="">— pick —</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted uppercase tracking-wider block mb-1">Reason <span className="text-error">*</span></label>
            <input value={forceReason} onChange={e => setForceReason(e.target.value)} className="input" placeholder="Required" />
          </div>
          <Button
            disabled={!forceStatus || !forceReason.trim()}
            className="bg-error text-white hover:bg-error/90"
            onClick={() => setShowForceModal(true)}
          >
            Force
          </Button>
        </div>
      </div>

      {/* Manual refund */}
      <div className="card p-5">
        <h2 className="font-display font-semibold mb-1">Manual refund</h2>
        <p className="text-sm text-muted mb-3">Issue a refund outside the normal return flow. Logged to audit trail.</p>
        <Button variant="outline" onClick={() => { setRefundOpen(true); setRefundAmount(String(order.total)); }}>
          Issue manual refund
        </Button>
      </div>

      {/* Edit history */}
      {order.edits?.length > 0 && (
        <div className="card overflow-hidden">
          <button
            onClick={() => setHistoryOpen(h => !h)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-highlight transition-colors"
          >
            <span className="font-display font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-muted" /> Edit history ({order.edits.length})
            </span>
            {historyOpen ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>
          <AnimatePresence>
            {historyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-border"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left bg-surface">
                        {['Field', 'Before', 'After', 'Reason', 'Admin', 'When'].map(h => (
                          <th key={h} className="px-4 py-2 text-muted uppercase tracking-wider font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {order.edits.map(e => (
                        <tr key={e.id} className="hover:bg-highlight">
                          <td className="px-4 py-2 font-medium">{e.field_name}</td>
                          <td className="px-4 py-2 text-muted max-w-[120px] truncate">{JSON.stringify(e.before_value)}</td>
                          <td className="px-4 py-2 max-w-[120px] truncate">{JSON.stringify(e.after_value)}</td>
                          <td className="px-4 py-2 text-muted max-w-[120px] truncate">{e.reason}</td>
                          <td className="px-4 py-2 text-muted whitespace-nowrap">{e.admin_name ?? 'Admin'}</td>
                          <td className="px-4 py-2 text-muted whitespace-nowrap">{formatDate(e.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Diff confirm modal */}
      <Modal open={showDiffModal} onClose={() => !saving && setShowDiffModal(false)} title="Confirm changes">
        <div className="space-y-4">
          <p className="text-sm text-muted">You are about to make the following changes:</p>
          <ul className="space-y-1 text-sm">
            {pendingDiff.map((d, i) => (
              <li key={i} className="flex gap-2"><span className="text-accent">•</span>{d}</li>
            ))}
          </ul>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowDiffModal(false)} disabled={saving}>Cancel</Button>
            <Button onClick={confirmSave} loading={saving}>Confirm & save</Button>
          </div>
        </div>
      </Modal>

      {/* Force status confirm modal */}
      <Modal open={showForceModal} onClose={() => !forcing && setShowForceModal(false)} title="Force status change">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Force <strong>{order.order_number}</strong> from <strong>{order.status}</strong> to <strong>{forceStatus}</strong>. This bypasses the state machine and will be logged.
          </p>
          <p className="text-sm"><span className="text-muted">Reason:</span> {forceReason}</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowForceModal(false)} disabled={forcing}>Cancel</Button>
            <Button className="bg-error text-white hover:bg-error/90" onClick={handleForce} loading={forcing}>Confirm</Button>
          </div>
        </div>
      </Modal>

      {/* Manual refund modal */}
      <Modal open={refundOpen} onClose={() => !refunding && setRefundOpen(false)} title="Manual refund">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Amount (GH₵)</label>
            <input type="number" step="0.01" min="0.01" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} className="input" />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Method</label>
            <div className="space-y-2">
              {[
                { value: 'store_credit', label: 'Store credit' },
                { value: 'paystack', label: 'Paystack (original payment method)' },
                { value: 'manual_cash', label: 'Cash / manual' },
              ].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="refund_method" value={value} checked={refundMethod === value} onChange={() => setRefundMethod(value)} className="accent-accent" />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Reason <span className="text-error">*</span></label>
            <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} rows={2} className="textarea" placeholder="Required — logged to audit trail" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setRefundOpen(false)} disabled={refunding}>Cancel</Button>
            <Button
              onClick={handleRefund}
              loading={refunding}
              disabled={!refundAmount || !refundReason.trim()}
              className="bg-error text-white hover:bg-error/90"
            >
              Issue refund
            </Button>
          </div>
        </div>
      </Modal>

      {/* Item picker modal */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add item">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input value={pickerQ} onChange={e => handlePickerSearch(e.target.value)} placeholder="Search products…" className="input pl-9" autoFocus />
          </div>
          {pickerLoading && <p className="text-xs text-muted text-center py-2">Searching…</p>}
          <div className="max-h-72 overflow-y-auto space-y-1">
            {pickerResults.map(p => (
              <div key={p.id} className="rounded-lg border border-border overflow-hidden">
                <button onClick={() => expandPicker(p.id)} className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-highlight text-left">
                  <span>{p.name}</span>
                  <span className="text-xs text-muted">{formatCurrency(p.price)}</span>
                </button>
                {expandedPId === p.id && (
                  <div className="border-t border-border bg-surface">
                    {!expandedPData ? (
                      <p className="px-3 py-2 text-xs text-muted">Loading variants…</p>
                    ) : (expandedPData.variants ?? []).map(v => (
                      <button
                        key={v.id}
                        onClick={() => addPendingItem(v.id, p.name, [v.size, v.color].filter(Boolean).join(' / ') || v.sku || 'Default', Number(expandedPData.price) + Number(v.price_adjustment || 0))}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs hover:bg-highlight text-left"
                      >
                        <span className="text-muted">{[v.size, v.color].filter(Boolean).join(' / ') || v.sku || 'Default'}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted">Stock: {v.stock}</span>
                          <span className="font-medium">{formatCurrency(Number(expandedPData.price) + Number(v.price_adjustment || 0))}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!pickerLoading && pickerQ && !pickerResults.length && (
              <p className="text-sm text-muted text-center py-4">No products found</p>
            )}
          </div>
        </div>
      </Modal>

      <MessageComposer
        open={msgOpen}
        onClose={() => setMsgOpen(false)}
        customerId={order.user_id}
        customerName={order.customer_name ?? order.user_email ?? order.email}
        customerEmail={order.user_email ?? order.email}
        orderId={Number(id)}
        orderNumber={order.order_number}
        orderTotal={order.total}
      />
    </div>
  );
}

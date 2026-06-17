import { useEffect, useState } from 'react';
import { Eye, EyeOff, Plus, Trash2, Pencil, TicketPercent, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { Button, Input } from '../../components/ui/index.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { adminService } from '../../services/index.js';
import { formatCurrency, formatDate, cn } from '../../utils/format.js';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import BottomSheet from '../../components/admin/BottomSheet.jsx';
import { usePullToRefresh } from '../../hooks/usePullToRefresh.js';
import { useLongPress } from '../../hooks/useLongPress.js';
import { useTableSelection } from '../../hooks/useTableSelection.js';
import BulkSelectionBar from '../../components/admin/BulkSelectionBar.jsx';

const empty = {
  code: '',
  type: 'percentage',
  value: 10,
  min_order: '',
  usage_limit: '',
  expires_at: '',
  starts_at: '',
  first_order_only: false,
  buy_x: '',
  get_y: '',
  is_active: true,
};

function MobileCouponCard({ c, onEdit, onRemove, onLongPress, isSelected }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const longPress = useLongPress(onLongPress ?? (() => setSheetOpen(true)));

  const discountLabel = c.type === 'free_shipping'
    ? 'Free shipping'
    : (c.type === 'percentage' || c.type === 'percent')
      ? `${c.value}% off`
      : `${formatCurrency(c.value)} off`;

  return (
    <>
      <div className={cn('card p-4 space-y-2', isSelected && 'bg-accent/5 ring-2 ring-accent')} {...longPress}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono font-bold text-base">{c.code}</div>
            <div className="text-sm text-muted">{discountLabel}</div>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted hover:bg-bg"
            aria-label="Actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
          {c.min_order && <span>Min {formatCurrency(c.min_order)}</span>}
          <span>Used: {c.usage_count ?? 0}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</span>
          <span>Expires: {c.expires_at ? formatDate(c.expires_at) : 'Never'}</span>
        </div>
      </div>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={c.code}>
        <div className="space-y-1">
          <button
            onClick={() => { onEdit(c); setSheetOpen(false); }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 hover:bg-highlight transition-colors text-sm font-medium"
          >
            <Pencil className="h-4 w-4 text-muted" /> Edit coupon
          </button>
          <button
            onClick={() => { onRemove(c.id); setSheetOpen(false); }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 hover:bg-error/10 transition-colors text-sm font-medium text-error"
          >
            <Trash2 className="h-4 w-4" /> Delete coupon
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  async function load() {
    setLoading(true);
    try {
      setCoupons(await adminService.coupons());
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(c) {
    setEditing(c);
    setForm({
      ...empty,
      ...c,
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
      starts_at:  c.starts_at  ? c.starts_at.slice(0, 10)  : '',
      first_order_only: c.first_order_only ?? false,
      buy_x: c.buy_x ?? '',
      get_y: c.get_y ?? '',
    });
    setOpen(true);
  }

  async function save() {
    const payload = {
      ...form,
      code: form.code.toUpperCase(),
      value: form.type === 'free_shipping' ? 0 : Number(form.value),
      min_order: form.min_order ? Number(form.min_order) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      expires_at: form.expires_at || null,
      starts_at: form.starts_at || null,
      first_order_only: form.first_order_only,
      buy_x: form.buy_x ? Number(form.buy_x) : null,
      get_y: form.get_y ? Number(form.get_y) : null,
    };
    try {
      if (editing) await adminService.updateCoupon(editing.id, payload);
      else await adminService.createCoupon(payload);
      toast.success(editing ? 'Coupon updated' : 'Coupon created');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this coupon?')) return;
    try {
      await adminService.deleteCoupon(id);
      toast.success('Coupon deleted');
      load();
    } catch {
      toast.error('Could not delete');
    }
  }

  const { selectedArray, count, toggle, toggleAll, clear, isSelected, isAllSelected } = useTableSelection();
  const [confirmAction, setConfirmAction] = useState(null);

  async function handleBulkCoupons(action) {
    try {
      const { succeeded, failed } = await adminService.bulkCoupons({ ids: selectedArray, action });
      const LABELS = { activate: 'Activate', deactivate: 'Deactivate', delete: 'Delete' };
      toast.success(`${LABELS[action]}: ${succeeded.length} succeeded${failed.length ? `, ${failed.length} failed` : ''}`);
      if (failed.length) toast.error(failed.slice(0, 3).map(f => f.reason).join(' · '), { duration: 5000 });
      clear();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Bulk action failed');
    }
  }

  const BULK_ACTIONS = [
    { label: 'Activate',   icon: Eye,    onClick: () => handleBulkCoupons('activate') },
    { label: 'Deactivate', icon: EyeOff, onClick: () => handleBulkCoupons('deactivate') },
    { label: 'Delete',     icon: Trash2, destructive: true, onClick: () => setConfirmAction({ action: 'delete', label: `Delete ${count} coupon${count !== 1 ? 's' : ''}?` }) },
  ];

  const { isPulling, isRefreshing } = usePullToRefresh(load);

  return (
    <div className="space-y-6">
      {(isPulling || isRefreshing) && (
        <div className="flex justify-center py-2 md:hidden" style={{ marginTop: -16 }}>
          <div className={`h-5 w-5 rounded-full border-2 border-accent ${isRefreshing ? 'animate-spin border-t-transparent' : 'opacity-50'}`} />
        </div>
      )}
      <AdminPageHeader
        title="Coupons"
        subtitle={loading ? 'Loading…' : `${coupons.length} active codes`}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> New coupon
          </Button>
        }
      />

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="skeleton h-5 w-24 font-mono" />
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-4 w-48" />
              </div>
            ))
          : coupons.length === 0
          ? (
            <div className="card p-10 flex flex-col items-center gap-3">
              <TicketPercent className="h-10 w-10 text-muted opacity-40" />
              <p className="text-eyebrow text-muted">No coupons yet</p>
              <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> New coupon</Button>
            </div>
          )
          : coupons.map((c) => (
              <MobileCouponCard key={c.id} c={c} onEdit={openEdit} onRemove={remove} onLongPress={() => toggle(c.id)} isSelected={isSelected(c.id)} />
            ))}
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
                    aria-label="Select all coupons"
                    checked={isAllSelected(coupons.map(c => c.id))}
                    onChange={() => toggleAll(coupons.map(c => c.id))}
                  />
                </th>
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Discount</th>
                <th className="px-5 py-3 font-medium text-right">Min order</th>
                <th className="px-5 py-3 font-medium text-right">Used</th>
                <th className="px-5 py-3 font-medium">Expires</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3 w-10"><div className="skeleton h-4 w-4 rounded" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-20 font-mono" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-16" /></td>
                    <td className="px-5 py-3 text-right"><div className="skeleton h-4 w-16 ml-auto" /></td>
                    <td className="px-5 py-3 text-right"><div className="skeleton h-4 w-10 ml-auto" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-20" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-7 w-16 ml-auto rounded-md" /></td>
                  </tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16">
                    <div className="flex flex-col items-center gap-3">
                      <TicketPercent className="h-10 w-10 text-muted opacity-40" />
                      <p className="text-eyebrow text-muted">No coupons yet</p>
                      <p className="text-sm text-muted">Create discount codes to drive sales.</p>
                      <Button size="sm" onClick={openCreate}>
                        <Plus className="mr-1 h-4 w-4" /> New coupon
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn('hover:bg-highlight transition-colors', isSelected(c.id) && 'bg-accent/5')}
                  >
                    <td className="px-5 py-3 w-10">
                      <input
                        type="checkbox"
                        className="rounded accent-accent"
                        aria-label={`Select coupon ${c.code}`}
                        checked={isSelected(c.id)}
                        onChange={() => toggle(c.id)}
                      />
                    </td>
                    <td className="px-5 py-3 font-mono font-semibold">{c.code}</td>
                    <td className="px-5 py-3">
                      {c.type === 'free_shipping'
                        ? 'Free shipping'
                        : (c.type === 'percentage' || c.type === 'percent')
                          ? `${c.value}% off`
                          : `${formatCurrency(c.value)} off`}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted">
                      {c.min_order ? formatCurrency(c.min_order) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted">
                      {c.usage_count ?? 0}
                      {c.usage_limit ? ` / ${c.usage_limit}` : ''}
                    </td>
                    <td className="px-5 py-3 text-muted text-xs">
                      {c.expires_at ? formatDate(c.expires_at) : 'Never'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-bg hover:text-text transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(c.id)}
                          className="grid h-8 w-8 place-items-center rounded-md text-error hover:bg-error/10 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.label}>
        <p className="text-sm text-muted mb-4">This will permanently delete {count} coupon{count !== 1 ? 's' : ''}. This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button
            className="bg-error text-white hover:bg-error/90"
            onClick={() => { handleBulkCoupons(confirmAction.action); setConfirmAction(null); }}
          >
            Confirm
          </Button>
        </div>
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="w-full max-w-md space-y-4 p-6">
          <h2 className="font-display text-xl font-bold">
            {editing ? 'Edit coupon' : 'New coupon'}
          </h2>
          <Input
            label="Code"
            floating
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-eyebrow text-muted">Type</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="select"
              >
                <option value="percentage">Percent off</option>
                <option value="fixed">Fixed amount off</option>
                <option value="free_shipping">Free shipping</option>
              </select>
            </label>
            {form.type !== 'free_shipping' && (
              <Input
                label="Value"
                floating
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Min order (GH₵)"
              floating
              type="number"
              value={form.min_order}
              onChange={(e) => setForm({ ...form, min_order: e.target.value })}
            />
            <Input
              label="Usage limit"
              floating
              type="number"
              value={form.usage_limit}
              onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Starts at (optional)"
              floating
              type="date"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
            <Input
              label="Expires (optional)"
              floating
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Buy X items"
              floating
              type="number"
              value={form.buy_x}
              onChange={(e) => setForm({ ...form, buy_x: e.target.value })}
            />
            <Input
              label="Get Y items free"
              floating
              type="number"
              value={form.get_y}
              onChange={(e) => setForm({ ...form, get_y: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.first_order_only}
              onChange={(e) => setForm({ ...form, first_order_only: e.target.checked })}
              className="accent-accent"
            />
            First order only
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="accent-accent"
            />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

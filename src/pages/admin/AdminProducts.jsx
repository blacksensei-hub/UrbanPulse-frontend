import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Plus, Download, Upload, Search, Pencil, Tag, Trash2, Package, MoreVertical } from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import BottomSheet from '../../components/admin/BottomSheet.jsx';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { Button, Input } from '../../components/ui/index.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { adminService } from '../../services/index.js';
import { formatCurrency, cn } from '../../utils/format.js';
import { usePullToRefresh } from '../../hooks/usePullToRefresh.js';
import { useLongPress } from '../../hooks/useLongPress.js';
import { useTableSelection } from '../../hooks/useTableSelection.js';
import BulkSelectionBar from '../../components/admin/BulkSelectionBar.jsx';

function MobileProductCard({ p, onEdit, onRemove, onLongPress, isSelected }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const longPress = useLongPress(onLongPress ?? (() => setSheetOpen(true)));

  return (
    <>
      <div
        className={cn('card p-4 flex items-center gap-3 cursor-pointer hover:bg-highlight transition-colors', isSelected && 'bg-accent/5 ring-2 ring-accent')}
        onClick={() => onEdit(p)}
        {...longPress}
      >
        <img
          src={p.images?.[0] ?? 'https://placehold.co/48'}
          alt=""
          className="h-12 w-12 rounded-lg object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{p.name}</span>
            {p.is_preorder && (
              <span className="rounded-pill bg-accent/15 px-2 py-0.5 text-eyebrow text-accent shrink-0">Pre</span>
            )}
          </div>
          <div className="text-xs text-muted">{p.category}</div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="font-display font-bold tabular-nums">{formatCurrency(p.price)}</span>
            <span className={cn('rounded-pill px-2 py-0.5 text-eyebrow shrink-0', (p.total_stock ?? 0) === 0 ? 'bg-error/15 text-error' : (p.total_stock ?? 0) < 10 ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success')}>
              {p.total_stock ?? 0}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setSheetOpen(true); }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted hover:bg-bg"
          aria-label="More actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={p.name}>
        <div className="space-y-1">
          <Link
            to={`/admin/products/${p.id}/edit`}
            onClick={() => setSheetOpen(false)}
            className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-highlight transition-colors text-sm font-medium"
          >
            <Pencil className="h-4 w-4 text-muted" /> Edit product
          </Link>
          <button
            onClick={() => { onRemove(p.id); setSheetOpen(false); }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 hover:bg-error/10 transition-colors text-sm font-medium text-error"
          >
            <Trash2 className="h-4 w-4" /> Delete product
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

function MobileProductList({ items, loading, onRemove, onLongPress, isSelected }) {
  const navigate = useNavigate();
  if (!loading && items.length === 0) {
    return (
      <div className="md:hidden card p-10 flex flex-col items-center gap-3">
        <Package className="h-10 w-10 text-muted opacity-40" />
        <p className="text-eyebrow text-muted">No products yet</p>
        <p className="text-sm text-muted">Add your first product to get started.</p>
        <Link to="/admin/products/new"><Button size="sm"><Plus className="mr-1 h-4 w-4" /> New product</Button></Link>
      </div>
    );
  }
  return (
    <div className="md:hidden space-y-3">
      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 flex items-center gap-3">
              <div className="skeleton h-12 w-12 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2"><div className="skeleton h-5 w-32" /><div className="skeleton h-4 w-20" /><div className="skeleton h-4 w-24" /></div>
            </div>
          ))
        : items.map((p) => (
            <MobileProductCard key={p.id} p={p} onEdit={() => navigate(`/admin/products/${p.id}/edit`)} onRemove={onRemove} onLongPress={() => onLongPress?.(p.id)} isSelected={isSelected?.(p.id)} />
          ))}
    </div>
  );
}

export default function AdminProducts() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const importRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await adminService.products({ q });
      setItems(data.items ?? data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function remove(id) {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await adminService.deleteProduct(id);
      toast.success('Product deleted');
      load();
    } catch {
      toast.error('Could not delete');
    }
  }

  async function exportCsv() {
    try {
      const blob = await adminService.exportProducts();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not export');
    }
  }

  async function importCsv(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const result = await adminService.importProducts(fd);
      setImportResult(result);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const csv = 'id,slug,name,price,category,sku,size,color,stock\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const { selectedArray, count, toggle, toggleAll, clear, isSelected, isAllSelected } = useTableSelection();
  const [confirmAction, setConfirmAction] = useState(null); // { action, label, extra? }
  const [categoryInput, setCategoryInput] = useState('');

  async function handleBulkProducts(action, extra) {
    try {
      const body = { ids: selectedArray, action, ...(extra ?? {}) };
      const { succeeded, failed, warnings = [] } = await adminService.bulkProducts(body);
      const LABELS = { activate: 'Activate', deactivate: 'Deactivate', set_category: 'Set category', delete: 'Delete' };
      toast.success(`${LABELS[action]}: ${succeeded.length} succeeded${failed.length ? `, ${failed.length} failed` : ''}`);
      if (warnings.length) toast(`${warnings.length} deactivated instead of deleted (has order history)`, { icon: '⚠️', duration: 4000 });
      if (failed.length) toast.error(failed.slice(0, 3).map(f => f.reason).join(' · '), { duration: 5000 });
      clear();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Bulk action failed');
    }
  }

  const BULK_ACTIONS = [
    { label: 'Activate',     icon: Eye,      onClick: () => handleBulkProducts('activate') },
    { label: 'Deactivate',   icon: EyeOff,   onClick: () => handleBulkProducts('deactivate') },
    { label: 'Set category', icon: Tag,       onClick: () => { setCategoryInput(''); setConfirmAction({ action: 'set_category', label: 'Set category' }); } },
    { label: 'Delete',       icon: Trash2,    destructive: true, onClick: () => setConfirmAction({ action: 'delete', label: `Delete ${count} product${count !== 1 ? 's' : ''}?` }) },
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
        title="Products"
        subtitle={loading ? 'Loading…' : `${items.length} products`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-1 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => importRef.current?.click()} loading={importing}>
              <Upload className="mr-1 h-4 w-4" /> Import CSV
            </Button>
            <input
              ref={importRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={importCsv}
            />
            <Link to="/admin/products/new">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> New product
              </Button>
            </Link>
          </>
        }
      />

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or SKU…"
            className="input pl-10"
          />
        </div>
      </div>

      {/* Mobile card list */}
      <MobileProductList items={items} loading={loading} onRemove={remove} onLongPress={toggle} isSelected={isSelected} />

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
                    aria-label="Select all products"
                    checked={isAllSelected(items.map(p => p.id))}
                    onChange={() => toggleAll(items.map(p => p.id))}
                  />
                </th>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium text-right">Price</th>
                <th className="px-5 py-3 font-medium text-right">Stock</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3 w-10"><div className="skeleton h-4 w-4 rounded" /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="skeleton h-10 w-10 rounded-md shrink-0" />
                        <div className="space-y-1.5">
                          <div className="skeleton h-4 w-32" />
                          <div className="skeleton h-3 w-20" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-20" /></td>
                    <td className="px-5 py-3 text-right"><div className="skeleton h-4 w-16 ml-auto" /></td>
                    <td className="px-5 py-3 text-right"><div className="skeleton h-5 w-12 rounded-full ml-auto" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Package className="h-10 w-10 text-muted opacity-40" />
                      <p className="text-eyebrow text-muted">No products yet</p>
                      <p className="text-sm text-muted">Add your first product to get started.</p>
                      <Link to="/admin/products/new">
                        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New product</Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn('hover:bg-highlight transition-colors', isSelected(p.id) && 'bg-accent/5')}
                  >
                    <td className="px-5 py-3 w-10">
                      <input
                        type="checkbox"
                        className="rounded accent-accent"
                        aria-label={`Select ${p.name}`}
                        checked={isSelected(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images?.[0] ?? 'https://placehold.co/40'}
                          alt=""
                          className="h-10 w-10 rounded-md object-cover shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 font-semibold">
                            {p.name}
                            {p.is_preorder && (
                              <span className="rounded-pill bg-accent/15 px-2 py-0.5 text-eyebrow text-accent">
                                Pre-order
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted">{p.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{p.category}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-display font-semibold">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`rounded-pill px-2.5 py-0.5 text-eyebrow ${
                          (p.total_stock ?? 0) === 0
                            ? 'bg-error/15 text-error'
                            : (p.total_stock ?? 0) < 10
                            ? 'bg-warning/15 text-warning'
                            : 'bg-success/15 text-success'
                        }`}
                      >
                        {p.total_stock ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/products/${p.id}/edit`}
                          className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-bg hover:text-text transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => remove(p.id)}
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

      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.action === 'set_category' ? 'Set category' : confirmAction?.label}
      >
        {confirmAction?.action === 'set_category' ? (
          <>
            <p className="text-sm text-muted mb-3">Assign a new category to {count} product{count !== 1 ? 's' : ''}.</p>
            <Input
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              placeholder="Category name"
              className="mb-4"
              autoFocus
            />
          </>
        ) : (
          <p className="text-sm text-muted mb-4">This will affect {count} product{count !== 1 ? 's' : ''}. Products with order history will be deactivated instead of deleted.</p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button
            className={confirmAction?.action === 'delete' ? 'bg-error text-white hover:bg-error/90' : ''}
            disabled={confirmAction?.action === 'set_category' && !categoryInput.trim()}
            onClick={() => {
              const extra = confirmAction?.action === 'set_category' ? { category: categoryInput.trim() } : undefined;
              handleBulkProducts(confirmAction.action, extra);
              setConfirmAction(null);
            }}
          >
            Confirm
          </Button>
        </div>
      </Modal>

      <Modal open={!!importResult} onClose={() => setImportResult(null)}>
        <div className="w-full max-w-lg space-y-4 p-6">
          <h2 className="font-display text-xl font-bold">Import complete</h2>
          <div className="flex gap-6 text-center text-sm">
            <div>
              <p className="text-2xl font-bold text-success">{importResult?.created ?? 0}</p>
              <p className="text-muted">Created</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">{importResult?.updated ?? 0}</p>
              <p className="text-muted">Updated</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-error">{importResult?.skipped?.length ?? 0}</p>
              <p className="text-muted">Skipped</p>
            </div>
          </div>
          {importResult?.skipped?.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border text-xs">
              {importResult.skipped.map((s, i) => (
                <div key={i} className="border-b border-border px-3 py-2 last:border-0">
                  <span className="font-mono text-muted">{s.slug ?? s.row}</span>
                  <span className="ml-2 text-error">{s.reason}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={downloadTemplate}>
              Download template
            </Button>
            <Button onClick={() => setImportResult(null)}>Done</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

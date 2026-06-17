import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, SlidersHorizontal, Trash2, Upload, Package } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, Input } from '../../components/ui/index.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { adminService } from '../../services/index.js';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';

const emptyVariant = () => ({ size: '', color: '', sku: '', stock: 0, price_adjustment: 0 });

function SectionLabel({ children }) {
  return (
    <div className="text-eyebrow text-muted uppercase tracking-widest border-b border-border pb-2 mb-4">
      {children}
    </div>
  );
}

export default function AdminProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    category: '',
    description: '',
    price: '',
    compare_at_price: '',
    images: [''],
    is_active: true,
    is_preorder: false,
    preorder_ships_at: '',
    preorder_limit: '',
    variants: [emptyVariant()],
  });

  const [releaseModal, setReleaseModal] = useState(false);
  const [releaseQtys, setReleaseQtys] = useState({});
  const [clearPreorder, setClearPreorder] = useState(false);
  const [releasing, setReleasing] = useState(false);

  // Inventory adjustment
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Adjustment history (all variants)
  const [adjHistory, setAdjHistory] = useState([]);

  useEffect(() => {
    if (!isEdit) return;
    adminService
      .getProduct(id)
      .then(async (p) => {
        if (!p) return;
        const variants = p.variants?.length ? p.variants : [emptyVariant()];
        setForm({ ...p, images: p.images?.length ? p.images : [''], variants });
        const savedVariants = variants.filter(v => v.id);
        if (savedVariants.length) {
          const histories = await Promise.all(
            savedVariants.map(v =>
              adminService.getVariantAdjustHistory(v.id)
                .then(r => (r.adjustments ?? []).map(a => ({
                  ...a,
                  variant_label: [v.size, v.color].filter(Boolean).join(' / ') || v.sku || `#${v.id}`,
                })))
                .catch(() => [])
            )
          );
          setAdjHistory(histories.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        }
      })
      .catch(() => {});
  }, [id, isEdit]);

  useEffect(() => {
    const handler = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setIsDirty(true);
  }

  function handleCancel() {
    if (!isDirty || window.confirm('You have unsaved changes. Leave without saving?')) {
      navigate('/admin/products');
    }
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const { secure_url } = await adminService.uploadImage(fd);
        setForm((f) => ({
          ...f,
          images: [...f.images.filter(Boolean), secure_url],
        }));
        setIsDirty(true);
      } catch (err) {
        toast.error(err?.response?.data?.message ?? 'Upload failed');
      }
    }
    setUploading(false);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        images: form.images.filter(Boolean),
        is_preorder: !!form.is_preorder,
        preorder_ships_at: form.is_preorder && form.preorder_ships_at ? form.preorder_ships_at : null,
        preorder_limit: form.is_preorder && form.preorder_limit ? Number(form.preorder_limit) : null,
        variants: form.variants.map((v) => ({
          ...v,
          stock: Number(v.stock) || 0,
          price_adjustment: Number(v.price_adjustment) || 0,
        })),
      };
      if (isEdit) await adminService.updateProduct(id, payload);
      else await adminService.createProduct(payload);
      toast.success(isEdit ? 'Product updated' : 'Product created');
      setIsDirty(false);
      navigate('/admin/products');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function releaseStock() {
    setReleasing(true);
    try {
      const quantities = {};
      for (const [vid, qty] of Object.entries(releaseQtys)) {
        if (Number(qty) > 0) quantities[vid] = Number(qty);
      }
      const result = await adminService.releasePreorder(id, { quantities, clear_preorder: clearPreorder });
      toast.success(`Stock released. ${result.shippable_count} order item(s) ready to ship.`);
      setReleaseModal(false);
      setReleaseQtys({});
      if (clearPreorder) set('is_preorder', false);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Release failed');
    } finally {
      setReleasing(false);
    }
  }

  async function handleAdjust() {
    if (!adjustTarget || !adjustReason || adjustDelta === '' || Number(adjustDelta) === 0) return;
    setAdjusting(true);
    try {
      const result = await adminService.adjustVariantStock(adjustTarget.id, {
        delta: Number(adjustDelta),
        reason: adjustReason,
        note: adjustNote.trim() || undefined,
      });
      toast.success(`Stock adjusted: ${result.stock_before} → ${result.stock_after}`);
      setForm(f => ({
        ...f,
        variants: f.variants.map(v => v.id === adjustTarget.id ? { ...v, stock: result.stock_after } : v),
      }));
      setAdjHistory(prev => [{ ...result.adjustment, variant_label: [adjustTarget.size, adjustTarget.color].filter(Boolean).join(' / ') || adjustTarget.sku || `#${adjustTarget.id}` }, ...prev]);
      setAdjustTarget(null);
      setAdjustDelta('');
      setAdjustReason('');
      setAdjustNote('');
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Adjustment failed');
    } finally {
      setAdjusting(false);
    }
  }

  const SECTIONS = [
    { id: 'section-basics', label: 'Basics' },
    { id: 'section-images', label: 'Images' },
    { id: 'section-variants', label: 'Variants' },
    { id: 'section-publishing', label: 'Publishing' },
    ...(isEdit ? [{ id: 'section-history', label: 'History' }] : []),
  ];

  return (
    <div className="space-y-6 pb-24">
      <AdminPageHeader
        title={isEdit ? 'Edit product' : 'New product'}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Products', href: '/admin/products' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
      />

      {/* Section nav pills — mobile only */}
      <div className="sticky top-0 z-10 flex gap-2 overflow-x-auto bg-bg py-2 -mx-4 px-4 md:hidden">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap border border-border text-muted hover:bg-highlight transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left column — main content */}
        <div className="space-y-6">
          {/* Basics */}
          <section id="section-basics" className="card p-6">
            <SectionLabel>Basics</SectionLabel>
            <div className="space-y-4">
              <Input
                label="Name"
                floating
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
              />
              <Input
                label="Slug"
                floating
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                hint="Lowercase, hyphen-separated. Used in the URL."
              />
              <Input
                label="Category"
                floating
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              />
              <label className="block">
                <span className="text-eyebrow text-muted mb-1.5 block">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={4}
                  className="textarea"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Price (GH₵)"
                  floating
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                  required
                />
                <Input
                  label="Compare-at price (optional)"
                  floating
                  type="number"
                  step="0.01"
                  value={form.compare_at_price ?? ''}
                  onChange={(e) => set('compare_at_price', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Images */}
          <section id="section-images" className="card p-6">
            <SectionLabel>Images</SectionLabel>
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {uploading ? (
                  <span>Uploading…</span>
                ) : (
                  <>
                    <Upload className="h-6 w-6" />
                    <span>Drag & drop images here, or click to upload</span>
                    <span className="text-xs opacity-60">JPEG, PNG, WebP — max 10 MB each</span>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              {form.images.map((src, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={src}
                    onChange={(e) => {
                      const arr = [...form.images];
                      arr[i] = e.target.value;
                      set('images', arr);
                    }}
                    placeholder="https://…"
                    className="input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const arr = form.images.filter((_, idx) => idx !== i);
                      set('images', arr.length ? arr : ['']);
                    }}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border text-muted hover:text-error transition-colors"
                    aria-label="Remove image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set('images', [...form.images, ''])}
              >
                <Plus className="mr-1 h-4 w-4" /> Add image URL
              </Button>
            </div>
          </section>

          {/* Variants */}
          <section id="section-variants" className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>Variants</SectionLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set('variants', [...form.variants, emptyVariant()])}
              >
                <Plus className="mr-1 h-4 w-4" /> Add variant
              </Button>
            </div>
            <div className="space-y-3">
              {form.variants.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_1.5fr_80px_100px_40px_40px]"
                >
                  <input placeholder="Size" value={v.size} onChange={(e) => { const arr = [...form.variants]; arr[i].size = e.target.value; set('variants', arr); }} className="input" />
                  <input placeholder="Color" value={v.color} onChange={(e) => { const arr = [...form.variants]; arr[i].color = e.target.value; set('variants', arr); }} className="input" />
                  <input placeholder="SKU" value={v.sku} onChange={(e) => { const arr = [...form.variants]; arr[i].sku = e.target.value; set('variants', arr); }} className="input" />
                  <input type="number" placeholder="Stock" value={v.stock} onChange={(e) => { const arr = [...form.variants]; arr[i].stock = e.target.value; set('variants', arr); }} className="input" />
                  <input type="number" step="0.01" placeholder="Δ price" value={v.price_adjustment ?? 0} onChange={(e) => { const arr = [...form.variants]; arr[i].price_adjustment = e.target.value; set('variants', arr); }} className="input" />
                  <button
                    type="button"
                    onClick={() => { const arr = form.variants.filter((_, idx) => idx !== i); set('variants', arr.length ? arr : [emptyVariant()]); }}
                    className="grid h-11 w-11 place-items-center rounded-lg border border-border text-muted hover:text-error transition-colors"
                    aria-label="Remove variant"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {v.id ? (
                    <button
                      type="button"
                      onClick={() => { setAdjustTarget(v); setAdjustDelta(''); setAdjustReason(''); setAdjustNote(''); }}
                      className="grid h-11 w-11 place-items-center rounded-lg border border-border text-muted hover:text-accent hover:border-accent transition-colors"
                      aria-label="Adjust stock"
                      title="Adjust stock"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                  ) : <div />}
                </motion.div>
              ))}
            </div>
          </section>

          {/* Adjustment History */}
          {isEdit && (
            <section id="section-history" className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <SectionLabel>Adjustment History</SectionLabel>
              </div>
              {adjHistory.length === 0 ? (
                <p className="px-6 py-4 text-sm text-muted">No inventory adjustments yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        {['Variant', 'Delta', 'Reason', 'Note', 'Admin', 'Date'].map(h => (
                          <th key={h} className="px-4 py-2 text-xs text-muted font-medium uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {adjHistory.map(a => (
                        <tr key={a.id} className="hover:bg-highlight">
                          <td className="px-4 py-2 text-xs text-muted">{a.variant_label}</td>
                          <td className="px-4 py-2 font-mono font-semibold">
                            <span className={a.delta > 0 ? 'text-success' : 'text-error'}>{a.delta > 0 ? `+${a.delta}` : a.delta}</span>
                            <span className="text-muted font-normal text-xs ml-1">({a.stock_before}→{a.stock_after})</span>
                          </td>
                          <td className="px-4 py-2 text-xs">{a.reason}</td>
                          <td className="px-4 py-2 text-xs text-muted max-w-[120px] truncate">{a.note ?? '—'}</td>
                          <td className="px-4 py-2 text-xs text-muted">{a.admin_name ?? 'Admin'}</td>
                          <td className="px-4 py-2 text-xs text-muted whitespace-nowrap">{new Date(a.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right sidebar — meta */}
        <div className="space-y-6">
          {/* Publishing */}
          <section id="section-publishing" className="card p-5">
            <SectionLabel>Publishing</SectionLabel>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="accent-accent"
              />
              Active (visible on storefront)
            </label>
          </section>

          {/* Pre-order */}
          <section className="card p-5">
            <SectionLabel>Pre-order</SectionLabel>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.is_preorder}
                  onChange={(e) => set('is_preorder', e.target.checked)}
                  className="accent-accent"
                />
                <span className="text-sm font-medium">Enable pre-order</span>
              </label>
              {form.is_preorder && (
                <div className="space-y-3 pt-1">
                  <Input
                    label="Ships on (date)"
                    floating
                    type="date"
                    value={form.preorder_ships_at?.slice(0, 10) ?? ''}
                    onChange={(e) => set('preorder_ships_at', e.target.value)}
                    hint="Must be a future date"
                  />
                  <Input
                    label="Pre-order limit (optional)"
                    floating
                    type="number"
                    min={1}
                    value={form.preorder_limit ?? ''}
                    onChange={(e) => set('preorder_limit', e.target.value || null)}
                    hint="Leave blank for unlimited"
                  />
                  {isEdit && (
                    <button
                      type="button"
                      onClick={() => setReleaseModal(true)}
                      className="flex items-center gap-1.5 text-sm text-accent underline underline-offset-2"
                    >
                      <Package className="h-4 w-4" />
                      Release pre-order stock
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sticky save bar — spans full grid */}
        <div className="lg:col-span-2 sticky bottom-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 border-t border-border bg-surface/90 backdrop-blur px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          {isDirty && <span className="text-xs text-muted italic">Unsaved changes</span>}
          <div className="ml-auto flex gap-3">
            <Button variant="ghost" type="button" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </div>
        </div>
      </form>

      {/* Release pre-order stock modal */}
      {releaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold">Release pre-order stock</h2>
            <p className="text-sm text-muted">Enter the quantity of stock arriving for each variant.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(form.variants ?? []).filter(v => v.id).map((v) => (
                <div key={v.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm">{[v.size, v.color].filter(Boolean).join(' / ') || `Variant ${v.id}`}</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={releaseQtys[v.id] ?? ''}
                    onChange={(e) => setReleaseQtys(q => ({ ...q, [v.id]: e.target.value }))}
                    className="w-24 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-right"
                  />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={clearPreorder} onChange={e => setClearPreorder(e.target.checked)} className="accent-accent h-4 w-4" />
              <span className="text-sm">Remove pre-order flag after release</span>
            </label>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setReleaseModal(false)}>Cancel</Button>
              <Button loading={releasing} onClick={releaseStock}>Release stock</Button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory adjust modal */}
      <Modal open={!!adjustTarget} onClose={() => !adjusting && setAdjustTarget(null)} title="Adjust stock">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Variant: <strong>{adjustTarget ? ([adjustTarget.size, adjustTarget.color].filter(Boolean).join(' / ') || adjustTarget.sku || `#${adjustTarget.id}`) : ''}</strong>
            {' · '}Current stock: <strong>{adjustTarget?.stock}</strong>
          </p>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Delta (e.g. −3 or +10)</label>
            <input
              type="number"
              value={adjustDelta}
              onChange={e => setAdjustDelta(e.target.value)}
              className="input"
              placeholder="0"
            />
            {adjustDelta !== '' && Number(adjustDelta) !== 0 && adjustTarget && (
              <p className="text-xs text-muted mt-1">
                New stock: <strong className={Number(adjustTarget.stock) + Number(adjustDelta) < 0 ? 'text-error' : 'text-success'}>
                  {Number(adjustTarget.stock) + Number(adjustDelta)}
                </strong>
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Reason <span className="text-error">*</span></label>
            <select value={adjustReason} onChange={e => setAdjustReason(e.target.value)} className="select">
              <option value="">— select —</option>
              {['damaged', 'found', 'audit', 'theft', 'restock', 'manual_correction', 'other'].map(r => (
                <option key={r} value={r}>{r.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Note (optional)</label>
            <textarea value={adjustNote} onChange={e => setAdjustNote(e.target.value)} rows={2} className="textarea" placeholder="Additional detail…" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setAdjustTarget(null)} disabled={adjusting}>Cancel</Button>
            <Button
              onClick={handleAdjust}
              loading={adjusting}
              disabled={!adjustReason || adjustDelta === '' || Number(adjustDelta) === 0}
            >
              Save adjustment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

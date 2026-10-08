import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/index.jsx';
import { adminService, settingsService } from '../../services/index.js';
import { formatCurrency } from '../../utils/format.js';
import { getServerMessage } from '../../utils/errors.js';

const newId = () => `b${Date.now().toString(36)}`;

/**
 * Bundles: "these products together for this price". Nothing is on until a
 * bundle is added and saved. The saving is applied by the server at checkout
 * (utils/pricing.js), recorded on the order, and shown on the receipt and
 * emails as a discount. A bundle that wouldn't save money is ignored.
 */
export default function BundlesCard({ settings }) {
  const [bundles, setBundles] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = settings.bundles;
    const list = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : raw;
    setBundles(Array.isArray(list) ? list : []);
  }, [settings]);

  useEffect(() => {
    adminService.products({ limit: 100 }).then((d) => setProducts(d.items ?? d ?? [])).catch(() => {});
  }, []);

  const byId = useMemo(() => new Map(products.map((p) => [Number(p.id), p])), [products]);
  const update = (i, patch) => setBundles((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  async function save() {
    for (const b of bundles) {
      const ids = new Set((b.product_ids || []).map(Number));
      if (!b.name?.trim()) return toast.error('Every bundle needs a name');
      if (ids.size < 2) return toast.error(`"${b.name}": pick at least two different products`);
      if (!(Number(b.price_ghs) > 0)) return toast.error(`"${b.name}": set a bundle price`);
    }
    setSaving(true);
    try {
      const clean = bundles.map((b) => ({
        id: b.id || newId(),
        name: b.name.trim(),
        product_ids: [...new Set(b.product_ids.map(Number))],
        price_ghs: Number(b.price_ghs),
        active: b.active !== false,
      }));
      await settingsService.put('bundles', JSON.stringify(clean));
      setBundles(clean);
      toast.success('Bundles saved');
    } catch (err) {
      toast.error(getServerMessage(err, 'Could not save bundles'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-6">
      <div className="text-eyebrow text-muted uppercase tracking-widest border-b border-border pb-2 mb-4">Bundles</div>
      <p className="text-xs text-muted">
        Sell products together for less, e.g. a top and a bottom. The saving is applied at checkout when the bag holds one of each,
        shown to the shopper in their bag, and recorded on the order.
      </p>

      <div className="mt-4 space-y-4">
        {bundles.map((b, i) => {
          const ids = [...new Set((b.product_ids || []).map(Number))];
          const separate = ids.reduce((s, id) => s + Number(byId.get(id)?.price ?? 0), 0);
          const saving = separate - Number(b.price_ghs || 0);
          return (
            <div key={b.id || i} className="rounded-xl border border-border p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <label className="block text-xs text-muted">Name
                  <input className="input mt-1" value={b.name ?? ''} placeholder="Jersey + Jeans" onChange={(e) => update(i, { name: e.target.value })} />
                </label>
                <label className="block text-xs text-muted">Bundle price (GH₵)
                  <input className="input mt-1" type="number" min="0" step="1" value={b.price_ghs ?? ''} onChange={(e) => update(i, { price_ghs: e.target.value })} />
                </label>
              </div>
              <fieldset className="mt-3">
                <legend className="text-xs text-muted">Products in the bundle</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {products.map((p) => {
                    const picked = ids.includes(Number(p.id));
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => update(i, { product_ids: picked ? ids.filter((x) => x !== Number(p.id)) : [...ids, Number(p.id)] })}
                        className={`press rounded-full border px-3 py-1.5 text-xs ${picked ? 'border-accent bg-accent text-on-accent' : 'border-border hover:border-text'}`}
                        aria-pressed={picked}
                      >
                        {p.name} · {formatCurrency(p.price)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className={saving > 0 ? 'text-success' : 'text-muted'}>
                  {ids.length >= 2 && Number(b.price_ghs) > 0
                    ? (saving > 0
                      ? `Separately ${formatCurrency(separate)} → ${formatCurrency(b.price_ghs)}: saves ${formatCurrency(saving)}`
                      : `Costs ${formatCurrency(separate)} separately, so this price saves nothing and won't apply`)
                    : 'Pick two or more products and a price'}
                </span>
                <span className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 accent-accent" checked={b.active !== false} onChange={(e) => update(i, { active: e.target.checked })} />
                    Active
                  </label>
                  <button type="button" onClick={() => setBundles((bs) => bs.filter((_, j) => j !== i))} className="flex items-center gap-1 text-error hover:underline">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={() => setBundles((bs) => [...bs, { id: newId(), name: '', product_ids: [], price_ghs: '', active: true }])}>
          <Plus className="h-4 w-4" /> Add bundle
        </Button>
        <Button size="sm" loading={saving} onClick={save}>Save</Button>
      </div>
    </section>
  );
}

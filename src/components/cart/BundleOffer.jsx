import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Check, ChevronRight } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore.js';
import { useCartStore } from '../../stores/cartStore.js';
import { productService } from '../../services/index.js';
import { activeBundles, bundleDiscount } from '../../lib/pricing.js';
import { formatCurrency } from '../../utils/format.js';
import { spring } from '../../lib/motion.js';

/**
 * The cart's bundle nudge. Applied: says what it saves. One piece short:
 * names the missing piece, what the set costs and what it saves, and links
 * to it (a size still has to be chosen, so it can't add it blind). The
 * saving itself is applied by the server at checkout (utils/pricing.js).
 */
export default function BundleOffer({ items = [] }) {
  const settings = useSettingsStore((s) => s.settings);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const bundles = useMemo(() => activeBundles(settings), [settings]);
  const applied = useMemo(() => bundleDiscount(items, settings), [items, settings]);

  // The first bundle the cart is part-way into.
  const partial = useMemo(() => {
    if (applied.discount > 0) return null;
    const inCart = new Set(items.map((i) => Number(i.product_id)));
    for (const b of bundles) {
      const ids = [...new Set(b.product_ids.map(Number))];
      const have = ids.filter((id) => inCart.has(id));
      if (have.length && have.length < ids.length) return { bundle: b, missing: ids.filter((id) => !inCart.has(id)) };
    }
    return null;
  }, [applied.discount, bundles, items]);

  const [missing, setMissing] = useState([]);
  const missingKey = partial?.missing.join(',') ?? '';
  useEffect(() => {
    if (!missingKey) { setMissing([]); return; }
    let live = true;
    productService.byIds(missingKey.split(',')).then((r) => live && setMissing(r?.items ?? r ?? [])).catch(() => {});
    return () => { live = false; };
  }, [missingKey]);

  if (applied.discount > 0) {
    return (
      <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring}
        className="inset-group mt-4">
        <div className="inset-row flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-on-accent"><Check className="h-4 w-4" strokeWidth={2.6} /></span>
          <p className="flex-1 text-sm">
            <span className="font-semibold">{applied.note}</span>
            <span className="block text-muted">Bundle applied at checkout</span>
          </p>
          <span className="font-mono text-sm font-semibold text-accent-text">−{formatCurrency(applied.discount)}</span>
        </div>
      </motion.div>
    );
  }

  if (!partial || !missing.length) return null;
  const inCartPrice = (id) => Math.max(0, ...items.filter((i) => Number(i.product_id) === id).map((i) => Number(i.price)));
  const separate = partial.bundle.product_ids.map(Number).reduce((s, id) => {
    const m = missing.find((p) => Number(p.id) === id);
    return s + (m ? Number(m.price) : inCartPrice(id));
  }, 0);
  const saving = +(separate - Number(partial.bundle.price_ghs)).toFixed(2);
  if (saving <= 0) return null;
  const next = missing[0];

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="inset-group mt-4">
      <Link to={`/products/${next.slug}`} onClick={closeDrawer} className="inset-row press flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-highlight"><Sparkles className="h-4 w-4 text-accent-text" /></span>
        <p className="flex-1 text-sm">
          <span className="font-semibold">Add {next.name}, save {formatCurrency(saving)}</span>
          <span className="block text-muted">{partial.bundle.name} for {formatCurrency(partial.bundle.price_ghs)}</span>
        </p>
        <ChevronRight className="h-4 w-4 text-muted" />
      </Link>
    </motion.div>
  );
}

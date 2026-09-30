import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../ui/index.jsx';
import { settingsService } from '../../services/index.js';
import { GHANA_REGIONS } from '../../lib/pricing.js';

const on = (v) => v === true || v === 'true';

/**
 * Delivery price by region. Off by default: while it's off, every order
 * uses the flat Standard/Express rates above, exactly as before. A blank box
 * uses the flat rate for that region. Free delivery over the threshold still
 * applies to Standard everywhere. The server applies the same table
 * (utils/pricing.js), so what checkout shows is what's charged.
 */
export default function DeliveryRegionsCard({ settings }) {
  const [enabled, setEnabled] = useState(false);
  const [rates, setRates] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(on(settings.delivery_regions_enabled));
    const raw = settings.delivery_regions;
    setRates((typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : raw) || {});
  }, [settings]);

  const set = (region, field, value) =>
    setRates((r) => ({ ...r, [region]: { ...(r[region] || {}), [field]: value } }));

  async function save() {
    setSaving(true);
    const clean = {};
    for (const [region, v] of Object.entries(rates)) {
      const standard = v?.standard === '' || v?.standard == null ? null : Number(v.standard);
      const express = v?.express === '' || v?.express == null ? null : Number(v.express);
      if ([standard, express].some((n) => n !== null && (!Number.isFinite(n) || n < 0))) {
        toast.error(`${region}: rates must be 0 or more`);
        setSaving(false);
        return;
      }
      if (standard !== null || express !== null) clean[region] = { standard, express };
    }
    try {
      await settingsService.put('delivery_regions', JSON.stringify(clean));
      await settingsService.put('delivery_regions_enabled', enabled ? 'true' : 'false');
      toast.success(enabled ? 'Delivery by region is on' : 'Region rates saved (switched off)');
    } catch {
      toast.error('Could not save delivery rates');
    } finally {
      setSaving(false);
    }
  }

  const flatStd = settings.shipping_standard_ghs ?? 30;
  const flatExp = settings.shipping_express_ghs ?? 80;

  return (
    <section className="card p-6">
      <div className="text-eyebrow text-muted uppercase tracking-widest border-b border-border pb-2 mb-4">Delivery by region</div>
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1 h-5 w-5 accent-accent" />
        <span>
          <span className="block text-sm font-medium">Charge delivery by region</span>
          <span className="block text-xs text-muted">
            Off: every order pays the flat rates above (GH₵{flatStd} / GH₵{flatExp}). Leave a box empty to use the flat rate for that region.
            Free delivery over the threshold still applies to Standard.
          </span>
        </span>
      </label>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-2 font-medium">Region</th>
              <th className="py-2 font-medium">Standard (GH₵)</th>
              <th className="py-2 font-medium">Express (GH₵)</th>
            </tr>
          </thead>
          <tbody>
            {GHANA_REGIONS.map((region) => (
              <tr key={region} className="border-t border-border/60">
                <td className="py-2 pr-3">{region}</td>
                {['standard', 'express'].map((field) => (
                  <td key={field} className="py-1.5 pr-3">
                    <input
                      type="number" min="0" step="1" inputMode="decimal"
                      value={rates[region]?.[field] ?? ''}
                      placeholder={String(field === 'standard' ? flatStd : flatExp)}
                      onChange={(e) => set(region, field, e.target.value)}
                      aria-label={`${region} ${field} rate`}
                      className="input h-9 w-28 py-1"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end">
        <Button size="sm" loading={saving} onClick={save}>Save</Button>
      </div>
    </section>
  );
}

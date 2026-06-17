import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button, Input } from '../../components/ui/index.jsx';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import { settingsService } from '../../services/index.js';

function SectionLabel({ children }) {
  return (
    <div className="text-eyebrow text-muted uppercase tracking-widest border-b border-border pb-2 mb-4">
      {children}
    </div>
  );
}

const FLAG_DEFS = [
  { key: 'feature_referrals', label: 'Referral Program', desc: 'Allow customers to refer friends and earn store credit' },
  { key: 'feature_wishlist',  label: 'Wishlist',          desc: 'Allow customers to save products to a wishlist' },
  { key: 'feature_reviews',   label: 'Product Reviews',   desc: 'Allow verified buyers to submit product reviews' },
  { key: 'feature_preorders', label: 'Pre-orders',        desc: 'Allow customers to place pre-orders for upcoming products' },
  { key: 'feature_cod',       label: 'Cash on Delivery',  desc: 'Offer Cash on Delivery as a payment option' },
  { key: 'feature_paystack',  label: 'Paystack Payments', desc: 'Offer Mobile Money and Card payments via Paystack' },
];

const JOB_DEFS = [
  { id: 'abandoned-cart',       label: 'Abandoned cart recovery',  desc: 'Finds idle carts and sends recovery emails' },
  { id: 'preorder-stock-check', label: 'Preorder stock check',     desc: 'Flags pre-orders whose ship date has passed' },
  { id: 'backups',              label: 'Database backup',          desc: 'Creates a DB snapshot (not yet implemented)' },
];

function useSettingField(settings, key, transform = v => v) {
  const [val, setVal] = useState(transform(settings[key] ?? ''));
  useEffect(() => { setVal(transform(settings[key] ?? '')); }, [settings, key]);
  return [val, setVal];
}

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [jobRunning, setJobRunning] = useState({});
  const [jobResult, setJobResult] = useState({});
  const [showMaintenancePreview, setShowMaintenancePreview] = useState(false);

  // Store section
  const [storeName, setStoreName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportWhatsapp, setSupportWhatsapp] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  // Commerce section
  const [taxRate, setTaxRate] = useState('');
  const [stdShipping, setStdShipping] = useState('');
  const [expShipping, setExpShipping] = useState('');
  const [freeThresh, setFreeThresh] = useState('');

  // Maintenance section
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  useEffect(() => {
    settingsService.getAll()
      .then(data => {
        setSettings(data);
        setStoreName(data.store_name ?? '');
        setSupportEmail(data.support_email ?? '');
        setSupportWhatsapp(data.support_whatsapp ?? '');
        setBusinessAddress(data.business_address ?? '');
        setTaxRate(data.tax_rate_percent ?? '12.5');
        setStdShipping(data.shipping_standard_ghs ?? '30');
        setExpShipping(data.shipping_express_ghs ?? '80');
        setFreeThresh(data.free_shipping_threshold_ghs ?? '1000');
        setMaintenanceMode(data.maintenance_mode === 'true');
        setMaintenanceMsg(data.maintenance_message ?? '');
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  async function savePairs(pairs, label) {
    const key = label;
    setSaving(s => ({ ...s, [key]: true }));
    try {
      for (const [k, v] of pairs) {
        await settingsService.put(k, String(v));
      }
      toast.success(`${label} saved`);
    } catch {
      toast.error(`Failed to save ${label}`);
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  }

  async function toggleFlag(flagKey, enabled) {
    setSettings(s => ({ ...s, [flagKey]: enabled ? 'true' : 'false' }));
    try {
      await settingsService.put(flagKey, enabled ? 'true' : 'false');
    } catch {
      toast.error('Failed to update flag');
      setSettings(s => ({ ...s, [flagKey]: enabled ? 'false' : 'true' }));
    }
  }

  async function saveMaintenance() {
    await savePairs([
      ['maintenance_mode', maintenanceMode ? 'true' : 'false'],
      ['maintenance_message', maintenanceMsg],
    ], 'Maintenance');
  }

  async function runJob(jobId) {
    setJobRunning(s => ({ ...s, [jobId]: true }));
    setJobResult(s => ({ ...s, [jobId]: null }));
    try {
      const result = await settingsService.runJob(jobId);
      setJobResult(s => ({ ...s, [jobId]: result }));
    } catch (err) {
      const msg = err?.response?.data?.error ?? 'Job failed';
      setJobResult(s => ({ ...s, [jobId]: { error: msg } }));
    } finally {
      setJobRunning(s => ({ ...s, [jobId]: false }));
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-10">
        {[1,2,3].map(i => <div key={i} className="skeleton h-40 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader title="Settings" subtitle="Store configuration and feature flags." />

      {/* ── Store ── */}
      <section className="card p-6">
        <SectionLabel>Store</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Store name" floating value={storeName} onChange={e => setStoreName(e.target.value)} />
          <Input label="Support email" floating type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
          <Input label="WhatsApp number" floating value={supportWhatsapp} onChange={e => setSupportWhatsapp(e.target.value)} />
          <Input label="Business address" floating value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} />
        </div>
        <div className="flex justify-end mt-4">
          <Button size="sm" loading={saving['Store']} onClick={() => savePairs([
            ['store_name', storeName],
            ['support_email', supportEmail],
            ['support_whatsapp', supportWhatsapp],
            ['business_address', businessAddress],
          ], 'Store')}>Save</Button>
        </div>
      </section>

      {/* ── Commerce ── */}
      <section className="card p-6">
        <SectionLabel>Commerce</SectionLabel>
        <div className="mb-3 flex items-center gap-2 text-sm text-muted">
          <span className="font-medium text-text">Currency:</span>
          <span>{settings.currency ?? 'GHS'}</span>
          <span className="text-xs">(contact engineering to change)</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Tax rate (%)" floating type="number" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
          <Input label="Standard shipping (GH₵)" floating type="number" value={stdShipping} onChange={e => setStdShipping(e.target.value)} />
          <Input label="Express shipping (GH₵)" floating type="number" value={expShipping} onChange={e => setExpShipping(e.target.value)} />
          <Input label="Free shipping over (GH₵)" floating type="number" value={freeThresh} onChange={e => setFreeThresh(e.target.value)} />
        </div>
        <div className="flex justify-end mt-4">
          <Button size="sm" loading={saving['Commerce']} onClick={() => savePairs([
            ['tax_rate_percent', taxRate],
            ['shipping_standard_ghs', stdShipping],
            ['shipping_express_ghs', expShipping],
            ['free_shipping_threshold_ghs', freeThresh],
          ], 'Commerce')}>Save</Button>
        </div>
      </section>

      {/* ── Feature Flags ── */}
      <section className="card p-6">
        <SectionLabel>Feature Flags</SectionLabel>
        <div className="divide-y divide-border">
          {FLAG_DEFS.map(({ key, label, desc }) => {
            const enabled = settings[key] !== 'false';
            return (
              <label key={key} className="flex cursor-pointer items-start gap-3 py-3">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={e => toggleFlag(key, e.target.checked)}
                  className="mt-0.5 accent-accent"
                />
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted">{desc}</div>
                </div>
                <span className={`ml-auto text-xs font-medium ${enabled ? 'text-success' : 'text-danger'}`}>
                  {enabled ? 'On' : 'Off'}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* ── Maintenance ── */}
      <section className="card p-6">
        <SectionLabel>Maintenance</SectionLabel>
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={maintenanceMode}
              onChange={e => setMaintenanceMode(e.target.checked)}
              className="accent-warning"
            />
            <span className="font-medium">Maintenance mode</span>
            <span className="text-xs text-muted">(shows a banner on the storefront; does not block access)</span>
          </label>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Banner message</label>
            <textarea
              className="input w-full resize-none text-sm"
              rows={2}
              value={maintenanceMsg}
              onChange={e => setMaintenanceMsg(e.target.value)}
              placeholder="We're undergoing scheduled maintenance. Some features may be temporarily unavailable."
            />
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" loading={saving['Maintenance']} onClick={saveMaintenance}>Save</Button>
            <button
              type="button"
              className="text-xs text-accent underline"
              onClick={() => setShowMaintenancePreview(p => !p)}
            >
              {showMaintenancePreview ? 'Hide preview' : 'Preview banner'}
            </button>
          </div>
          {showMaintenancePreview && (
            <div className="rounded border-2 border-dashed border-border p-3">
              <div className="rounded border-b-2 border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm text-warning">
                <span className="font-medium">Maintenance:</span>{' '}
                {maintenanceMsg || "We're undergoing scheduled maintenance. Some features may be temporarily unavailable."}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Scheduled Jobs ── */}
      <section className="card p-6">
        <SectionLabel>Scheduled Jobs</SectionLabel>
        <div className="divide-y divide-border">
          {JOB_DEFS.map(({ id, label, desc }) => {
            const result = jobResult[id];
            return (
              <div key={id} className="flex items-start gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted">{desc}</div>
                  {result && (
                    <div className={`mt-1 text-xs rounded px-2 py-1 inline-block ${result.error ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                      {result.error
                        ? result.error
                        : result.processed !== undefined
                          ? `Processed ${result.processed} carts, ${result.emails_sent} emails sent`
                          : result.found !== undefined
                            ? `Found ${result.found} preorder item(s) ready to ship`
                            : 'Done'}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  loading={jobRunning[id]}
                  onClick={() => runJob(id)}
                >
                  Run now
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

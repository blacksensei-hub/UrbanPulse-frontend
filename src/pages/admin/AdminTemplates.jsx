import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Button, Input } from '../../components/ui/index.jsx';
import { adminService } from '../../services/index.js';
import { formatRelativeDate } from '../../utils/format.js';

const CHANNELS = ['email', 'sms', 'whatsapp'];

const VARIABLES = [
  '{{customer_name}}', '{{customer_email}}', '{{customer_phone}}',
  '{{order_number}}', '{{order_total_ghs}}', '{{order_status}}',
  '{{store_credit_ghs}}', '{{tracking_number}}',
];

const STARTERS = [
  { name: 'Order shipped — tracking available', channel: 'email', subject: 'Your order {{order_number}} is on its way!', body: 'Hi {{customer_name}},\n\nGreat news — your order {{order_number}} has shipped!\n\nTracking number: {{tracking_number}}\n\nThanks for shopping with UrbanPulse.' },
  { name: 'Apology + store credit', channel: 'email', subject: 'We\'re sorry — here\'s a credit for you', body: 'Hi {{customer_name}},\n\nWe\'re sorry for the inconvenience. As a token of our apology, we\'ve added {{store_credit_ghs}} to your account.\n\nThank you for your patience.\n\nThe UrbanPulse Team' },
  { name: 'Order delayed', channel: 'email', subject: 'Update on your order {{order_number}}', body: 'Hi {{customer_name}},\n\nWe want to let you know that your order {{order_number}} has been slightly delayed. We\'re working to get it to you as soon as possible.\n\nWe apologise for the inconvenience.\n\nThe UrbanPulse Team' },
  { name: 'Order confirmed', channel: 'sms', body: 'UrbanPulse: Your order {{order_number}} is confirmed! We\'ll update you when it ships.' },
  { name: 'Out for delivery', channel: 'sms', body: 'UrbanPulse: Your order {{order_number}} is out for delivery today. Stay close!' },
  { name: 'Delivered — thank you', channel: 'sms', body: 'UrbanPulse: Hi {{customer_name}}, your order has been delivered. Thanks for shopping with us!' },
  { name: 'Confirm COD call', channel: 'whatsapp', body: 'Hi {{customer_name}} 👋, this is UrbanPulse confirming your cash-on-delivery order {{order_number}}. Can you confirm you\'ll be available to receive it? Thank you!' },
  { name: 'Order ready for pickup', channel: 'whatsapp', body: 'Hi {{customer_name}}, your order {{order_number}} is ready for pickup at our location. Please bring your order confirmation. See you soon!' },
  { name: 'Restock alert', channel: 'whatsapp', body: 'Hi! 👋 We wanted to let you know that an item you\'ve been waiting for is back in stock. Shop now at urbanpulse.com before it sells out!' },
];

const CHANNEL_STYLES = {
  email:     'bg-info/15 text-info',
  sms:       'bg-success/15 text-success',
  whatsapp:  'bg-accent/15 text-accent',
};

function TemplateModal({ open, onClose, template, onSaved }) {
  const bodyRef = useRef(null);
  const [name, setName]         = useState('');
  const [channel, setChannel]   = useState('email');
  const [subject, setSubject]   = useState('');
  const [body, setBody]         = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (open) {
      setName(template?.name ?? '');
      setChannel(template?.channel ?? 'email');
      setSubject(template?.subject ?? '');
      setBody(template?.body ?? '');
      setIsActive(template?.is_active ?? true);
    }
  }, [open, template]);

  function insertVariable(v) {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const next  = body.slice(0, start) + v + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + v.length, start + v.length);
    });
  }

  async function handleSave() {
    if (!name.trim() || !body.trim()) { toast.error('Name and body are required'); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), channel, body: body.trim(), is_active: isActive,
        ...(channel === 'email' && subject.trim() ? { subject: subject.trim() } : {}) };
      if (template?.id) {
        await adminService.updateTemplate(template.id, payload);
        toast.success('Template updated');
      } else {
        await adminService.createTemplate(payload);
        toast.success('Template created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={template?.id ? 'Edit template' : 'New template'} maxWidth="lg">
      <div className="space-y-4">
        <Input label="Name" floating value={name} onChange={e => setName(e.target.value)} />

        <label className="block">
          <span className="text-eyebrow text-muted mb-1.5 block">Channel</span>
          <select value={channel} onChange={e => setChannel(e.target.value)} className="select w-full">
            {CHANNELS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </label>

        {channel === 'email' && (
          <Input label="Subject" floating value={subject} onChange={e => setSubject(e.target.value)} />
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-eyebrow text-muted">Body</span>
            <div className="relative">
              <select
                defaultValue=""
                onChange={e => { if (e.target.value) insertVariable(e.target.value); e.target.value = ''; }}
                className="select text-xs py-1 h-7"
              >
                <option value="" disabled>Insert variable…</option>
                {VARIABLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={8}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm resize-y focus:border-accent focus:outline-none font-mono"
            placeholder="Message body…"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="accent-accent"
          />
          Active (appears in message composer)
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save template</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [installing, setInstalling] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await adminService.messageTemplates({ all: true });
      setTemplates(d.templates ?? []);
    } catch { toast.error('Could not load templates'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!window.confirm('Deactivate this template?')) return;
    try {
      await adminService.deleteTemplate(id);
      toast.success('Template deactivated');
      load();
    } catch { toast.error('Could not deactivate'); }
  }

  async function handleInstallStarters() {
    if (!window.confirm(`Install ${STARTERS.length} starter templates?`)) return;
    setInstalling(true);
    let ok = 0, fail = 0;
    for (const s of STARTERS) {
      try { await adminService.createTemplate({ ...s, is_active: true }); ok++; }
      catch { fail++; }
    }
    toast.success(`Installed ${ok} starter${ok !== 1 ? 's' : ''}${fail ? ` (${fail} failed)` : ''}`);
    setInstalling(false);
    load();
  }

  const tabs = ['all', ...CHANNELS];
  const visible = activeTab === 'all' ? templates : templates.filter(t => t.channel === activeTab);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Message Templates"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Settings', href: '/admin/settings' },
          { label: 'Message Templates' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleInstallStarters} loading={installing}>
              <Download className="h-4 w-4 mr-1" />
              Install starters
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              New template
            </Button>
          </div>
        }
      />

      {/* Channel tabs */}
      <div className="flex gap-1.5 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === t
                ? 'bg-accent text-white'
                : 'bg-surface border border-border text-muted hover:bg-highlight hover:text-text'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-10 text-center text-muted text-sm">
          No templates yet.{' '}
          <button className="text-accent underline" onClick={() => { setEditing(null); setModalOpen(true); }}>Create one</button>{' '}
          or{' '}
          <button className="text-accent underline" onClick={handleInstallStarters}>install starters</button>.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-medium text-left">Name</th>
                <th className="px-5 py-3 font-medium text-left">Channel</th>
                <th className="px-5 py-3 font-medium text-left hidden md:table-cell">Subject / Preview</th>
                <th className="px-5 py-3 font-medium text-left hidden md:table-cell">Status</th>
                <th className="px-5 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map(t => (
                <tr key={t.id} className="hover:bg-highlight transition-colors">
                  <td className="px-5 py-3 font-medium">{t.name}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-pill px-2.5 py-0.5 text-eyebrow capitalize ${CHANNEL_STYLES[t.channel] ?? 'bg-border text-muted'}`}>
                      {t.channel}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted hidden md:table-cell max-w-xs">
                    <div className="truncate">{t.subject || t.body?.slice(0, 80)}</div>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className={`rounded-pill px-2.5 py-0.5 text-eyebrow ${t.is_active ? 'bg-success/15 text-success' : 'bg-border text-muted'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditing(t); setModalOpen(true); }}
                        className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-highlight transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="grid h-7 w-7 place-items-center rounded-md text-error hover:bg-error/10 transition-colors"
                        title="Deactivate"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TemplateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        template={editing}
        onSaved={load}
      />
    </div>
  );
}

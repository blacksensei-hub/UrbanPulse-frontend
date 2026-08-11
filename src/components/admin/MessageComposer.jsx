import { useEffect, useState } from 'react';
import { Mail, Phone, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal.jsx';
import { Button } from '../ui/index.jsx';
import { adminService, settingsService } from '../../services/index.js';
import { formatCurrency } from '../../utils/format.js';

const CHANNELS = [
  { id: 'email',     label: 'Email',     icon: Mail },
  { id: 'sms',       label: 'SMS',       icon: Phone },
  { id: 'whatsapp',  label: 'WhatsApp',  icon: MessageSquare },
];

export default function MessageComposer({
  open, onClose, onSent,
  customerId, customerName, customerEmail, customerPhone,
  orderId, orderNumber, orderTotal, orders,
}) {
  const [channel, setChannel]             = useState('email');
  const [templateId, setTemplateId]       = useState('');
  const [templates, setTemplates]         = useState([]);
  const [subject, setSubject]             = useState('');
  const [body, setBody]                   = useState('');
  const [linkedOrderId, setLinkedOrderId] = useState('');
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [sending, setSending]             = useState(false);

  useEffect(() => {
    if (!open) return;
    adminService.messageTemplates().then(d => setTemplates(d.templates ?? [])).catch(() => {});
    settingsService.getAll().then(s => setSmsConfigured(!!s.sms_configured)).catch(() => setSmsConfigured(false));
    setChannel(customerEmail ? 'email' : (customerPhone ? 'whatsapp' : 'email'));
    setTemplateId('');
    setSubject('');
    setBody('');
    setLinkedOrderId('');
    setSending(false);
  }, [open, customerEmail, customerPhone]);

  // Respects what's actually usable rather than letting a pick silently no-op or
  // fail: SMS needs both a server-side API key AND a phone on file; WhatsApp
  // needs a phone; email needs an email.
  function getDisabledReason(chId) {
    if (chId === 'email' && !customerEmail) return 'No email on file';
    if (chId === 'sms') {
      if (!smsConfigured) return 'SMS is not configured on this server';
      if (!customerPhone) return 'No phone on file';
    }
    if (chId === 'whatsapp' && !customerPhone) return 'No phone on file';
    return null;
  }

  function handleChannelChange(ch) {
    setChannel(ch);
    setTemplateId('');
    setSubject('');
    setBody('');
  }

  function handleTemplateSelect(id) {
    setTemplateId(id);
    if (!id) { setSubject(''); setBody(''); return; }
    const tpl = templates.find(t => String(t.id) === String(id));
    if (tpl) { setSubject(tpl.subject ?? ''); setBody(tpl.body ?? ''); }
  }

  const recipient = channel === 'email' ? customerEmail : customerPhone;
  // orderId is a fixed prop when opened from an order's own page (AdminOrderDetail);
  // otherwise the admin may optionally pick one of the customer's orders here.
  const linkedOrder = !orderId && linkedOrderId ? orders?.find(o => String(o.id) === String(linkedOrderId)) : null;
  const effectiveOrderId     = orderId ?? linkedOrder?.id;
  const effectiveOrderNumber = orderId ? orderNumber : linkedOrder?.order_number;
  const effectiveOrderTotal  = orderId ? orderTotal  : linkedOrder?.total;

  async function handleSend() {
    if (!body.trim()) { toast.error('Message body is required'); return; }
    if (!recipient) {
      toast.error(`Customer has no ${channel === 'email' ? 'email' : 'phone number'} on file`);
      return;
    }
    setSending(true);
    try {
      const payload = {
        customer_id: customerId,
        channel,
        body,
        ...(templateId ? { template_id: Number(templateId) } : {}),
        ...(channel === 'email' && subject ? { subject } : {}),
        ...(effectiveOrderId ? { order_id: effectiveOrderId } : {}),
      };
      const result = await adminService.sendMessage(payload);
      // The request succeeding (200) doesn't mean delivery succeeded — the backend
      // records failed sends too. Refresh the history either way so a failed
      // attempt is never invisible, and never claim success it didn't have.
      onSent?.();
      if (result.status === 'failed') {
        toast.error(result.error ? `Send failed: ${result.error}` : 'Message failed to send');
        return; // keep the modal open so the admin can see the error and retry
      }
      if (channel === 'whatsapp' && result.wa_url) {
        window.open(result.wa_url, '_blank', 'noopener,noreferrer');
        toast.success('WhatsApp opened — message logged');
      } else {
        toast.success('Message sent');
      }
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  const filteredTemplates = templates.filter(t => t.channel === channel);
  const channelDisabled = getDisabledReason(channel);

  return (
    <Modal open={open} onClose={onClose} title="Send message" maxWidth="lg">
      <div className="space-y-4">
        {/* Channel selector */}
        <div>
          <label className="text-eyebrow text-muted mb-2 block">Channel</label>
          <div className="flex gap-2">
            {CHANNELS.map(ch => {
              const reason = getDisabledReason(ch.id);
              return (
                <button
                  key={ch.id}
                  type="button"
                  disabled={!!reason}
                  onClick={() => handleChannelChange(ch.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    channel === ch.id
                      ? 'border-accent bg-accent/10 text-accent'
                      : reason
                        ? 'border-border text-muted opacity-40 cursor-not-allowed'
                        : 'border-border text-muted hover:bg-highlight'
                  }`}
                >
                  <ch.icon className="h-4 w-4" />
                  {ch.label}
                </button>
              );
            })}
          </div>
          {CHANNELS.some(ch => getDisabledReason(ch.id)) && (
            <div className="mt-2 space-y-0.5">
              {CHANNELS.filter(ch => getDisabledReason(ch.id)).map(ch => (
                <p key={ch.id} className="text-xs text-muted">{ch.label}: {getDisabledReason(ch.id)}</p>
              ))}
            </div>
          )}
        </div>

        {/* Recipient — read-only, always the customer's own contact info */}
        <div>
          <span className="text-eyebrow text-muted mb-1.5 block">Recipient</span>
          <div className="input bg-highlight text-muted cursor-not-allowed">
            {recipient || '—'}
          </div>
        </div>

        {/* Template dropdown */}
        {filteredTemplates.length > 0 && (
          <label className="block">
            <span className="text-eyebrow text-muted mb-1.5 block">Template (optional)</span>
            <select
              value={templateId}
              onChange={e => handleTemplateSelect(e.target.value)}
              className="select w-full"
            >
              <option value="">— No template —</option>
              {filteredTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        )}

        {/* Subject (email only) */}
        {channel === 'email' && (
          <label className="block">
            <span className="text-eyebrow text-muted mb-1.5 block">Subject</span>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="input w-full"
            />
          </label>
        )}

        {/* Body */}
        <label className="block">
          <span className="text-eyebrow text-muted mb-1.5 block">Message</span>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm resize-none focus:border-accent focus:outline-none"
            placeholder="Write your message…"
          />
          <p className="mt-1 text-xs text-muted">
            Variables like <code className="font-mono">{'{{customer_name}}'}</code> are substituted at send time.
          </p>
        </label>

        {/* Optional order link (only when not already fixed to a specific order) */}
        {!orderId && orders?.length > 0 && (
          <label className="block">
            <span className="text-eyebrow text-muted mb-1.5 block">Link to order (optional)</span>
            <select
              value={linkedOrderId}
              onChange={e => setLinkedOrderId(e.target.value)}
              className="select w-full"
            >
              <option value="">— No order —</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>{o.order_number} · {formatCurrency(o.total)}</option>
              ))}
            </select>
          </label>
        )}

        {/* Context hint */}
        {effectiveOrderNumber && (
          <div className="rounded-lg bg-highlight px-3 py-2 text-xs text-muted">
            Context: Order <span className="font-mono font-semibold">{effectiveOrderNumber}</span>
            {effectiveOrderTotal ? ` · ${formatCurrency(effectiveOrderTotal)}` : ''}
          </div>
        )}

        {/* WhatsApp notice */}
        {channel === 'whatsapp' && !channelDisabled && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
            Opens WhatsApp to send manually. The message will be logged after you click send.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} loading={sending} disabled={!body.trim() || !!channelDisabled}>
            {channel === 'whatsapp' ? 'Open in WhatsApp' : 'Send'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

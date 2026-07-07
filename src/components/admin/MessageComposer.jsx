import { useEffect, useState } from 'react';
import { Mail, Phone, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal.jsx';
import { Button, Input } from '../ui/index.jsx';
import { adminService } from '../../services/index.js';
import { formatCurrency } from '../../utils/format.js';

const CHANNELS = [
  { id: 'email',     label: 'Email',     icon: Mail },
  { id: 'sms',       label: 'SMS',       icon: Phone },
  { id: 'whatsapp',  label: 'WhatsApp',  icon: MessageSquare },
];

export default function MessageComposer({
  open, onClose,
  customerId, customerName, customerEmail, customerPhone,
  orderId, orderNumber, orderTotal,
}) {
  const [channel, setChannel]       = useState('email');
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates]   = useState([]);
  const [subject, setSubject]       = useState('');
  const [body, setBody]             = useState('');
  const [recipient, setRecipient]   = useState('');
  const [sending, setSending]       = useState(false);

  useEffect(() => {
    if (!open) return;
    adminService.messageTemplates().then(d => setTemplates(d.templates ?? [])).catch(() => {});
    setChannel('email');
    setTemplateId('');
    setSubject('');
    setBody('');
    setRecipient(customerEmail ?? '');
    setSending(false);
  }, [open, customerEmail]);

  function handleChannelChange(ch) {
    setChannel(ch);
    setTemplateId('');
    setSubject('');
    setBody('');
    setRecipient(ch === 'email' ? (customerEmail ?? '') : (customerPhone ?? ''));
  }

  function handleTemplateSelect(id) {
    setTemplateId(id);
    if (!id) { setSubject(''); setBody(''); return; }
    const tpl = templates.find(t => String(t.id) === String(id));
    if (tpl) { setSubject(tpl.subject ?? ''); setBody(tpl.body ?? ''); }
  }

  async function handleSend() {
    if (!body.trim()) { toast.error('Message body is required'); return; }
    setSending(true);
    try {
      const payload = {
        customer_id: customerId,
        channel,
        body,
        ...(templateId ? { template_id: Number(templateId) } : {}),
        ...(channel === 'email' && subject ? { subject } : {}),
        ...(orderId ? { order_id: orderId } : {}),
        ...(recipient !== (channel === 'email' ? customerEmail : customerPhone)
          ? { recipient_override: recipient } : {}),
      };
      const result = await adminService.sendMessage(payload);
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

  return (
    <Modal open={open} onClose={onClose} title="Send message" maxWidth="lg">
      <div className="space-y-4">
        {/* Channel selector */}
        <div>
          <label className="text-eyebrow text-muted mb-2 block">Channel</label>
          <div className="flex gap-2">
            {CHANNELS.map(ch => (
              <button
                key={ch.id}
                onClick={() => handleChannelChange(ch.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  channel === ch.id
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-muted hover:bg-highlight'
                }`}
              >
                <ch.icon className="h-4 w-4" />
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recipient */}
        <Input
          label="Recipient"
          floating
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
          placeholder={channel === 'email' ? 'email@example.com' : '+233...'}
        />

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
          <Input
            label="Subject"
            floating
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
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

        {/* Context hint */}
        {orderNumber && (
          <div className="rounded-lg bg-highlight px-3 py-2 text-xs text-muted">
            Context: Order <span className="font-mono font-semibold">{orderNumber}</span>
            {orderTotal ? ` · ${formatCurrency(orderTotal)}` : ''}
          </div>
        )}

        {/* WhatsApp notice */}
        {channel === 'whatsapp' && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
            Opens WhatsApp to send manually. The message will be logged after you click send.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} loading={sending} disabled={!body.trim()}>
            {channel === 'whatsapp' ? 'Open in WhatsApp' : 'Send'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

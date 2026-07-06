import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreVertical, Ban, Shield, Mail, Phone, Pin, Pencil, Trash2,
  ShoppingBag, RotateCcw, Star, Heart, CreditCard, Plus, Check,
  X, ChevronRight, Eye, Flag, Send, RefreshCw, Key, MessageSquare, Award,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { adminService, orderService } from '../../services/index.js';
import { formatCurrency, formatDate, formatRelativeDate, cn } from '../../utils/format.js';
import { Button, Input } from '../../components/ui/index.jsx';
import Modal from '../../components/ui/Modal.jsx';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import BottomSheet from '../../components/admin/BottomSheet.jsx';
import MessageComposer from '../../components/admin/MessageComposer.jsx';
import { invalidateFlags } from '../../stores/customerFlagStore.js';

const ORDER_STATUS_STYLES = {
  pending:               'bg-warning/15 text-warning',
  awaiting_confirmation: 'bg-info/15 text-info',
  paid:                  'bg-info/15 text-info',
  processing:            'bg-info/15 text-info',
  shipped:               'bg-accent/15 text-accent',
  delivered:             'bg-success/15 text-success',
  cancelled:             'bg-error/15 text-error',
  refunded:              'bg-muted/15 text-muted',
};

const RETURN_STATUS_STYLES = {
  requested: 'bg-warning/15 text-warning',
  approved:  'bg-info/15 text-info',
  rejected:  'bg-error/15 text-error',
  received:  'bg-accent/15 text-accent',
  refunded:  'bg-success/15 text-success',
};

const TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };

const TABS = [
  { id: 'orders',   label: 'Orders',       icon: ShoppingBag },
  { id: 'returns',  label: 'Returns',      icon: RotateCcw },
  { id: 'reviews',  label: 'Reviews',      icon: Star },
  { id: 'wishlist', label: 'Wishlist',     icon: Heart },
  { id: 'credit',   label: 'Store Credit', icon: CreditCard },
  { id: 'loyalty',  label: 'Loyalty',      icon: Award },
  { id: 'messages', label: 'Messages',     icon: Mail },
];

const FLAG_PRESETS = [
  { flag: 'vip',              label: 'VIP',             color: '#7c3aed' },
  { flag: 'watch',            label: 'Watch',           color: '#d97706' },
  { flag: 'chargeback_risk',  label: 'Chargeback risk', color: '#dc2626' },
  { flag: 'wholesale',        label: 'Wholesale',       color: '#0284c7' },
  { flag: 'press',            label: 'Press',           color: '#059669' },
];

// ── Adjust Credit Modal ──────────────────────────────────────────

function AdjustCreditModal({ open, onClose, customerId, currentBalance, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Manual adjustment');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const parsed = parseFloat(amount) || 0;
  const newBalance = Math.max(0, currentBalance + parsed);
  const actualDelta = newBalance - currentBalance;
  const willFloor = parsed < 0 && newBalance === 0 && parsed + currentBalance < 0;

  async function submit() {
    if (!amount) return;
    setSaving(true);
    try {
      await adminService.customer.adjustCredit(customerId, { amount_ghs: parsed, reason, note });
      toast.success('Credit adjusted');
      onSuccess();
      onClose();
      setAmount(''); setNote('');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Adjustment failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Adjust store credit">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-highlight px-4 py-3">
          <span className="text-sm text-muted">Current balance</span>
          <span className="font-display text-lg font-bold tabular-nums">{formatCurrency(currentBalance)}</span>
        </div>

        <Input
          label="Amount (GH₵, positive or negative)"
          floating
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <label className="block">
          <span className="text-eyebrow text-muted mb-1.5 block">Reason</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="select w-full"
          >
            <option>Manual adjustment</option>
            <option>Goodwill</option>
            <option>Refund correction</option>
            <option>Other</option>
          </select>
        </label>

        <Input
          label="Note (optional)"
          floating
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {amount !== '' && (
          <div className="rounded-lg border border-border px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">New balance</span>
              <span className="font-display font-bold tabular-nums">{formatCurrency(newBalance)}</span>
            </div>
            {willFloor && (
              <p className="mt-1.5 text-xs text-warning">Balance cannot go below GH₵ 0. Will be capped.</p>
            )}
            {actualDelta === 0 && parsed !== 0 && (
              <p className="mt-1.5 text-xs text-muted">No change (balance is already GH₵ 0).</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!amount || actualDelta === 0}>
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Adjust Loyalty Points Modal ──────────────────────────────────

function AdjustLoyaltyModal({ open, onClose, customerId, currentBalance, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Manual adjustment');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const parsed = parseInt(amount, 10) || 0;
  const newBalance = Math.max(0, currentBalance + parsed);
  const actualDelta = newBalance - currentBalance;
  const willFloor = parsed < 0 && newBalance === 0 && parsed + currentBalance < 0;

  async function submit() {
    if (!amount) return;
    setSaving(true);
    try {
      await adminService.customer.adjustLoyalty(customerId, { delta: parsed, reason, note });
      toast.success('Points adjusted');
      onSuccess();
      onClose();
      setAmount(''); setNote('');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Adjustment failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Adjust loyalty points">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-highlight px-4 py-3">
          <span className="text-sm text-muted">Current balance</span>
          <span className="font-display text-lg font-bold tabular-nums">{currentBalance} pts</span>
        </div>

        <Input
          label="Amount (points, positive or negative)"
          floating
          type="number"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <label className="block">
          <span className="text-eyebrow text-muted mb-1.5 block">Reason</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="select w-full"
          >
            <option>Manual adjustment</option>
            <option>Goodwill</option>
            <option>Correction</option>
            <option>Other</option>
          </select>
        </label>

        <Input
          label="Note (optional)"
          floating
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {amount !== '' && (
          <div className="rounded-lg border border-border px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">New balance</span>
              <span className="font-display font-bold tabular-nums">{newBalance} pts</span>
            </div>
            {willFloor && (
              <p className="mt-1.5 text-xs text-warning">Balance cannot go below 0. Will be capped.</p>
            )}
            {actualDelta === 0 && parsed !== 0 && (
              <p className="mt-1.5 text-xs text-muted">No change (balance is already 0).</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!amount || actualDelta === 0}>
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Apology + Credit Modal ───────────────────────────────────────

function ApologyModal({ open, onClose, customerId, customerEmail, customerName, currentBalance, onSuccess }) {
  const [amount, setAmount]   = useState('');
  const [reason, setReason]   = useState('');
  const [sending, setSending] = useState(false);

  async function submit() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { toast.error('Enter a valid amount'); return; }
    if (!reason.trim()) { toast.error('Reason is required'); return; }
    setSending(true);
    try {
      await adminService.customer.adjustCredit(customerId, { amount_ghs: parsed, reason: reason.trim(), note: 'Apology credit' });
      const apologyBody = `Hi ${customerName ?? 'there'},\n\nWe sincerely apologise for the inconvenience. As a token of our apology, we've added GH₵ ${parsed.toFixed(2)} to your store credit.\n\nThank you for your patience.\n\nThe UrbanPulse Team`;
      await adminService.sendMessage({
        customer_id: customerId,
        channel: 'email',
        subject: 'We\'re sorry — here\'s a store credit for you',
        body: apologyBody,
      });
      toast.success('Credit added and apology email sent');
      onSuccess();
      onClose();
      setAmount(''); setReason('');
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Action failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Apologize + add store credit">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Adds store credit and sends an apology email to <strong>{customerEmail}</strong>.
        </p>
        <Input label="Store credit amount (GH₵)" floating type="number" step="0.01" min="0.01"
          value={amount} onChange={e => setAmount(e.target.value)} />
        <Input label="Reason (internal)" floating value={reason} onChange={e => setReason(e.target.value)}
          placeholder="e.g. Delayed order, wrong item…" />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={sending} disabled={!amount || !reason.trim()}>
            Add credit + send email
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Notes Panel ──────────────────────────────────────────────────

function NotesPanel({ customerId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftPinned, setDraftPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  async function loadNotes() {
    setLoading(true);
    try { setNotes(await adminService.customer.notes(customerId)); }
    catch { setNotes([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadNotes(); }, [customerId]);

  async function addNote() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await adminService.customer.addNote(customerId, { note: draft.trim(), pinned: draftPinned });
      setDraft(''); setDraftPinned(false); setAdding(false);
      loadNotes();
    } catch { toast.error('Could not add note'); }
    finally { setSaving(false); }
  }

  async function togglePin(n) {
    try {
      await adminService.customer.updateNote(customerId, n.id, { pinned: !n.pinned });
      loadNotes();
    } catch { toast.error('Could not update note'); }
  }

  async function saveEdit(n) {
    if (!editText.trim()) return;
    try {
      await adminService.customer.updateNote(customerId, n.id, { note: editText.trim() });
      setEditingId(null);
      loadNotes();
    } catch { toast.error('Could not update note'); }
  }

  async function deleteNote(n) {
    if (!window.confirm('Delete this note?')) return;
    try {
      await adminService.customer.deleteNote(customerId, n.id);
      loadNotes();
    } catch { toast.error('Could not delete note'); }
  }

  const pinned = notes.filter(n => n.pinned);
  const regular = notes.filter(n => !n.pinned);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-eyebrow text-muted uppercase tracking-widest">Notes</div>
        <Button size="sm-dense" variant="outline" onClick={() => setAdding(v => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add note
        </Button>
      </div>

      {/* Add note form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2 rounded-lg border border-border p-3"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') addNote(); }}
              rows={3}
              placeholder="Add a note… (Cmd+Enter to save)"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm resize-none focus:border-accent focus:outline-none"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftPinned}
                  onChange={(e) => setDraftPinned(e.target.checked)}
                  className="accent-accent"
                />
                Pin note
              </label>
              <div className="flex gap-2">
                <Button size="sm-dense" variant="ghost" onClick={() => { setAdding(false); setDraft(''); }}>Cancel</Button>
                <Button size="sm-dense" loading={saving} onClick={addNote}>Save</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-2">
          {[1,2].map(i => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted italic">No notes yet.</p>
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="space-y-2">
              {pinned.map(n => <NoteItem key={n.id} note={n} onPin={togglePin} onEdit={(n) => { setEditingId(n.id); setEditText(n.note); }} onDelete={deleteNote} editingId={editingId} editText={editText} setEditText={setEditText} onSaveEdit={saveEdit} />)}
            </div>
          )}
          {regular.length > 0 && (
            <div className="space-y-2">
              {regular.map(n => <NoteItem key={n.id} note={n} onPin={togglePin} onEdit={(n) => { setEditingId(n.id); setEditText(n.note); }} onDelete={deleteNote} editingId={editingId} editText={editText} setEditText={setEditText} onSaveEdit={saveEdit} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NoteItem({ note: n, onPin, onEdit, onDelete, editingId, editText, setEditText, onSaveEdit }) {
  const isEditing = editingId === n.id;
  return (
    <div className={`rounded-lg border p-3 text-sm ${n.pinned ? 'border-accent/30 bg-accent/5' : 'border-border bg-bg'}`}>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm resize-none focus:border-accent focus:outline-none"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm-dense" onClick={() => onSaveEdit(n)}>Save</Button>
            <Button size="sm-dense" variant="ghost" onClick={() => setEditText && setEditText('')}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="flex-1 whitespace-pre-wrap">{n.note}</p>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onPin(n)} className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${n.pinned ? 'text-accent hover:bg-accent/10' : 'text-muted hover:bg-highlight'}`} title={n.pinned ? 'Unpin' : 'Pin'}>
                <Pin className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onEdit(n)} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-highlight transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(n)} className="grid h-7 w-7 place-items-center rounded-md text-error hover:bg-error/10 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="mt-1.5 text-xs text-muted">
            {n.author_name} · {formatRelativeDate(n.created_at)}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [tabData, setTabData] = useState({ orders: null, returns: null, reviews: null, wishlist: null, credit: null, loyalty: null, messages: null });
  const [tabLoading, setTabLoading] = useState({});
  const [activeTab, setActiveTab] = useState('orders');

  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef(null);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [loyaltyModalOpen, setLoyaltyModalOpen] = useState(false);
  const [apologyOpen, setApologyOpen]         = useState(false);
  const [msgComposerOpen, setMsgComposerOpen] = useState(false);

  // Flags
  const [flags, setFlags]             = useState([]);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagForm, setFlagForm]       = useState({ flag: '', label: '', color: '#6366f1' });
  const [flagSaving, setFlagSaving]   = useState(false);

  async function loadProfile() {
    setLoading(true);
    try { setProfile(await adminService.customer.get(id)); }
    catch { toast.error('Customer not found'); navigate('/admin/users'); }
    finally { setLoading(false); }
  }

  async function loadFlags() {
    try {
      const d = await adminService.customer.flags(id);
      setFlags(d.flags ?? []);
    } catch { setFlags([]); }
  }

  useEffect(() => { loadProfile(); loadFlags(); }, [id]);

  // Close desktop actions dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) setActionsOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function loadTab(tab) {
    if (tabData[tab] !== null) return; // already loaded
    setTabLoading(p => ({ ...p, [tab]: true }));
    try {
      let data;
      if (tab === 'orders')   data = await adminService.customer.orders(id);
      if (tab === 'returns')  data = await adminService.customer.returns(id);
      if (tab === 'reviews')  data = await adminService.customer.reviews(id);
      if (tab === 'wishlist') data = await adminService.customer.wishlist(id);
      if (tab === 'credit')   data = await adminService.customer.creditLedger(id);
      if (tab === 'loyalty')  data = await adminService.customer.loyaltyLedger(id);
      if (tab === 'messages') data = await adminService.customer.messages(id);
      setTabData(p => ({ ...p, [tab]: data }));
    } catch { toast.error(`Could not load ${tab}`); }
    finally { setTabLoading(p => ({ ...p, [tab]: false })); }
  }

  async function addFlag() {
    const flag = flagForm.flag.trim() || 'custom';
    const label = flagForm.label.trim() || flag;
    setFlagSaving(true);
    try {
      await adminService.customer.addFlag(id, { flag, label, color: flagForm.color });
      invalidateFlags(Number(id));
      loadFlags();
      setFlagModalOpen(false);
      setFlagForm({ flag: '', label: '', color: '#6366f1' });
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Could not add flag');
    } finally {
      setFlagSaving(false);
    }
  }

  async function removeFlag(flagId) {
    try {
      await adminService.customer.removeFlag(id, flagId);
      invalidateFlags(Number(id));
      loadFlags();
    } catch { toast.error('Could not remove flag'); }
  }

  function selectTab(tab) {
    setActiveTab(tab);
    loadTab(tab);
    document.getElementById(`tab-section-${tab}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => { loadTab('orders'); }, [id]);

  async function toggleBlock() {
    if (!profile) return;
    const { user } = profile;
    try {
      if (user.is_blocked) await adminService.customer.unblock(id);
      else await adminService.customer.block(id);
      toast.success(user.is_blocked ? 'Customer unblocked' : 'Customer blocked');
      loadProfile();
    } catch { toast.error('Could not update status'); }
    setActionsOpen(false);
  }

  async function toggleRole() {
    if (!profile) return;
    const { user } = profile;
    const newRole = user.role === 'admin' ? 'customer' : 'admin';
    try {
      await adminService.customer.setRole(id, newRole);
      toast.success(`Role changed to ${newRole}`);
      loadProfile();
    } catch { toast.error('Could not change role'); }
    setActionsOpen(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-20 w-full rounded-xl" />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!profile) return null;
  const { user, stats } = profile;

  const statTiles = [
    { label: 'Total spent',   value: formatCurrency(stats.total_spent_ghs),   sub: `${stats.paid_orders} paid orders`,           tab: 'orders' },
    { label: 'Orders',        value: stats.total_orders,                       sub: `Avg ${formatCurrency(stats.average_order_ghs)}`, tab: 'orders' },
    { label: 'Store credit',  value: formatCurrency(stats.store_credit_balance_ghs), sub: 'Tap to adjust',                       tab: 'credit' },
    { label: 'Loyalty points', value: user.loyalty_points ?? 0,                sub: `${TIER_LABELS[user.loyalty_tier] ?? 'Bronze'} tier`, tab: 'loyalty' },
    { label: 'Returns',       value: stats.returns_count,                      sub: '',                                           tab: 'returns' },
    { label: 'Reviews',       value: stats.reviews_count,                      sub: '',                                           tab: 'reviews' },
    { label: 'Member since',  value: formatDate(user.created_at),              sub: user.last_login ? `Last login ${formatRelativeDate(user.last_login)}` : 'Never logged in', tab: null },
  ];

  const actions = [
    {
      label: 'Send message',
      icon: Send,
      onClick: () => { setMsgComposerOpen(true); setActionsOpen(false); },
    },
    {
      label: 'Resend last confirmation',
      icon: RefreshCw,
      onClick: async () => {
        setActionsOpen(false);
        try {
          const d = await adminService.customer.resendConfirmation(id);
          toast.success(`Confirmation resent for ${d.order_number}`);
        } catch (err) {
          toast.error(err?.response?.data?.error ?? 'Could not resend');
        }
      },
    },
    {
      label: 'Download last receipt',
      icon: ShoppingBag,
      onClick: () => {
        setActionsOpen(false);
        const orders = tabData.orders;
        const lastPaid = Array.isArray(orders)
          ? orders.find(o => o.payment_status === 'paid' || o.status === 'delivered')
          : null;
        if (!lastPaid) { toast.error('No paid order found'); return; }
        orderService.downloadReceipt(lastPaid.id, lastPaid.order_number);
      },
    },
    {
      label: 'Apologize + store credit',
      icon: Heart,
      onClick: () => { setApologyOpen(true); setActionsOpen(false); },
    },
    {
      label: 'Reset password (send link)',
      icon: Key,
      onClick: async () => {
        setActionsOpen(false);
        try {
          await adminService.customer.resetPassword(id);
          toast.success('Password reset email sent');
        } catch (err) {
          toast.error(err?.response?.data?.error ?? 'Could not send reset email');
        }
      },
    },
    { label: 'Adjust store credit', icon: CreditCard, onClick: () => { setCreditModalOpen(true); setActionsOpen(false); } },
    { label: 'Adjust loyalty points', icon: Award, onClick: () => { setLoyaltyModalOpen(true); setActionsOpen(false); } },
    {
      label: 'View as customer',
      icon: Eye,
      onClick: async () => {
        try {
          const data = await adminService.viewAs(user.id);
          localStorage.setItem('urbanpulse-view-as-token', data.token);
          localStorage.setItem('urbanpulse-view-as-name', data.customer.name);
          setActionsOpen(false);
          window.open('/', '_blank');
        } catch {
          toast.error('Could not start view-as session');
        }
      },
    },
    { label: user.role === 'admin' ? 'Demote to customer' : 'Promote to admin', icon: Shield, onClick: toggleRole },
    { label: user.is_blocked ? 'Unblock customer' : 'Block customer', icon: Ban, onClick: toggleBlock, danger: !user.is_blocked },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1">
          <Link to="/admin/users" className="text-eyebrow text-muted hover:text-text transition-colors">Admin</Link>
          <span className="text-eyebrow text-muted">/</span>
          <Link to="/admin/users" className="text-eyebrow text-muted hover:text-text transition-colors">Customers</Link>
          <span className="text-eyebrow text-muted">/</span>
          <span className="text-eyebrow text-muted">{user.name}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-h1 font-bold leading-tight truncate">{user.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>{user.email}</span>
              {user.phone && <span>· {user.phone}</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={cn('rounded-pill px-2.5 py-0.5 text-eyebrow', user.is_blocked ? 'bg-error/15 text-error' : 'bg-success/15 text-success')}>
                {user.is_blocked ? 'Blocked' : 'Active'}
              </span>
              <span className={cn('rounded-pill px-2.5 py-0.5 text-eyebrow', user.role === 'admin' ? 'bg-accent/15 text-accent' : 'bg-surface border border-border text-muted')}>
                {user.role}
              </span>
              {user.totp_enabled && (
                <span className="rounded-pill bg-success/15 px-2.5 py-0.5 text-eyebrow text-success">2FA on</span>
              )}
            </div>
          </div>

          {/* Desktop actions dropdown */}
          <div className="relative" ref={actionsRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionsOpen(v => !v)}
              aria-label="Customer actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            <AnimatePresence>
              {actionsOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-border bg-surface shadow-float overflow-hidden"
                >
                  {actions.map((a, i) => (
                    a.href
                      ? <a key={i} href={a.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-highlight transition-colors">
                          <a.icon className="h-4 w-4 text-muted shrink-0" />{a.label}
                        </a>
                      : <button key={i} onClick={a.onClick} className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-highlight transition-colors ${a.danger ? 'text-error' : ''}`}>
                          <a.icon className="h-4 w-4 text-muted shrink-0" />{a.label}
                        </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {statTiles.map((t) => (
          <button
            key={t.label}
            onClick={() => t.tab && selectTab(t.tab)}
            className={`card p-3 text-left transition-colors ${t.tab ? 'hover:bg-highlight cursor-pointer' : 'cursor-default'}`}
          >
            <div className="text-eyebrow text-muted mb-1">{t.label}</div>
            <div className="font-display text-base font-bold leading-tight tabular-nums truncate">{t.value}</div>
            {t.sub && <div className="mt-0.5 text-xs text-muted truncate">{t.sub}</div>}
          </button>
        ))}
      </div>

      {/* Flags section */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-eyebrow text-muted uppercase tracking-widest">
            <Flag className="h-3.5 w-3.5" /> Flags
          </div>
          <Button size="sm-dense" variant="outline" onClick={() => setFlagModalOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add flag
          </Button>
        </div>
        {flags.length === 0 ? (
          <p className="text-sm text-muted italic">No flags set.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {flags.map(f => (
              <span
                key={f.id}
                style={{ background: f.color ?? '#6366f1' }}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold text-white"
              >
                {f.label ?? f.flag}
                <button
                  onClick={() => removeFlag(f.id)}
                  className="hover:opacity-70 transition-opacity ml-0.5"
                  title="Remove flag"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notes panel */}
      <NotesPanel customerId={id} />

      {/* Tabs */}
      <div className="sticky top-0 z-10 flex gap-1.5 overflow-x-auto bg-bg py-2 -mx-4 px-4 md:mx-0 md:px-0 md:static md:bg-transparent">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
              activeTab === t.id ? 'bg-accent text-white' : 'bg-surface border border-border text-muted hover:bg-highlight hover:text-text'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab sections */}
      {TABS.map((t) => (
        <div key={t.id} id={`tab-section-${t.id}`}>
          {activeTab === t.id && (
            <TabSection
              tab={t.id}
              data={tabData[t.id]}
              loading={!!tabLoading[t.id]}
              stats={stats}
              user={user}
              onAdjustCredit={() => setCreditModalOpen(true)}
              onAdjustLoyalty={() => setLoyaltyModalOpen(true)}
            />
          )}
        </div>
      ))}

      {/* Adjust credit modal */}
      <AdjustCreditModal
        open={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        customerId={id}
        currentBalance={parseFloat(stats.store_credit_balance_ghs) || 0}
        onSuccess={() => {
          loadProfile();
          setTabData(p => ({ ...p, credit: null }));
          loadTab('credit');
        }}
      />

      {/* Adjust loyalty points modal */}
      <AdjustLoyaltyModal
        open={loyaltyModalOpen}
        onClose={() => setLoyaltyModalOpen(false)}
        customerId={id}
        currentBalance={user.loyalty_points ?? 0}
        onSuccess={() => {
          loadProfile();
          setTabData(p => ({ ...p, loyalty: null }));
          loadTab('loyalty');
        }}
      />

      {/* Apology + credit modal */}
      <ApologyModal
        open={apologyOpen}
        onClose={() => setApologyOpen(false)}
        customerId={id}
        customerEmail={user.email}
        customerName={user.name}
        currentBalance={parseFloat(stats.store_credit_balance_ghs) || 0}
        onSuccess={() => {
          loadProfile();
          setTabData(p => ({ ...p, credit: null, messages: null }));
          loadTab('credit');
        }}
      />

      {/* Message composer */}
      <MessageComposer
        open={msgComposerOpen}
        onClose={() => setMsgComposerOpen(false)}
        customerId={Number(id)}
        customerName={user.name}
        customerEmail={user.email}
        customerPhone={user.phone}
      />

      {/* Add flag modal */}
      <Modal open={flagModalOpen} onClose={() => setFlagModalOpen(false)} title="Add flag">
        <div className="space-y-4">
          <div>
            <p className="text-eyebrow text-muted mb-2">Quick presets</p>
            <div className="flex flex-wrap gap-2">
              {FLAG_PRESETS.map(p => (
                <button
                  key={p.flag}
                  onClick={() => setFlagForm({ flag: p.flag, label: p.label, color: p.color })}
                  className={`rounded-full px-3 py-1 text-sm font-semibold text-white transition-opacity hover:opacity-80 ${flagForm.flag === p.flag ? 'ring-2 ring-offset-2 ring-accent' : ''}`}
                  style={{ background: p.color }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Custom label"
            floating
            value={flagForm.label}
            onChange={e => setFlagForm(f => ({ ...f, label: e.target.value, flag: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
            placeholder="e.g. Loyalty member"
          />
          <label className="flex items-center gap-3 text-sm">
            <span className="text-eyebrow text-muted">Color</span>
            <input
              type="color"
              value={flagForm.color}
              onChange={e => setFlagForm(f => ({ ...f, color: e.target.value }))}
              className="h-8 w-14 cursor-pointer rounded border-none bg-transparent"
            />
            <span
              className="rounded-full px-3 py-0.5 text-sm font-semibold text-white"
              style={{ background: flagForm.color }}
            >
              {flagForm.label || 'Preview'}
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setFlagModalOpen(false)}>Cancel</Button>
            <Button onClick={addFlag} loading={flagSaving} disabled={!flagForm.label.trim()}>Add flag</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Tab Section ──────────────────────────────────────────────────

function TabSection({ tab, data, loading, stats, user, onAdjustCredit, onAdjustLoyalty }) {
  if (loading || data === null) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-4 w-48" />
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'orders')   return <OrdersTab orders={data} />;
  if (tab === 'returns')  return <ReturnsTab returns={data} />;
  if (tab === 'reviews')  return <ReviewsTab reviews={data} />;
  if (tab === 'wishlist') return <WishlistTab items={data} />;
  if (tab === 'credit')   return <CreditTab entries={data} balance={stats.store_credit_balance_ghs} onAdjust={onAdjustCredit} />;
  if (tab === 'loyalty')  return <LoyaltyTab entries={data} user={user} onAdjust={onAdjustLoyalty} />;
  if (tab === 'messages') return <MessagesTab data={data} />;
  return null;
}

function OrdersTab({ orders }) {
  if (!orders?.length) return <EmptyState icon={ShoppingBag} label="No orders yet" />;
  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {orders.map(o => (
          <div key={o.id} className="card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="font-mono text-sm font-semibold">{o.order_number}</div>
              <span className={cn('rounded-pill px-2 py-0.5 text-eyebrow shrink-0', ORDER_STATUS_STYLES[o.status] ?? 'bg-border text-muted')}>{o.status}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-display font-bold text-text tabular-nums">{formatCurrency(o.total)}</span>
              <span>·</span><span>{o.item_count} item{o.item_count !== 1 ? 's' : ''}</span>
              <span>·</span><span>{formatRelativeDate(o.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Desktop table */}
      <div className="hidden md:block card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Order</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Total</th>
              <th className="px-5 py-3 font-medium text-right">Items</th>
              <th className="px-5 py-3 font-medium">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-highlight transition-colors">
                <td className="px-5 py-3 font-mono text-xs font-semibold">{o.order_number}</td>
                <td className="px-5 py-3">
                  <span className={cn('rounded-pill px-2.5 py-0.5 text-eyebrow', ORDER_STATUS_STYLES[o.status] ?? 'bg-border text-muted')}>{o.status}</span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums font-display font-bold">{formatCurrency(o.total)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-muted">{o.item_count}</td>
                <td className="px-5 py-3 text-xs text-muted">{formatRelativeDate(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReturnsTab({ returns }) {
  if (!returns?.length) return <EmptyState icon={RotateCcw} label="No returns" />;
  return (
    <>
      <div className="md:hidden space-y-3">
        {returns.map(r => (
          <Link key={r.id} to={`/admin/returns/${r.id}`} className="card p-4 block hover:bg-highlight transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="font-mono text-sm font-semibold">{r.rma_number}</div>
              <span className={cn('rounded-pill px-2 py-0.5 text-eyebrow capitalize shrink-0', RETURN_STATUS_STYLES[r.status])}>{r.status}</span>
            </div>
            <div className="mt-1 text-xs text-muted">Order #{r.order_number} · {formatDate(r.created_at)}</div>
          </Link>
        ))}
      </div>
      <div className="hidden md:block card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">RMA</th>
              <th className="px-5 py-3 font-medium">Order</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Resolution</th>
              <th className="px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {returns.map(r => (
              <tr key={r.id} className="hover:bg-highlight transition-colors cursor-pointer" onClick={() => window.location.href = `/admin/returns/${r.id}`}>
                <td className="px-5 py-3 font-mono text-xs font-semibold">{r.rma_number}</td>
                <td className="px-5 py-3 font-mono text-xs text-muted">{r.order_number}</td>
                <td className="px-5 py-3"><span className={cn('rounded-pill px-2.5 py-0.5 text-eyebrow capitalize', RETURN_STATUS_STYLES[r.status])}>{r.status}</span></td>
                <td className="px-5 py-3 text-muted capitalize">{r.resolution?.replace('_', ' ')}</td>
                <td className="px-5 py-3 text-xs text-muted">{formatDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReviewsTab({ reviews }) {
  if (!reviews?.length) return <EmptyState icon={Star} label="No reviews" />;
  return (
    <div className="space-y-3">
      {reviews.map(rv => (
        <div key={rv.id} className="card p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/admin/products/${rv.product_id}/edit`} className="font-semibold hover:text-accent transition-colors">{rv.product_name}</Link>
            <div className="flex items-center gap-1 shrink-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3.5 w-3.5 ${i < rv.rating ? 'fill-warning text-warning' : 'text-border'}`} />
              ))}
              {rv.verified_purchase && <span className="ml-1 rounded-pill bg-success/15 px-2 py-0.5 text-eyebrow text-success">Verified</span>}
            </div>
          </div>
          {rv.comment && <p className="text-sm text-muted">{rv.comment}</p>}
          <div className="text-xs text-muted">{formatDate(rv.created_at)}</div>
        </div>
      ))}
    </div>
  );
}

function WishlistTab({ items }) {
  if (!items?.length) return <EmptyState icon={Heart} label="Wishlist is empty" />;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map(item => (
        <Link key={item.id} to={`/admin/products/${item.product_id}/edit`} className="card p-3 hover:bg-highlight transition-colors block">
          <img
            src={item.images?.[0] ?? 'https://placehold.co/80'}
            alt={item.name}
            className="h-20 w-full object-cover rounded-md mb-2"
          />
          <div className="font-semibold text-sm truncate">{item.name}</div>
          <div className="text-xs tabular-nums font-display font-bold">{formatCurrency(item.price)}</div>
        </Link>
      ))}
    </div>
  );
}

function CreditTab({ entries, balance, onAdjust }) {
  // Compute running balance: process oldest-first, accumulate
  const sorted = [...(entries || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  let running = 0;
  const withRunning = sorted.map(e => {
    running += parseFloat(e.amount_ghs) || 0;
    return { ...e, running };
  }).reverse(); // back to newest-first for display

  return (
    <div className="space-y-4">
      <div className="card p-5 flex items-center justify-between">
        <div>
          <div className="text-eyebrow text-muted mb-1">Current balance</div>
          <div className="font-display text-3xl font-bold tabular-nums">{formatCurrency(balance)}</div>
        </div>
        <Button size="sm" onClick={onAdjust}>Adjust credit</Button>
      </div>

      {withRunning.length === 0 ? (
        <EmptyState icon={CreditCard} label="No credit history" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Reason</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {withRunning.map(e => (
                <tr key={e.id} className="hover:bg-highlight transition-colors">
                  <td className="px-5 py-3 text-xs text-muted">{formatDate(e.created_at)}</td>
                  <td className="px-5 py-3 text-muted capitalize">{e.reason?.replace(/_/g, ' ')}</td>
                  <td className={`px-5 py-3 text-right tabular-nums font-semibold ${parseFloat(e.amount_ghs) >= 0 ? 'text-success' : 'text-error'}`}>
                    {parseFloat(e.amount_ghs) >= 0 ? '+' : ''}{formatCurrency(e.amount_ghs)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted">{formatCurrency(e.running)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const LOYALTY_REASON_LABELS = {
  earned_purchase:   'Earned from order',
  redeemed_credit:   'Redeemed on order',
  refund_clawback:   'Refund adjustment',
  expired:           'Expired',
  manual_adjustment: 'Manual adjustment',
};

function LoyaltyTab({ entries, user, onAdjust }) {
  // Compute running balance: process oldest-first, accumulate
  const sorted = [...(entries || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  let running = 0;
  const withRunning = sorted.map(e => {
    running += Number(e.delta) || 0;
    return { ...e, running };
  }).reverse(); // back to newest-first for display

  return (
    <div className="space-y-4">
      <div className="card p-5 flex items-center justify-between">
        <div>
          <div className="text-eyebrow text-muted mb-1">Current balance</div>
          <div className="flex items-baseline gap-2">
            <div className="font-display text-3xl font-bold tabular-nums">{user?.loyalty_points ?? 0} pts</div>
            <span className="rounded-pill bg-accent/15 px-2.5 py-0.5 text-eyebrow text-accent">
              {TIER_LABELS[user?.loyalty_tier] ?? 'Bronze'}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted">{user?.loyalty_lifetime_points ?? 0} lifetime points</div>
        </div>
        <Button size="sm" onClick={onAdjust}>Adjust points</Button>
      </div>

      {withRunning.length === 0 ? (
        <EmptyState icon={Award} label="No loyalty history" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Reason</th>
                <th className="px-5 py-3 font-medium text-right">Points</th>
                <th className="px-5 py-3 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {withRunning.map(e => (
                <tr key={e.id} className="hover:bg-highlight transition-colors">
                  <td className="px-5 py-3 text-xs text-muted">{formatDate(e.created_at)}</td>
                  <td className="px-5 py-3 text-muted">
                    {LOYALTY_REASON_LABELS[e.reason] ?? e.reason}
                    {e.related_id && ['earned_purchase', 'redeemed_credit', 'refund_clawback'].includes(e.reason) && (
                      <span className="text-xs"> · order #{e.related_id}</span>
                    )}
                  </td>
                  <td className={`px-5 py-3 text-right tabular-nums font-semibold ${e.delta >= 0 ? 'text-success' : 'text-error'}`}>
                    {e.delta >= 0 ? '+' : ''}{e.delta}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted">{e.running}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, label }) {
  return (
    <div className="card p-10 flex flex-col items-center gap-3">
      <Icon className="h-10 w-10 text-muted opacity-40" />
      <p className="text-eyebrow text-muted">{label}</p>
    </div>
  );
}

const CHANNEL_ICONS = { email: Mail, sms: Phone, whatsapp: MessageSquare };
const MSG_STATUS_STYLES = {
  sent:            'bg-success/15 text-success',
  failed:          'bg-error/15 text-error',
  pending_manual:  'bg-warning/15 text-warning',
};

function MessagesTab({ data }) {
  const messages = data?.messages ?? [];
  if (!messages.length) return <EmptyState icon={Mail} label="No messages sent yet" />;
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="px-5 py-3 font-medium text-left">Date</th>
            <th className="px-5 py-3 font-medium text-left">Channel</th>
            <th className="px-5 py-3 font-medium text-left hidden md:table-cell">Subject / Preview</th>
            <th className="px-5 py-3 font-medium text-left hidden md:table-cell">Sent by</th>
            <th className="px-5 py-3 font-medium text-left">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {messages.map(m => {
            const Icon = CHANNEL_ICONS[m.channel] ?? Mail;
            return (
              <tr key={m.id} className="hover:bg-highlight transition-colors">
                <td className="px-5 py-3 text-xs text-muted whitespace-nowrap">{formatRelativeDate(m.created_at)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted" />
                    <span className="capitalize text-xs">{m.channel}</span>
                  </div>
                </td>
                <td className="px-5 py-3 hidden md:table-cell max-w-xs">
                  <div className="truncate text-muted text-xs">{m.subject || m.body?.slice(0, 80)}</div>
                </td>
                <td className="px-5 py-3 hidden md:table-cell text-xs text-muted">{m.admin_name ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-pill px-2.5 py-0.5 text-eyebrow capitalize ${MSG_STATUS_STYLES[m.status] ?? 'bg-border text-muted'}`}>
                    {m.status?.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Ban, CheckCircle, Download, Shield, Users, MoreVertical, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService } from '../../services/index.js';
import { formatDate, cn } from '../../utils/format.js';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import BottomSheet from '../../components/admin/BottomSheet.jsx';
import CustomerLink from '../../components/admin/CustomerLink.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/index.jsx';
import { usePullToRefresh } from '../../hooks/usePullToRefresh.js';
import { useLongPress } from '../../hooks/useLongPress.js';
import { useTableSelection } from '../../hooks/useTableSelection.js';
import BulkSelectionBar from '../../components/admin/BulkSelectionBar.jsx';
import { exportCsv } from '../../utils/exportCsv.js';

function MobileUserCard({ u, onSetRole, onToggleBlock, onNavigate, onLongPress, isSelected }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const longPress = useLongPress(onLongPress ?? (() => setSheetOpen(true)));

  return (
    <>
      <div className={cn('card p-4 space-y-2 cursor-pointer', isSelected && 'bg-accent/5 ring-2 ring-accent')} onClick={onNavigate} {...longPress}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold truncate">{u.name}</div>
            <div className="text-xs text-muted truncate">{u.email}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('rounded-pill px-2 py-0.5 text-eyebrow', u.role === 'admin' ? 'bg-accent/15 text-accent' : 'bg-surface border border-border text-muted')}>
              {u.role}
            </span>
            <button
              onClick={() => setSheetOpen(true)}
              className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-bg"
              aria-label="Actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          {u.is_blocked ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-error/15 px-2 py-0.5 text-eyebrow text-error">
              <Ban className="h-3 w-3" /> Blocked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-pill bg-success/15 px-2 py-0.5 text-eyebrow text-success">
              <CheckCircle className="h-3 w-3" /> Active
            </span>
          )}
          <span>Joined {formatDate(u.created_at)}</span>
        </div>
      </div>
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={u.name}>
        <div className="space-y-1">
          <button
            onClick={() => { onSetRole(u.id, u.role === 'admin' ? 'customer' : 'admin'); setSheetOpen(false); }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 hover:bg-highlight transition-colors text-sm font-medium"
          >
            <Shield className="h-4 w-4 text-muted" />
            {u.role === 'admin' ? 'Demote to customer' : 'Promote to admin'}
          </button>
          <button
            onClick={() => { onToggleBlock(u); setSheetOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors text-sm font-medium ${u.is_blocked ? 'hover:bg-success/10 text-success' : 'hover:bg-error/10 text-error'}`}
          >
            <Ban className="h-4 w-4" />
            {u.is_blocked ? 'Unblock user' : 'Block user'}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setUsers(await adminService.users());
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setRole(id, role) {
    if (!window.confirm(`Set this user's role to ${role}?`)) return;
    try {
      await adminService.updateUserRole(id, role);
      toast.success('Role updated');
      load();
    } catch {
      toast.error('Could not update');
    }
  }

  async function toggleBlock(u) {
    const next = !u.is_blocked;
    if (!window.confirm(next ? 'Block this user?' : 'Unblock this user?')) return;
    try {
      await adminService.blockUser(u.id, next);
      toast.success(next ? 'User blocked' : 'User unblocked');
      load();
    } catch {
      toast.error('Could not update');
    }
  }

  const { selectedArray, count, toggle, toggleAll, clear, isSelected, isAllSelected } = useTableSelection();
  const [confirmAction, setConfirmAction] = useState(null);

  async function handleBulkUsers(action) {
    try {
      const { succeeded, failed } = await adminService.bulkUsers({ ids: selectedArray, action });
      const LABELS = { block: 'Block', unblock: 'Unblock' };
      toast.success(`${LABELS[action]}: ${succeeded.length} succeeded${failed.length ? `, ${failed.length} failed` : ''}`);
      if (failed.length) toast.error(failed.slice(0, 3).map(f => f.reason).join(' · '), { duration: 5000 });
      clear();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Bulk action failed');
    }
  }

  function exportUsersCsv() {
    exportCsv(
      users.filter(u => isSelected(u.id)),
      [
        { label: 'Name', key: 'name' },
        { label: 'Email', key: 'email' },
        { label: 'Role', key: 'role' },
        { label: 'Status', key: 'is_blocked' },
        { label: 'Joined', key: 'created_at' },
      ],
      'users.csv'
    );
  }

  const BULK_ACTIONS = [
    { label: 'Block',      icon: UserX,      destructive: true, onClick: () => setConfirmAction({ action: 'block', label: `Block ${count} user${count !== 1 ? 's' : ''}?` }) },
    { label: 'Unblock',    icon: CheckCircle, onClick: () => handleBulkUsers('unblock') },
    { label: 'Export CSV', icon: Download,    onClick: exportUsersCsv },
  ];

  const navigate = useNavigate();
  const { isPulling, isRefreshing } = usePullToRefresh(load);

  return (
    <div className="space-y-6">
      {(isPulling || isRefreshing) && (
        <div className="flex justify-center py-2 md:hidden" style={{ marginTop: -16 }}>
          <div className={`h-5 w-5 rounded-full border-2 border-accent ${isRefreshing ? 'animate-spin border-t-transparent' : 'opacity-50'}`} />
        </div>
      )}
      <AdminPageHeader
        title="Customers"
        subtitle={loading ? 'Loading…' : `${users.length} registered`}
      />

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="flex justify-between"><div className="skeleton h-5 w-28" /><div className="skeleton h-5 w-16 rounded-full" /></div>
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
            ))
          : users.length === 0
          ? (
            <div className="card p-10 flex flex-col items-center gap-3">
              <Users className="h-10 w-10 text-muted opacity-40" />
              <p className="text-eyebrow text-muted">No customers yet</p>
              <p className="text-sm text-muted">Registered customers will appear here.</p>
            </div>
          )
          : users.map((u) => (
              <MobileUserCard key={u.id} u={u} onSetRole={setRole} onToggleBlock={toggleBlock} onNavigate={() => navigate(`/admin/customers/${u.id}`)} onLongPress={() => toggle(u.id)} isSelected={isSelected(u.id)} />
            ))}
      </div>

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
                    aria-label="Select all users"
                    checked={isAllSelected(users.map(u => u.id))}
                    onChange={() => toggleAll(users.map(u => u.id))}
                  />
                </th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3 w-10"><div className="skeleton h-4 w-4 rounded" /></td>
                    <td className="px-5 py-3">
                      <div className="space-y-1.5">
                        <div className="skeleton h-4 w-28" />
                        <div className="skeleton h-3 w-36" />
                      </div>
                    </td>
                    <td className="px-5 py-3"><div className="skeleton h-5 w-16 rounded-full" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-5 w-16 rounded-full" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-20" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-7 w-32 ml-auto rounded-md" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="h-10 w-10 text-muted opacity-40" />
                      <p className="text-eyebrow text-muted">No customers yet</p>
                      <p className="text-sm text-muted">Registered customers will appear here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => navigate(`/admin/customers/${u.id}`)}
                    className={cn('hover:bg-highlight transition-colors cursor-pointer', isSelected(u.id) && 'bg-accent/5')}
                  >
                    <td className="px-5 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded accent-accent"
                        aria-label={`Select ${u.name}`}
                        checked={isSelected(u.id)}
                        onChange={() => toggle(u.id)}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <CustomerLink customerId={u.id} name={u.name} className="font-semibold" />
                      <div className="text-xs text-muted">{u.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-pill px-2.5 py-0.5 text-eyebrow ${
                          u.role === 'admin'
                            ? 'bg-accent/15 text-accent'
                            : 'bg-surface border border-border text-muted'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {u.is_blocked ? (
                        <span className="inline-flex items-center gap-1 rounded-pill bg-error/15 px-2.5 py-0.5 text-eyebrow text-error">
                          <Ban className="h-3 w-3" /> Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-pill bg-success/15 px-2.5 py-0.5 text-eyebrow text-success">
                          <CheckCircle className="h-3 w-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => setRole(u.id, u.role === 'admin' ? 'customer' : 'admin')}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium min-h-[30px] hover:bg-surface transition-colors"
                        >
                          <Shield className="h-3.5 w-3.5" />
                          {u.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>
                        <button
                          onClick={() => toggleBlock(u)}
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium min-h-[30px] transition-colors ${
                            u.is_blocked
                              ? 'border-success/40 text-success hover:bg-success/10'
                              : 'border-error/40 text-error hover:bg-error/10'
                          }`}
                        >
                          {u.is_blocked ? 'Unblock' : 'Block'}
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

      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.label}>
        <p className="text-sm text-muted mb-4">This will affect {count} user{count !== 1 ? 's' : ''}. Admin accounts will be skipped.</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button
            className="bg-error text-white hover:bg-error/90"
            onClick={() => { handleBulkUsers(confirmAction.action); setConfirmAction(null); }}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ScrollText, X } from 'lucide-react';
import { adminService } from '../../services/index.js';
import { formatRelativeDate } from '../../utils/format.js';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import BottomSheet from '../../components/admin/BottomSheet.jsx';
import { usePullToRefresh } from '../../hooks/usePullToRefresh.js';

function MobileLogCard({ l }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const details = l.details ? JSON.stringify(l.details, null, 2) : null;

  return (
    <>
      <div
        className="card p-4 space-y-1.5 cursor-pointer hover:bg-highlight transition-colors"
        onClick={() => details && setDetailOpen(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <code className="rounded bg-bg px-2 py-0.5 text-xs font-mono">{l.action}</code>
          <span className="text-xs text-muted shrink-0">{formatRelativeDate(l.created_at)}</span>
        </div>
        <div className="text-sm font-medium">{l.admin_email ?? l.admin_id}</div>
        {details && (
          <div className="text-xs text-muted truncate">{JSON.stringify(l.details)}</div>
        )}
        {l.ip && <div className="text-xs text-muted">IP: {l.ip}</div>}
      </div>
      {details && (
        <BottomSheet open={detailOpen} onClose={() => setDetailOpen(false)} title="Log details">
          <pre className="text-xs font-mono bg-bg rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all">
            {details}
          </pre>
        </BottomSheet>
      )}
    </>
  );
}

export default function AdminLogs() {
  const [filter, setFilter] = useState({ action: '', q: '' });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminService
      .logs(filter)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const hasFilter = filter.action || filter.q;

  const loadLogs = () => new Promise((res) => {
    adminService.logs(filter).then(setLogs).catch(() => setLogs([])).finally(res);
  });
  const { isPulling, isRefreshing } = usePullToRefresh(loadLogs);

  return (
    <div className="space-y-6">
      {(isPulling || isRefreshing) && (
        <div className="flex justify-center py-2 md:hidden" style={{ marginTop: -16 }}>
          <div className={`h-5 w-5 rounded-full border-2 border-accent ${isRefreshing ? 'animate-spin border-t-transparent' : 'opacity-50'}`} />
        </div>
      )}
      <AdminPageHeader
        title="Activity Logs"
        subtitle={loading ? 'Loading…' : `${logs.length} entries`}
      />

      <div className="card flex flex-wrap gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            placeholder="Search admin or action…"
            value={filter.q}
            onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
            className="input pl-10"
          />
        </div>
        <select
          value={filter.action}
          onChange={(e) => setFilter((f) => ({ ...f, action: e.target.value }))}
          className="select w-auto"
        >
          <option value="">All actions</option>
          <option value="product.create">Product created</option>
          <option value="product.update">Product updated</option>
          <option value="product.delete">Product deleted</option>
          <option value="order.status_change">Order status changed</option>
          <option value="user.role_change">User role changed</option>
          <option value="user.block">User blocked</option>
          <option value="coupon.create">Coupon created</option>
          <option value="coupon.delete">Coupon deleted</option>
        </select>
      </div>

      {/* Active filter chips */}
      {hasFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-eyebrow text-muted">Filters:</span>
          {filter.action && (
            <button
              onClick={() => setFilter((f) => ({ ...f, action: '' }))}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/25 transition-colors"
            >
              {filter.action} <X className="h-3 w-3" />
            </button>
          )}
          {filter.q && (
            <button
              onClick={() => setFilter((f) => ({ ...f, q: '' }))}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/25 transition-colors"
            >
              "{filter.q}" <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="flex justify-between"><div className="skeleton h-5 w-28 rounded" /><div className="skeleton h-4 w-16" /></div>
                <div className="skeleton h-4 w-36" />
                <div className="skeleton h-3 w-48" />
              </div>
            ))
          : logs.length === 0
          ? (
            <div className="card p-10 flex flex-col items-center gap-3">
              <ScrollText className="h-10 w-10 text-muted opacity-40" />
              <p className="text-eyebrow text-muted">No log entries match</p>
              <p className="text-sm text-muted">Try adjusting your filters.</p>
            </div>
          )
          : logs.map((l) => <MobileLogCard key={l.id} l={l} />)}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Admin</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Details</th>
                <th className="px-5 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-20" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-36" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-5 w-28 rounded" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-48" /></td>
                    <td className="px-5 py-3"><div className="skeleton h-4 w-20" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16">
                    <div className="flex flex-col items-center gap-3">
                      <ScrollText className="h-10 w-10 text-muted opacity-40" />
                      <p className="text-eyebrow text-muted">No log entries match</p>
                      <p className="text-sm text-muted">Try adjusting your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <motion.tr
                    key={l.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-highlight transition-colors"
                  >
                    <td className="px-5 py-3 text-xs text-muted whitespace-nowrap">{formatRelativeDate(l.created_at)}</td>
                    <td className="px-5 py-3 font-medium">{l.admin_email ?? l.admin_id}</td>
                    <td className="px-5 py-3">
                      <code className="rounded bg-bg px-2 py-0.5 text-xs">{l.action}</code>
                    </td>
                    <td className="px-5 py-3 max-w-md truncate text-xs text-muted">
                      {l.details ? JSON.stringify(l.details) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">{l.ip ?? '—'}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

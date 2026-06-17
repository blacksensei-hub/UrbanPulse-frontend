import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, ShoppingBag, RotateCcw, ScrollText,
  LogIn, RefreshCw,
} from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import { adminService } from '../../services/index.js';
import { fadeInUp, staggerContainer } from '../../lib/motion.js';

const TYPE_CONFIG = {
  order:  { icon: ShoppingBag, label: 'Orders',     color: 'text-blue-500',   bg: 'bg-blue-500/10'  },
  return: { icon: RotateCcw,   label: 'Returns',    color: 'text-orange-500', bg: 'bg-orange-500/10' },
  log:    { icon: ScrollText,  label: 'Admin Logs', color: 'text-accent',     bg: 'bg-accent/10'    },
  login:  { icon: LogIn,       label: 'Logins',     color: 'text-green-500',  bg: 'bg-green-500/10' },
};

const ALL_TYPES = ['order', 'return', 'log', 'login'];

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const mins = Math.round(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return rtf.format(-mins, 'minute');
  const hrs = Math.round(mins / 60);
  if (hrs < 24)   return rtf.format(-hrs, 'hour');
  const days = Math.round(hrs / 24);
  if (days < 7)   return rtf.format(-days, 'day');
  return new Date(dateStr).toLocaleDateString();
}

function groupByTime(items) {
  const now = new Date();
  const startOfToday     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday - 86400000);
  const startOfWeek      = new Date(startOfToday - 6 * 86400000);

  const groups = { Today: [], Yesterday: [], 'This week': [], Earlier: [] };
  for (const item of items) {
    const d = new Date(item.created_at);
    if (d >= startOfToday)     groups['Today'].push(item);
    else if (d >= startOfYesterday) groups['Yesterday'].push(item);
    else if (d >= startOfWeek)      groups['This week'].push(item);
    else                             groups['Earlier'].push(item);
  }
  return groups;
}

export default function AdminActivity() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const timerRef = useRef(null);

  const fetchActivity = useCallback(async () => {
    try {
      const params = {};
      if (selectedTypes.length > 0) params.type = selectedTypes.join(',');
      const data = await adminService.activity(params);
      setItems(data.activity ?? []);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, [selectedTypes]);

  // Initial fetch + filter changes
  useEffect(() => {
    setLoading(true);
    fetchActivity();
  }, [fetchActivity]);

  // Auto-refresh every 60s when tab is visible
  useEffect(() => {
    function schedule() {
      timerRef.current = setTimeout(() => {
        if (document.visibilityState === 'visible') fetchActivity();
        schedule();
      }, 60000);
    }
    schedule();

    function onVisibility() {
      if (document.visibilityState === 'visible') fetchActivity();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchActivity]);

  function toggleType(type) {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }

  function handleRefresh() {
    setLoading(true);
    fetchActivity();
  }

  const grouped = groupByTime(items);
  const groupKeys = Object.keys(grouped).filter(k => grouped[k].length > 0);

  return (
    <div>
      <AdminPageHeader
        title="Activity Feed"
        subtitle="Live stream of admin actions, orders, returns, and logins"
        actions={
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-highlight hover:text-text"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* Type filter chips */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedTypes([])}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            selectedTypes.length === 0
              ? 'border-accent bg-accent text-white'
              : 'border-border text-muted hover:bg-highlight hover:text-text'
          }`}
        >
          All
        </button>
        {ALL_TYPES.map(type => {
          const { icon: Icon, label, color } = TYPE_CONFIG[type];
          const active = selectedTypes.includes(type);
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? 'border-current bg-current/10 ' + color
                  : 'border-border text-muted hover:bg-highlight hover:text-text'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {loading && items.length === 0 && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-border p-4">
              <div className="h-8 w-8 animate-pulse rounded-full bg-border" />
              <div className="flex-1 space-y-2 pt-0.5">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-border" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-border" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-muted">
          <Activity className="h-10 w-10 opacity-30" />
          <p className="text-sm">No activity yet</p>
        </div>
      )}

      {/* Time-grouped feed */}
      {groupKeys.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-8"
        >
          {groupKeys.map(group => (
            <div key={group}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">{group}</h2>
              <div className="space-y-1">
                {grouped[group].map(item => (
                  <ActivityRow
                    key={item.id}
                    item={item}
                    onClick={() => item.link && navigate(item.link)}
                  />
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function ActivityRow({ item, onClick }) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.log;
  const Icon = cfg.icon;

  return (
    <motion.div
      variants={fadeInUp}
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border border-border p-4 transition-colors ${
        item.link ? 'cursor-pointer hover:bg-highlight' : ''
      }`}
    >
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${cfg.bg} ${cfg.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.summary}</p>
        {item.actor && (
          <p className="mt-0.5 truncate text-xs text-muted">{item.actor}</p>
        )}
      </div>
      <time
        dateTime={item.created_at}
        className="shrink-0 text-xs text-muted"
        title={new Date(item.created_at).toLocaleString()}
      >
        {relativeTime(item.created_at)}
      </time>
    </motion.div>
  );
}

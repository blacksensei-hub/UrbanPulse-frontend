import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import { adminService } from '../../services/index.js';
import { formatCurrency, formatRelativeDate, cn } from '../../utils/format.js';
import { staggerContainer, fadeInUp, cardHover, springSnappy } from '../../lib/motion.js';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';

const ORDER_STATUS_STYLES = {
  pending:      'bg-warning/15 text-warning',
  awaiting_confirmation: 'bg-info/15 text-info',
  paid:         'bg-info/15 text-info',
  processing:   'bg-info/15 text-info',
  shipped:      'bg-accent/15 text-accent',
  delivered:    'bg-success/15 text-success',
  cancelled:    'bg-error/15 text-error',
  refunded:     'bg-muted/15 text-muted',
};

function StatCard({ icon: Icon, label, value, hint, delta, to }) {
  const prefersReduced = useReducedMotion();
  return (
    <Link to={to ?? '#'} className="block">
      <motion.div
        variants={fadeInUp}
        whileHover={prefersReduced ? {} : cardHover}
        transition={springSnappy}
        className="card p-5 relative overflow-hidden cursor-pointer h-full"
      >
        {/* Icon badge — top-right corner */}
        <div className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
          <Icon className="h-4 w-4" />
        </div>
        {/* Eyebrow label */}
        <div className="text-eyebrow text-muted mb-3 pr-12">{label}</div>
        {/* Value */}
        <div className="font-display text-3xl font-bold leading-none tabular-nums">{value}</div>
        {/* Delta + hint */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {delta != null && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                delta >= 0 ? 'text-success' : 'text-error'
              }`}
            >
              <ArrowUpRight className={`h-3 w-3 ${delta < 0 ? 'rotate-90' : ''}`} />
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="text-xs text-muted">{hint}</span>}
        </div>
      </motion.div>
    </Link>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [low, setLow] = useState([]);
  const [series, setSeries] = useState([]);

  useEffect(() => {
    Promise.all([
      adminService.stats().then(setStats).catch(() => {}),
      adminService.recentOrders().then(setRecent).catch(() => {}),
      adminService.lowStock().then(setLow).catch(() => {}),
      adminService
        .salesAnalytics()
        .then((d) => setSeries(d.series ?? []))
        .catch(() => {}),
    ]);
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Today"
        subtitle="A snapshot of your store."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Today' }]}
      />

      {/* Stat cards — stagger entrance */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          icon={TrendingUp}
          label="Revenue (30d)"
          value={formatCurrency(stats?.revenue ?? 0)}
          delta={stats?.revenueDelta}
          to="/admin/analytics"
        />
        <StatCard
          icon={ShoppingBag}
          label="Orders (30d)"
          value={stats?.orders ?? 0}
          delta={stats?.ordersDelta}
          to="/admin/orders"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={stats?.customers ?? 0}
          hint="Total registered"
          to="/admin/users"
        />
        <StatCard
          icon={Package}
          label="Products"
          value={stats?.products ?? 0}
          hint={low.length > 0 ? `${low.length} low stock` : 'All stocked'}
          to="/admin/products"
        />
      </motion.div>

      {/* Revenue chart */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Revenue, last 30 days</h2>
            <p className="text-xs text-muted">Daily gross sales</p>
          </div>
        </div>
        <div className="h-48 sm:h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="var(--color-border)"
                strokeDasharray="3 3"
                vertical={false}
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={50}
                tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  color: 'var(--color-text)',
                }}
                labelStyle={{ color: 'var(--color-muted)' }}
                cursor={{ stroke: 'var(--color-accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
                formatter={(v) => formatCurrency(v)}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-accent)"
                strokeWidth={1.5}
                fill="url(#rev-grad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent orders — compact table */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm text-accent hover:underline">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">No recent orders.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {recent.slice(0, 6).map((o) => (
                  <tr key={o.id} className="hover:bg-highlight transition-colors">
                    <td className="py-2.5 pr-3">
                      <div className="font-mono text-xs font-semibold">{o.order_number}</div>
                      <div className="text-xs text-muted">{o.customer_email}</div>
                    </td>
                    <td className="py-2.5 px-1 text-xs text-muted whitespace-nowrap">
                      {formatRelativeDate(o.created_at)}
                    </td>
                    <td className="py-2.5 pl-1">
                      <span className={cn('rounded-pill px-2 py-0.5 text-eyebrow', ORDER_STATUS_STYLES[o.status] ?? 'bg-border text-muted')}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <span className="font-display text-sm font-bold tabular-nums">
                        {formatCurrency(o.total)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Low stock */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold">Low stock</h2>
              {low.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  {low.length}
                </span>
              )}
            </div>
            <Link to="/admin/products" className="text-sm text-accent hover:underline">
              Manage
            </Link>
          </div>
          {low.length === 0 ? (
            <p className="text-sm text-muted">Stock levels look healthy.</p>
          ) : (
            <ul className="divide-y divide-border">
              {low.slice(0, 6).map((v) => (
                <li key={v.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <div className="font-semibold">{v.product_name}</div>
                    <div className="text-xs text-muted">
                      {[v.size, v.color].filter(Boolean).join(' · ')} · SKU {v.sku}
                    </div>
                  </div>
                  <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning whitespace-nowrap">
                    {v.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

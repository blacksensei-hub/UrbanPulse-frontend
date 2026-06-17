import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { adminService } from '../../services/index.js';
import { formatCurrency } from '../../utils/format.js';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';

export default function AdminAnalytics() {
  const [sales, setSales] = useState([]);
  const [top, setTop] = useState([]);
  const [ltv, setLtv] = useState([]);

  useEffect(() => {
    adminService.salesAnalytics().then((d) => setSales(d.series ?? [])).catch(() => {});
    adminService.topProducts().then(setTop).catch(() => {});
    adminService.customerLTV().then(setLtv).catch(() => {});
  }, []);

  const tooltipStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    color: 'var(--color-text)',
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics"
        subtitle="Sales performance and customer insights."
      />

      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold">Daily sales (last 30 days)</h2>
        <div className="mt-4 h-48 sm:h-72">
          <ResponsiveContainer>
            <LineChart data={sales}>
              <CartesianGrid
                stroke="var(--color-border)"
                strokeDasharray="3 3"
                vertical={false}
                strokeOpacity={0.5}
              />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: 'var(--color-accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
                formatter={(v) => formatCurrency(v)}
              />
              <Line type="monotone" dataKey="revenue" stroke="var(--color-accent)" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Top products</h2>
          <div className="mt-4 h-48 sm:h-72">
            <ResponsiveContainer>
              <BarChart data={top.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  horizontal={false}
                  strokeOpacity={0.5}
                />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={140} tick={{ fill: 'var(--color-text)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'var(--color-highlight)' }}
                />
                <Bar dataKey="units_sold" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Customer lifetime value</h2>
          <div className="mt-4 max-h-64 sm:max-h-72 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-2 font-medium">Customer</th>
                  <th className="py-2 font-medium text-right">Orders</th>
                  <th className="py-2 font-medium text-right">Lifetime spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ltv.slice(0, 12).map((c) => (
                  <tr key={c.email} className="hover:bg-highlight transition-colors">
                    <td className="py-2.5 pr-3 font-medium text-xs">{c.email}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted">{c.order_count}</td>
                    <td className="py-2.5 text-right tabular-nums font-display font-bold">
                      {formatCurrency(c.total_spent)}
                    </td>
                  </tr>
                ))}
                {ltv.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-16">
                      <div className="flex flex-col items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-muted opacity-40" />
                        <p className="text-eyebrow text-muted">No customer data yet</p>
                        <p className="text-xs text-muted">LTV data appears after first purchases.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

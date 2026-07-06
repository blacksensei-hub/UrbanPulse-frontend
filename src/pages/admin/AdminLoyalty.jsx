import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Award, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/index.js';
import { formatCurrency } from '../../utils/format.js';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';

const TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };

export default function AdminLoyalty() {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    adminService.loyaltyOverview().then(setOverview).catch(() => {});
  }, []);

  const tierData = (overview?.tier_distribution ?? []).map((t) => ({
    tier: TIER_LABELS[t.tier] ?? t.tier,
    count: t.count,
  }));

  const tooltipStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    color: 'var(--color-text)',
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Loyalty"
        subtitle="Points issued, redeemed, and outstanding liability."
        actions={
          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
          >
            <Settings className="h-3.5 w-3.5" /> Loyalty settings
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="eyebrow">Total issued</p>
          <div className="mt-2 font-mono text-2xl font-bold">{overview?.total_issued ?? '—'}</div>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Total redeemed</p>
          <div className="mt-2 font-mono text-2xl font-bold">{overview?.total_redeemed ?? '—'}</div>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Outstanding points</p>
          <div className="mt-2 font-mono text-2xl font-bold">{overview?.outstanding_points ?? '—'}</div>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Outstanding liability</p>
          <div className="mt-2 font-mono text-2xl font-bold">
            {overview ? formatCurrency(overview.outstanding_liability_ghs) : '—'}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Tier distribution</h2>
          <div className="mt-4 h-48 sm:h-72">
            <ResponsiveContainer>
              <BarChart data={tierData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  horizontal={false}
                  strokeOpacity={0.5}
                />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} />
                <YAxis dataKey="tier" type="category" tickLine={false} axisLine={false} width={80} tick={{ fill: 'var(--color-text)', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-highlight)' }} />
                <Bar dataKey="count" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Top members</h2>
          <div className="mt-4 max-h-64 sm:max-h-72 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-2 font-medium">Customer</th>
                  <th className="py-2 font-medium">Tier</th>
                  <th className="py-2 font-medium text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(overview?.top_members ?? []).map((m) => (
                  <tr key={m.id} className="hover:bg-highlight transition-colors">
                    <td className="py-2.5 pr-3">
                      <Link to={`/admin/customers/${m.id}`} className="font-medium text-xs hover:text-accent">
                        {m.name || m.email}
                      </Link>
                    </td>
                    <td className="py-2.5 text-xs text-muted">{TIER_LABELS[m.loyalty_tier] ?? m.loyalty_tier}</td>
                    <td className="py-2.5 text-right tabular-nums font-display font-bold">{m.loyalty_points}</td>
                  </tr>
                ))}
                {overview && overview.top_members.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-16">
                      <div className="flex flex-col items-center gap-3">
                        <Award className="h-8 w-8 text-muted opacity-40" />
                        <p className="text-eyebrow text-muted">No loyalty members yet</p>
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

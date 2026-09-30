import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Eye } from 'lucide-react';
import { adminService } from '../../services/index.js';
import SegmentedControl from '../ui/SegmentedControl.jsx';

const SOURCE_LABEL = { direct: 'Direct / typed', instagram: 'Instagram', facebook: 'Facebook', x: 'X', tiktok: 'TikTok', whatsapp: 'WhatsApp', linkedin: 'LinkedIn', google: 'Google' };

// A ranked list with a thin magnitude bar: one hue, value in text ink.
function Ranked({ title, rows, label, value, empty }) {
  const max = Math.max(1, ...rows.map(value));
  return (
    <div className="card min-w-0 p-6">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{empty}</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {rows.map((r, i) => (
            <li key={i} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate">{label(r)}</span>
                <span className="font-mono tabular-nums text-text">{value(r).toLocaleString()}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-highlight">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(value(r) / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * Where visitors come from. Anonymous daily counts only (see
 * backend/src/routes/stats.js): no IPs, cookies or user ids are stored.
 * Tag links in posts with ?utm_source=instagram&utm_campaign=... to see
 * which post a visit came from.
 */
export default function VisitorsPanel() {
  const [days, setDays] = useState('30');
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    adminService.visitors(Number(days)).then(setData).catch(() => setData({ enabled: false }));
  }, [days]);

  const tooltipStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)' };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Visitors</h2>
          <p className="text-sm text-muted">Anonymous counts. Nothing that identifies a person is stored.</p>
        </div>
        <SegmentedControl
          ariaLabel="Time range"
          value={days}
          onChange={setDays}
          items={[{ id: '7', label: '7 days' }, { id: '30', label: '30 days' }, { id: '90', label: '90 days' }]}
          className="sm:w-auto"
        />
      </div>

      {data && data.enabled === false ? (
        <div className="card p-6 text-sm text-muted">
          Visitor counting starts once the database update in <code className="font-mono">backend/sql/2026-10_features.sql</code> has been run.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Visits', data?.totals?.visits],
              ['Page views', data?.totals?.views],
              ['Pages per visit', data?.totals?.visits ? (data.totals.views / data.totals.visits).toFixed(1) : null],
            ].map(([k, v]) => (
              <div key={k} className="card p-5">
                <p className="text-xs uppercase tracking-wider text-muted">{k}</p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{v == null ? '—' : Number(v).toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="card min-w-0 p-6">
            <h3 className="font-display text-base font-semibold">Visits per day</h3>
            <div className="mt-4 h-48 sm:h-64">
              {data?.daily?.length ? (
                <ResponsiveContainer>
                  <AreaChart data={data.daily.map((d) => ({ ...d, day: String(d.day).slice(5, 10) }))}>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} minTickGap={24} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'var(--color-accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
                      formatter={(v, name) => [Number(v).toLocaleString(), name === 'visits' ? 'Visits' : 'Page views']} />
                    <Area type="monotone" dataKey="visits" stroke="var(--color-accent)" strokeWidth={2}
                      fill="var(--color-accent)" fillOpacity={0.12} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-surface)' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
                  <Eye className="h-7 w-7 opacity-40" />
                  <p className="text-sm">{data ? 'No visits counted in this period yet.' : 'Loading…'}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Ranked
              title="Where visits come from"
              rows={data?.sources ?? []}
              label={(r) => `${SOURCE_LABEL[r.source] ?? r.source}${r.campaign ? ` · ${r.campaign}` : ''}`}
              value={(r) => r.visits}
              empty="No visits yet."
            />
            <Ranked
              title="Most viewed pages"
              rows={data?.pages ?? []}
              label={(r) => r.path}
              value={(r) => r.views}
              empty="No page views yet."
            />
            <Ranked
              title="Devices"
              rows={data?.devices ?? []}
              label={(r) => ({ phone: 'Phone', tablet: 'Tablet', desktop: 'Desktop' }[r.device] ?? 'Unknown')}
              value={(r) => r.visits}
              empty="No visits yet."
            />
          </div>
        </>
      )}
    </section>
  );
}

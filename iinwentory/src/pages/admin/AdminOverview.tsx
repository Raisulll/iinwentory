import { useEffect, useState } from 'react';
import {
  Loader2, Users as UsersIcon, Building2, Package, TrendingUp,
  Activity, UserPlus, CreditCard, Image as ImageIcon,
} from 'lucide-react';
import { apiGet } from '../../lib/api';
import { getPlan, type PlanId } from '../../plans';

interface Stats {
  totals: { users: number; teams: number; items: number; folders: number; photos: number };
  signups: { last7d: number; last30d: number; total: number; daily: { date: string; count: number }[] };
  active: { dau: number; wau: number; mau: number };
  plans: { planId: PlanId; count: number }[];
  mrr: number;
  arr: number;
  subscriptions: { trialing: number; active: number; pastDue: number; cancelled: number; cancelling: number };
  topTeams: { teamId: string | null; name: string; items: number }[];
}

const money = (n: number) => '£' + n.toLocaleString();
const num = (n: number) => n.toLocaleString();

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiGet<Stats>('/api/admin/stats')
      .then(d => { if (!cancelled) setStats(d); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load stats'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Loader2 size={15} className="spin" /> Loading…
    </p>;
  }
  if (error || !stats) {
    return <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>{error || 'No data'}</div>;
  }

  // Fill the last 30 days so the signup chart is continuous.
  const byDate = new Map(stats.signups.daily.map(d => [d.date, d.count]));
  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: byDate.get(key) ?? 0 });
  }
  const maxDay = Math.max(1, ...days.map(d => d.count));
  const maxPlan = Math.max(1, ...stats.plans.map(p => p.count));
  const maxTeam = Math.max(1, ...stats.topTeams.map(t => t.items));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Headline stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <BigStat icon={UsersIcon} label="Users" value={num(stats.totals.users)} accent="#294EA7" />
        <BigStat icon={Building2} label="Teams" value={num(stats.totals.teams)} accent="#7c3aed" />
        <BigStat icon={Package} label="Active items" value={num(stats.totals.items)} accent="#059669" />
        <BigStat icon={TrendingUp} label="Est. MRR" value={money(stats.mrr)} accent="#d97706" sub={`${money(stats.arr)} ARR`} />
      </div>

      {/* Active users + signups */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        <Panel title="Active users" icon={Activity}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <MiniStat label="DAU" value={num(stats.active.dau)} />
            <MiniStat label="WAU" value={num(stats.active.wau)} />
            <MiniStat label="MAU" value={num(stats.active.mau)} />
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '12px' }}>
            Distinct users with activity in the last 1 / 7 / 30 days.
          </p>
        </Panel>

        <Panel title="New signups" icon={UserPlus}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '12px' }}>
            <MiniStat label="Last 7d" value={num(stats.signups.last7d)} />
            <MiniStat label="Last 30d" value={num(stats.signups.last30d)} />
            <MiniStat label="All time" value={num(stats.signups.total)} />
          </div>
          {/* 30-day bar sparkline */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '44px' }}>
            {days.map(d => (
              <div
                key={d.date}
                title={`${d.date}: ${d.count}`}
                style={{
                  flex: 1,
                  height: `${Math.max(3, (d.count / maxDay) * 44)}px`,
                  background: d.count > 0 ? '#294EA7' : 'var(--border-color)',
                  borderRadius: '2px 2px 0 0',
                  transition: 'height 0.2s',
                }}
              />
            ))}
          </div>
        </Panel>
      </div>

      {/* Plan distribution + subscriptions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        <Panel title="Plan distribution" icon={CreditCard}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {stats.plans.map(p => {
              const plan = getPlan(p.planId);
              return (
                <div key={p.planId} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '74px', fontSize: '12.5px', fontWeight: 600, color: plan.color }}>{plan.name}</span>
                  <div style={{ flex: 1, height: '8px', background: 'var(--surface-raised)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${(p.count / maxPlan) * 100}%`, height: '100%', background: plan.color, borderRadius: '999px' }} />
                  </div>
                  <span style={{ width: '28px', textAlign: 'right', fontSize: '12.5px', fontWeight: 600 }}>{p.count}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Subscriptions" icon={CreditCard}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <SubChip label="Active" value={stats.subscriptions.active} color="#059669" />
            <SubChip label="Trialing" value={stats.subscriptions.trialing} color="#294EA7" />
            <SubChip label="Past due" value={stats.subscriptions.pastDue} color="#dc2626" />
            <SubChip label="Cancelling" value={stats.subscriptions.cancelling} color="#d97706" />
            <SubChip label="Cancelled" value={stats.subscriptions.cancelled} color="#64748b" />
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
            <MiniStat label="Folders" value={num(stats.totals.folders)} />
            <MiniStat label="Photos" value={num(stats.totals.photos)} icon={ImageIcon} />
          </div>
        </Panel>
      </div>

      {/* Top teams */}
      <Panel title="Top teams by items" icon={Package}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {stats.topTeams.map(t => (
            <div key={t.teamId ?? t.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '160px', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
              <div style={{ flex: 1, height: '8px', background: 'var(--surface-raised)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${(t.items / maxTeam) * 100}%`, height: '100%', background: '#294EA7', borderRadius: '999px' }} />
              </div>
              <span style={{ width: '48px', textAlign: 'right', fontSize: '12.5px', fontWeight: 600 }}>{num(t.items)}</span>
            </div>
          ))}
          {stats.topTeams.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No items yet.</p>}
        </div>
      </Panel>
    </div>
  );
}

function BigStat({ icon: Icon, label, value, accent, sub }: { icon: typeof UsersIcon; label: string; value: string; accent: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: '18px 20px', cursor: 'default' }}>
      <span style={{ display: 'inline-flex', width: '34px', height: '34px', borderRadius: '10px', alignItems: 'center', justifyContent: 'center', background: accent + '14', color: accent, marginBottom: '10px' }}>
        <Icon size={17} />
      </span>
      <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{label}</div>
      {sub && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof UsersIcon; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '18px 20px', cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <Icon size={15} style={{ color: 'var(--text-muted)' }} />
        <h3 style={{ fontSize: '13.5px', fontWeight: 700, margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof UsersIcon }) {
  return (
    <div>
      <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {Icon && <Icon size={15} style={{ color: 'var(--text-muted)' }} />} {value}
      </div>
      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function SubChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 12px', borderRadius: '8px', background: color + '12', border: `1px solid ${color}30` }}>
      <span style={{ fontSize: '15px', fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Megaphone, Activity, Database, Plus, Trash2, Check,
  CircleCheck, CircleX, Clock, ShieldCheck, Mail,
} from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api';
import { PLANS, getPlan, type PlanId } from '../../plans';

interface Health {
  db: { ok: boolean; latencyMs: number };
  config: { stripe: boolean; smtp: boolean; smtpConfigured: boolean; smtpError: string | null; supabaseRealtime: boolean; frontendUrl: string | null };
  fx: { cached: boolean; ageMinutes: number | null; base: string | null };
  uptimeSeconds: number;
  audit: { total: number; recent: { id: string; action: string; targetType: string | null; targetId: string | null; adminEmail: string | null; createdAt: string }[] };
}

interface AnnouncementRow {
  id: string;
  message: string;
  type: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

const PLAN_ORDER: PlanId[] = ['free', 'advanced', 'ultra', 'premium', 'enterprise'];
const cap = (n: number) => (n === Infinity ? '∞' : n.toLocaleString());
const fmtUptime = (s: number) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function AdminSystem() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [anns, setAnns] = useState<AnnouncementRow[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // New-announcement form
  const [newMsg, setNewMsg] = useState('');
  const [newType, setNewType] = useState<'info' | 'warning' | 'success'>('info');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState(false);

  const loadAnns = useCallback(() => {
    setAnnLoading(true);
    apiGet<{ items: AnnouncementRow[] }>('/api/admin/announcements')
      .then(d => setAnns(d.items))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load announcements'))
      .finally(() => setAnnLoading(false));
  }, []);

  useEffect(() => {
    setHealthLoading(true);
    apiGet<Health>('/api/admin/health')
      .then(setHealth)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load health'))
      .finally(() => setHealthLoading(false));
  }, [reloadKey]);

  useEffect(() => { loadAnns(); }, [loadAnns, reloadKey]);

  const createAnn = async () => {
    if (!newMsg.trim()) return;
    setCreating(true);
    try {
      await apiPost('/api/admin/announcements', { message: newMsg.trim(), type: newType, active: true });
      setNewMsg('');
      setReloadKey(k => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (a: AnnouncementRow) => {
    setBusyId(a.id);
    try {
      await apiPatch(`/api/admin/announcements/${a.id}`, { active: !a.active });
      setAnns(prev => prev.map(x => (x.id === a.id ? { ...x, active: !x.active } : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setBusyId(null);
    }
  };

  const runLowStock = async () => {
    setRunningJob(true);
    try {
      const r = await apiPost<{ teamsScanned: number; teamsWithLowStock: number; emailsSent: number }>('/api/admin/jobs/low-stock-alerts');
      alert(`Low-stock alert job complete.\n\nTeams scanned: ${r.teamsScanned}\nTeams with low stock: ${r.teamsWithLowStock}\nEmails sent: ${r.emailsSent}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Job failed');
    } finally {
      setRunningJob(false);
    }
  };

  const removeAnn = async (a: AnnouncementRow) => {
    if (!confirm('Delete this announcement?')) return;
    setBusyId(a.id);
    try {
      await apiDelete(`/api/admin/announcements/${a.id}`);
      setAnns(prev => prev.filter(x => x.id !== a.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>{error}</div>
      )}

      {/* System health */}
      <Section title="System health" icon={Activity}>
        {healthLoading || !health ? (
          <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={15} className="spin" /> Loading…
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              <HealthChip ok={health.db.ok} label={`Database ${health.db.ok ? `· ${health.db.latencyMs}ms` : 'down'}`} icon={Database} />
              <HealthChip ok={health.config.stripe} label="Stripe" />
              <HealthChip
                ok={health.config.smtp}
                neutral={!health.config.smtpConfigured}
                label={health.config.smtp ? 'Email (SMTP)' : health.config.smtpConfigured ? 'Email (SMTP) — failing' : 'Email (SMTP) — not set'}
                title={health.config.smtpError ?? undefined}
              />
              <HealthChip ok={health.config.supabaseRealtime} label="Realtime" />
              <HealthChip
                ok={health.fx.cached}
                label={health.fx.cached ? `FX cache · ${health.fx.ageMinutes}m old` : 'FX not cached'}
                neutral={!health.fx.cached}
              />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'var(--surface-raised)', border: '1px solid var(--border-color)', fontSize: '12.5px' }}>
                <Clock size={13} style={{ color: 'var(--text-muted)' }} /> Uptime {fmtUptime(health.uptimeSeconds)}
              </span>
            </div>

            {/* Recent admin audit */}
            <h4 style={{ fontSize: '12.5px', fontWeight: 700, margin: '4px 0 8px', color: 'var(--text-muted)' }}>
              Recent operator actions ({health.audit.total} total)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {health.audit.recent.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={12} style={{ flexShrink: 0, color: '#294EA7' }} />
                  <code style={{ fontSize: '11.5px' }}>{a.action}</code>
                  {a.adminEmail && <span>· {a.adminEmail}</span>}
                  <span style={{ marginLeft: 'auto' }}>{new Date(a.createdAt).toLocaleString()}</span>
                </div>
              ))}
              {health.audit.recent.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No actions yet.</p>}
            </div>
          </>
        )}
      </Section>

      {/* Jobs */}
      <Section title="Jobs" icon={Mail}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600 }}>Low-stock alert emails</div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Emails owners/admins of teams (that have alerts enabled) a digest of items at or below their minimum level. Schedule it with a cron hitting <code>/api/admin/jobs/low-stock-alerts</code>, or run it manually here.
            </p>
          </div>
          <button className="btn-primary" onClick={runLowStock} disabled={runningJob} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
            {runningJob ? <Loader2 size={14} className="spin" /> : <Mail size={14} />}
            {runningJob ? 'Running…' : 'Run now'}
          </button>
        </div>
      </Section>

      {/* Announcements */}
      <Section title="Announcements" icon={Megaphone}>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '-6px', marginBottom: '12px' }}>
          Active announcements show as a banner to every signed-in user.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <input
            className="input" value={newMsg} onChange={e => setNewMsg(e.target.value)}
            placeholder="Announcement message…" maxLength={500}
            onKeyDown={e => { if (e.key === 'Enter' && !creating) void createAnn(); }}
            style={{ flex: 1, minWidth: '240px' }}
          />
          <select className="input" value={newType} onChange={e => setNewType(e.target.value as 'info' | 'warning' | 'success')} style={{ maxWidth: '140px' }}>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
          </select>
          <button className="btn-primary" onClick={createAnn} disabled={creating || !newMsg.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> {creating ? 'Adding…' : 'Add'}
          </button>
        </div>

        {annLoading ? (
          <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}><Loader2 size={15} className="spin" /> Loading…</p>
        ) : anns.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No announcements.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {anns.map(a => {
              const busy = busyId === a.id;
              const color = a.type === 'warning' ? '#d97706' : a.type === 'success' ? '#059669' : '#294EA7';
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-raised)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 500 }}>{a.message}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {a.type} · {a.active ? 'active' : 'inactive'} · {new Date(a.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(a)} disabled={busy} title={a.active ? 'Deactivate' : 'Activate'}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 11px', borderRadius: '7px',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${a.active ? '#059669' : 'var(--border-color)'}`,
                      background: a.active ? '#05966914' : 'transparent',
                      color: a.active ? '#059669' : 'var(--text-muted)',
                    }}
                  >
                    <Check size={12} /> {a.active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => removeAnn(a)} disabled={busy} title="Delete" style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Plan reference (read-only) */}
      <Section title="Plan configuration" icon={ShieldCheck}>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '-6px', marginBottom: '12px' }}>
          Current plan tiers and limits. These live in code (<code>plans.ts</code>) and are enforced server-side — editing them is a deploy, not a runtime change.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                <th style={{ padding: '6px 10px' }}>Plan</th>
                <th style={{ padding: '6px 10px' }}>Items</th>
                <th style={{ padding: '6px 10px' }}>Users</th>
                <th style={{ padding: '6px 10px' }}>Custom fields</th>
                <th style={{ padding: '6px 10px' }}>£/mo</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_ORDER.map(id => {
                const p = PLANS[id];
                return (
                  <tr key={id} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: getPlan(id).color }}>{p.name}</td>
                    <td style={{ padding: '8px 10px' }}>{cap(p.maxItems)}</td>
                    <td style={{ padding: '8px 10px' }}>{cap(p.maxUsers)}</td>
                    <td style={{ padding: '8px 10px' }}>{cap(p.customFields)}</td>
                    <td style={{ padding: '8px 10px' }}>{p.monthlyPrice === null ? 'custom' : `£${p.monthlyPrice}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Activity; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '18px 20px', cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <Icon size={15} style={{ color: 'var(--text-muted)' }} />
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function HealthChip({ ok, label, icon: Icon, neutral, title }: { ok: boolean; label: string; icon?: typeof Database; neutral?: boolean; title?: string }) {
  const color = neutral ? '#64748b' : ok ? '#059669' : '#dc2626';
  const StatusIcon = neutral ? Clock : ok ? CircleCheck : CircleX;
  return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: color + '12', border: `1px solid ${color}30`, fontSize: '12.5px', fontWeight: 600, color, cursor: title ? 'help' : 'default' }}>
      {Icon ? <Icon size={13} /> : <StatusIcon size={13} />} {label}
    </span>
  );
}

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, AlertTriangle, ExternalLink, CreditCard, RefreshCw, Pencil, X,
} from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';
import { getPlan, type PlanId } from '../../plans';

interface BillingRow {
  teamId: string;
  teamName: string;
  billingPlan: string;
  teamsPlan: string;
  drift: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string | null;
}

interface BillingResponse {
  items: BillingRow[];
  summary: { total: number; drift: number; byStatus: Record<string, number> };
}

const PLAN_OPTIONS: PlanId[] = ['free', 'advanced', 'ultra', 'premium', 'enterprise'];

const statusColors: Record<string, string> = {
  active: '#059669',
  trialing: '#294EA7',
  past_due: '#dc2626',
  cancelled: '#64748b',
  none: '#94a3b8',
};

function PlanBadge({ plan }: { plan: string }) {
  const p = getPlan(plan);
  return (
    <span style={{
      background: p.color + '18', color: p.color,
      fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
      border: `1px solid ${p.color}33`,
    }}>
      {p.name}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const key = status ?? 'none';
  const color = statusColors[key] ?? '#94a3b8';
  return (
    <span style={{
      background: color + '18', color, fontSize: '11px', fontWeight: 700,
      padding: '2px 9px', borderRadius: '20px', border: `1px solid ${color}33`,
    }}>
      {key === 'none' ? 'no sub' : key}
    </span>
  );
}

export default function AdminBilling() {
  const [items, setItems] = useState<BillingRow[]>([]);
  const [summary, setSummary] = useState<BillingResponse['summary'] | null>(null);
  const [driftOnly, setDriftOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<BillingRow | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (driftOnly) params.set('drift', '1');
    if (statusFilter !== 'all') params.set('status', statusFilter);
    return params.toString();
  }, [driftOnly, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGet<BillingResponse>(`/api/admin/billing?${buildQuery()}`)
      .then(data => {
        if (cancelled) return;
        setItems(data.items);
        setSummary(data.summary);
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load billing'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [buildQuery, reloadKey]);

  const reconcile = async (row: BillingRow) => {
    if (!confirm(
      `Reconcile "${row.teamName}" to the web plan "${getPlan(row.billingPlan).name}"?\n\n` +
      `This sets the mobile value (teams.plan = ${row.teamsPlan}) to match the web/Stripe value (${row.billingPlan}).`,
    )) return;
    setBusyId(row.teamId);
    try {
      await apiPost(`/api/admin/teams/${row.teamId}/reconcile`, { source: 'billing' });
      setReloadKey(k => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Reconcile failed');
    } finally {
      setBusyId(null);
    }
  };

  const stripeUrl = (customerId: string) => `https://dashboard.stripe.com/customers/${customerId}`;

  return (
    <>
      {/* Summary */}
      {summary && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <SummaryChip label="Teams" value={summary.total} />
          <SummaryChip label="Plan drift" value={summary.drift} danger={summary.drift > 0} />
          {Object.entries(summary.byStatus).map(([k, v]) => (
            <SummaryChip key={k} label={k === 'none' ? 'no sub' : k} value={v} />
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={driftOnly} onChange={e => setDriftOnly(e.target.checked)} />
          Drift only
        </label>
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: '180px' }}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past due</option>
          <option value="cancelled">Cancelled</option>
          <option value="none">No subscription</option>
        </select>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={15} className="spin" /> Loading…
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map(row => {
            const busy = busyId === row.teamId;
            return (
              <div key={row.teamId} className="card" style={{ padding: '16px 20px', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{row.teamName}</span>
                      <PlanBadge plan={row.billingPlan} />
                      <StatusBadge status={row.status} />
                      {row.cancelAtPeriodEnd && (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706' }}>cancels at period end</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      {row.trialEndsAt && <>Trial ends {new Date(row.trialEndsAt).toLocaleDateString()}<span style={{ margin: '0 7px' }}>·</span></>}
                      {row.currentPeriodEnd && <>Renews {new Date(row.currentPeriodEnd).toLocaleDateString()}<span style={{ margin: '0 7px' }}>·</span></>}
                      {row.stripeCustomerId
                        ? <a href={stripeUrl(row.stripeCustomerId)} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Stripe <ExternalLink size={11} />
                          </a>
                        : <span>no Stripe customer</span>}
                    </div>
                    {row.drift && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px',
                        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px',
                        padding: '5px 10px', fontSize: '12px', color: '#b91c1c', fontWeight: 600,
                      }}>
                        <AlertTriangle size={13} />
                        Plan drift — web: <b>{getPlan(row.billingPlan).name}</b> · app: <b>{getPlan(row.teamsPlan).name}</b>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {row.drift && (
                      <button className="btn-outline" disabled={busy} onClick={() => reconcile(row)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '7px 12px', borderColor: '#dc2626', color: '#dc2626' }}>
                        <RefreshCw size={13} /> Reconcile
                      </button>
                    )}
                    <button className="btn-outline" disabled={busy} onClick={() => setEditing(row)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '7px 12px' }}>
                      <Pencil size={13} /> Change plan
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <CreditCard size={36} strokeWidth={1.4} />
              <p style={{ fontSize: '14px' }}>No teams match this filter.</p>
            </div>
          )}
        </div>
      )}

      {editing && (
        <ChangePlanModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setReloadKey(k => k + 1); }}
        />
      )}
    </>
  );
}

function SummaryChip({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', padding: '8px 14px', borderRadius: '10px',
      background: danger ? '#fef2f2' : 'var(--surface-raised)',
      border: `1px solid ${danger ? '#fecaca' : 'var(--border-color)'}`,
      minWidth: '84px',
    }}>
      <span style={{ fontSize: '18px', fontWeight: 700, color: danger ? '#b91c1c' : 'inherit' }}>{value}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{label}</span>
    </div>
  );
}

function ChangePlanModal({ row, onClose, onSaved }: { row: BillingRow; onClose: () => void; onSaved: () => void }) {
  const [planId, setPlanId] = useState<PlanId>((PLAN_OPTIONS.includes(row.billingPlan as PlanId) ? row.billingPlan : 'free') as PlanId);
  const [trialDays, setTrialDays] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const body: { planId: string; trialDays?: number } = { planId };
      const td = parseInt(trialDays, 10);
      if (trialDays.trim() && !Number.isNaN(td) && td > 0) body.trialDays = td;
      await apiPost(`/api/admin/teams/${row.teamId}/plan`, body);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to change plan');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <h2 style={{ margin: 0 }}>Change plan</h2>
          <button onClick={onClose} className="user-logout" title="Close" style={{ width: 30, height: 30 }}><X size={16} /></button>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Manually set the plan for <b>{row.teamName}</b>. Writes both the web and mobile sources together, so it won't create drift.
        </p>

        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Plan</label>
        <select className="input" value={planId} onChange={e => setPlanId(e.target.value as PlanId)} style={{ width: '100%', marginBottom: '14px' }}>
          {PLAN_OPTIONS.map(p => <option key={p} value={p}>{getPlan(p).name}</option>)}
        </select>

        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Trial days (optional)</label>
        <input
          className="input" value={trialDays} onChange={e => setTrialDays(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="e.g. 30 — leave blank for an active plan"
          style={{ width: '100%' }} inputMode="numeric"
        />

        {err && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', marginTop: '12px', fontSize: '13px', color: '#dc2626' }}>
            {err}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Apply plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Users as UsersIcon, Package, Crown, Shield, User, UserCheck,
  X, FolderClosed, ClipboardList, Clock,
} from 'lucide-react';
import { apiGet } from '../../lib/api';
import { useDebounce } from '../../lib/useDebounce';
import { getPlan } from '../../plans';

interface TeamRow {
  id: string;
  name: string;
  plan: string;
  memberCount: number;
  itemCount: number;
  ownerEmail: string | null;
  ownerName: string | null;
  createdAt: string | null;
  lastActiveAt: string | null;
}

interface TeamListResponse {
  items: TeamRow[];
  nextCursor: string | null;
}

interface TeamDetail {
  team: { id: string; name: string; createdAt: string | null };
  plan: string;
  billing: {
    planId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    trialEndsAt: string | null;
  } | null;
  counts: { members: number; items: number; folders: number; pickLists: number };
  members: { id: string; name: string | null; email: string | null; role: string; joinedAt: string | null }[];
  recentActivity: { id: string; action: string; entityName: string; userId: string | null; timestamp: string }[];
}

const roleMeta: Record<string, { color: string; icon: typeof Crown }> = {
  owner:  { color: '#f59e0b', icon: Crown },
  admin:  { color: '#8b5cf6', icon: Shield },
  member: { color: '#22c55e', icon: User },
  client: { color: '#0ea5e9', icon: UserCheck },
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

function RoleBadge({ role }: { role: string }) {
  const m = roleMeta[role] ?? roleMeta.member;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: m.color + '18', color: m.color,
      fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
      border: `1px solid ${m.color}33`,
    }}>
      <m.icon size={10} /> {role}
    </span>
  );
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminTeams() {
  const [items, setItems] = useState<TeamRow[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const buildQuery = useCallback((cursor?: string) => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (cursor) params.set('cursor', cursor);
    return params.toString();
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGet<TeamListResponse>(`/api/admin/teams?${buildQuery()}`)
      .then(data => {
        if (cancelled) return;
        setItems(data.items);
        setNextCursor(data.nextCursor);
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load teams'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [buildQuery]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await apiGet<TeamListResponse>(`/api/admin/teams?${buildQuery(nextCursor)}`);
      setItems(prev => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await apiGet<TeamDetail>(`/api/admin/teams/${id}`);
      setDetail(data);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to load team');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          className="input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search teams by name…"
          style={{ flex: 1, minWidth: '220px' }}
        />
      </div>

      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px',
          padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#dc2626',
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={15} className="spin" /> Loading…
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map(t => (
            <button
              key={t.id}
              onClick={() => openDetail(t.id)}
              className="card"
              style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px',
                textAlign: 'left', cursor: 'pointer', width: '100%', border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>{t.name}</span>
                  <PlanBadge plan={t.plan} />
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  {t.ownerEmail ?? <span style={{ fontStyle: 'italic' }}>no owner</span>}
                  <span style={{ margin: '0 7px' }}>·</span>
                  active {relativeTime(t.lastActiveAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '18px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <UsersIcon size={14} /> {t.memberCount}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Package size={14} /> {t.itemCount}
                </span>
              </div>
            </button>
          ))}

          {items.length === 0 && (
            <p style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>No teams found.</p>
          )}

          {nextCursor && (
            <button className="btn-outline" onClick={loadMore} disabled={loadingMore} style={{ alignSelf: 'center', marginTop: '6px' }}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}

      {(detail || detailLoading) && (
        <div className="modal-overlay" onClick={() => { setDetail(null); setDetailLoading(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px', maxHeight: '85vh', overflowY: 'auto' }}>
            {detailLoading ? (
              <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', padding: '20px' }}>
                <Loader2 size={15} className="spin" /> Loading…
              </p>
            ) : detail ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0 }}>{detail.team.name}</h2>
                    <PlanBadge plan={detail.plan} />
                  </div>
                  <button onClick={() => setDetail(null)} className="user-logout" title="Close" style={{ width: 30, height: 30 }}>
                    <X size={16} />
                  </button>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  Created {detail.team.createdAt ? new Date(detail.team.createdAt).toLocaleDateString() : '—'}
                  {detail.billing?.stripeCustomerId && <><span style={{ margin: '0 7px' }}>·</span>Stripe {detail.billing.stripeCustomerId}</>}
                  {detail.billing?.trialEndsAt && <><span style={{ margin: '0 7px' }}>·</span>Trial ends {new Date(detail.billing.trialEndsAt).toLocaleDateString()}</>}
                </p>

                {/* Usage counts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                  <CountCard icon={UsersIcon} label="Members" value={detail.counts.members} />
                  <CountCard icon={Package} label="Items" value={detail.counts.items} />
                  <CountCard icon={FolderClosed} label="Folders" value={detail.counts.folders} />
                  <CountCard icon={ClipboardList} label="Pick lists" value={detail.counts.pickLists} />
                </div>

                {/* Members */}
                <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Members</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                  {detail.members.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <span style={{ fontWeight: 600 }}>{m.name || m.email || 'Unknown'}</span>
                      <RoleBadge role={m.role} />
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{m.email}</span>
                    </div>
                  ))}
                  {detail.members.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No members.</p>
                  )}
                </div>

                {/* Recent activity */}
                <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Recent activity</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {detail.recentActivity.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      <Clock size={12} style={{ flexShrink: 0 }} />
                      <code style={{ fontSize: '11.5px' }}>{a.action}</code>
                      {a.entityName && <span>· {a.entityName}</span>}
                      <span style={{ marginLeft: 'auto' }}>{relativeTime(a.timestamp)}</span>
                    </div>
                  ))}
                  {detail.recentActivity.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No recent activity.</p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

function CountCard({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: number }) {
  return (
    <div style={{
      padding: '12px', borderRadius: '10px', background: 'var(--surface-raised)',
      border: '1px solid var(--border-color)', textAlign: 'center',
    }}>
      <Icon size={16} style={{ color: 'var(--text-muted)', marginBottom: '4px' }} />
      <div style={{ fontSize: '18px', fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
